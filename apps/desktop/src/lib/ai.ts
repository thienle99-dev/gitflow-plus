import { api, type FileChange, type Branch, type ConventionFile } from "@/api/tauri";
import type { MergeRequest, MergeRequestFileChange } from "@/api/gitHost";
import { scanForRisks, type RiskReport } from "./risk-scanner";
import { loadActiveProfile, type AIProviderProfile, type AIProviderType } from "./ai-profiles";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// Convention file cache (keyed by repoPath, TTL 5 min)
const conventionCache = new Map<string, { files: ConventionFile[]; ts: number }>();
const CONVENTION_TTL_MS = 5 * 60 * 1000;

// ─── AI Response Cache (same diff → cached result) ─────────────────────────
const aiResponseCache = new Map<string, { text: string; ts: number }>();
const AI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
const AI_CACHE_MAX = 50;

function cacheKey(prompt: string, model: string, profileId = ""): string {
  let h = 5381;
  const key = profileId + "\x00" + model + "\x00" + prompt;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) & 0xffffffff;
  }
  return h.toString(36);
}

function cacheGet(key: string): string | null {
  const entry = aiResponseCache.get(key);
  if (entry && Date.now() - entry.ts < AI_CACHE_TTL_MS) return entry.text;
  if (entry) aiResponseCache.delete(key);
  return null;
}

function cacheSet(key: string, text: string) {
  if (aiResponseCache.size >= AI_CACHE_MAX) {
    const oldest = aiResponseCache.keys().next().value;
    if (oldest !== undefined) aiResponseCache.delete(oldest);
  }
  aiResponseCache.set(key, { text, ts: Date.now() });
}

/** Clear the response cache (e.g. when user changes AI settings). */
export function clearAICache() {
  aiResponseCache.clear();
}

// ─── Rate Limiter (sliding window) ──────────────────────────────────────────
const rateTimestamps: number[] = [];
const RATE_WINDOW_MS = 60_000; // 1 min
const RATE_MAX = 10; // max requests per window

async function waitForRateSlot(): Promise<void> {
  const now = Date.now();
  while (rateTimestamps.length > 0 && rateTimestamps[0] < now - RATE_WINDOW_MS) {
    rateTimestamps.shift();
  }
  if (rateTimestamps.length >= RATE_MAX) {
    const waitMs = rateTimestamps[0] + RATE_WINDOW_MS - now + 100;
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  }
  rateTimestamps.push(Date.now());
}

interface AISettings {
  profileId?: string;
  provider: AIProviderType;
  apiKey: string;
  model: string;
  reviewModel: string;
  customUrl: string;
  tokenLimit: number;
  detailLevel: CommitMessageDetailLevel;
  commitStyle: CommitMessageStyle;
  customRules: string;
  reviewLanguage: AIReviewLanguage;
}

interface GeneratedCommitMessage {
  message: string;
  fallback: boolean;
  reason?: string;
}

export interface InlineReviewComment {
  line: number;
  side: "old" | "new";
  category: string;
  message: string;
  severity: "info" | "warning" | "error";
}

type CommitMessageStyle = "conventional" | "plain" | "gitmoji" | "jira";
type CommitMessageDetailLevel = "ultra-minimal" | "minimal" | "medium" | "detailed" | "comprehensive";
export type AIReviewMode =
  | "all"
  | "custom"
  | "bugs"
  | "security"
  | "performance"
  | "style"
  | "linter"
  | "best-practices"
  | "tests"
  | "accessibility"
  | "ux";

export const AI_REVIEW_CHECKLIST_OPTIONS: { id: Exclude<AIReviewMode, "all" | "custom">; label: string; tag: string; description: string }[] = [
  { id: "bugs", label: "Bugs", tag: "BUG", description: "Correctness, logic errors, regressions, data loss" },
  { id: "security", label: "Security", tag: "SECURITY", description: "Secrets, auth, injection, unsafe data handling" },
  { id: "performance", label: "Performance", tag: "PERF", description: "Slow paths, unnecessary work, rendering or query cost" },
  { id: "style", label: "Style", tag: "STYLE", description: "Readability, naming, structure, maintainability" },
  { id: "linter", label: "Linter", tag: "LINTER", description: "Formatting, conventions, likely lint/type issues" },
  { id: "best-practices", label: "Best Practices", tag: "BEST-PRACTICE", description: "Framework, API, and architecture best practices" },
  { id: "tests", label: "Tests", tag: "TEST", description: "Missing tests, weak coverage, edge cases to verify" },
  { id: "accessibility", label: "Accessibility", tag: "A11Y", description: "Keyboard, semantics, screen reader and contrast issues" },
  { id: "ux", label: "UX", tag: "UX", description: "User-facing flows, states, copy, and interaction risks" },
];

export const AI_REVIEW_MODE_OPTIONS: { id: AIReviewMode; label: string }[] = [
  { id: "all", label: "Review all" },
  { id: "custom", label: "Custom checklist" },
  ...AI_REVIEW_CHECKLIST_OPTIONS.map((option) => ({ id: option.id, label: option.label })),
];

export const DEFAULT_AI_REVIEW_CHECKLIST: Exclude<AIReviewMode, "all" | "custom">[] = [
  "bugs",
  "security",
  "performance",
  "style",
  "linter",
  "best-practices",
  "tests",
];

const LS_KEY_AI_REVIEW_CHECKLIST = "gitflowAiReviewChecklist";
const LS_KEY_AI_LAST_REVIEW_MODE = "gitflowLastReviewMode";
type AIReviewLanguage =
  | "auto"
  | "english"
  | "vietnamese"
  | "japanese"
  | "korean"
  | "chinese"
  | "spanish"
  | "french"
  | "german";

export interface CommitGroup {
  files: string[];
  message: string;
  reason: string;
}

export interface CommitScopeSuggestion {
  shouldSplit: boolean;
  overallMessage: string;
  groups: CommitGroup[];
  explanation: string;
}

export async function generateCommitMessageWithAI(
  repoPath: string,
  files: FileChange[],
): Promise<GeneratedCommitMessage> {
  const settings = readAISettings();
  const branchName = await getCurrentBranchName(repoPath);
  const fallback = generateLocalCommitMessage(files, branchName);

  if (!hasProvider(settings)) {
    return {
      message: fallback,
      fallback: true,
      reason: "Configure API key in settings for real AI",
    };
  }

  const diff = await api.diff.staged(repoPath);
  if (!diff.trim()) {
    return {
      message: fallback,
      fallback: true,
      reason: "Diff is empty",
    };
  }

  const conventionContext = await getConventionContext(repoPath);
  const prompt = buildCommitPrompt(diff, settings, branchName, conventionContext);
  const message = cleanAIText(await requestAIText(prompt, settings));
  if (!message) {
    throw new Error("Empty response from AI");
  }

  return { message, fallback: false };
}

export async function reviewDiffWithAI(filePath: string, diff: string, repoPath?: string, mode: AIReviewMode = "all") {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key or local model in settings");
  }

  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);
  const customRulesInstruction = buildCustomRulesInstruction(settings.customRules);
  const conventionInstruction = repoPath ? await getConventionContext(repoPath) : "";
  const reviewFocusInstruction = buildReviewFocusInstruction(mode);
  const prompt = `You are a world-class senior software architect. Analyze the git diff below for the file "${filePath}" and provide two structured sections:
1. CODE EXPLANATION: A clear, high-level summary of WHAT was changed and WHY.
2. CODE REVIEW & SUGGESTIONS: Inspect the code changes using the selected review mode. If everything looks good, say that clearly.

Be professional, direct, constructive, and use markdown styling.
${reviewFocusInstruction}
${languageInstruction}${customRulesInstruction}${conventionInstruction}

Diff:
${diff.slice(0, 8000)}`;

  const review = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
  if (!review) {
    throw new Error("Empty response from AI reviewer");
  }
  return review;
}

/**
 * Generate structured inline review comments for specific lines in a diff.
 * Returns an array of comments with line numbers, sides, categories, and messages.
 */
export async function generateInlineReviewComments(
  filePath: string,
  diff: string,
  repoPath?: string,
  mode: AIReviewMode = "all",
): Promise<InlineReviewComment[]> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key or local model in settings");
  }

  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);
  const customRulesInstruction = buildCustomRulesInstruction(settings.customRules);
  const conventionInstruction = repoPath ? await getConventionContext(repoPath) : "";
  const reviewFocusInstruction = buildReviewFocusInstruction(mode);

  const prompt = `You are a world-class senior software architect. Analyze the git diff below for the file "${filePath}" and generate inline review comments.

${reviewFocusInstruction}
${languageInstruction}${customRulesInstruction}${conventionInstruction}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Each item in the array must have these exact fields:
- "line": the diff line number (old line number for side "old", new line number for side "new")
- "side": either "old" (for deleted/removed lines) or "new" (for added/new lines)
- "category": one of "BUG", "SECURITY", "PERF", "STYLE", "BEST-PRACTICE", "LINTER", "TEST", "A11Y", "UX"
- "severity": one of "info", "warning", "error"
- "message": a concise, actionable review comment (1-2 sentences max)

Only comment on lines that have actual findings. If the diff looks clean, return an empty array [].
Do NOT comment on unchanged/context lines. Only comment on added (+) or deleted (-) lines.

Example output:
[{"line":42,"side":"new","category":"BUG","severity":"error","message":"Potential null pointer: user may be undefined here."},{"line":15,"side":"old","category":"STYLE","severity":"info","message":"This variable was unused and its removal is correct."}]

Diff:
${diff.slice(0, 8000)}`;

  const raw = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
  if (!raw) {
    throw new Error("Empty response from AI reviewer");
  }

  // Parse JSON from response - handle potential markdown code fences
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }
  // Also try to extract array if wrapped in other text
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item: any) =>
        typeof item.line === "number" &&
        (item.side === "old" || item.side === "new") &&
        typeof item.category === "string" &&
        typeof item.message === "string",
      )
      .map((item: any) => ({
        line: item.line,
        side: item.side as "old" | "new",
        category: item.category.toUpperCase(),
        severity: (["info", "warning", "error"].includes(item.severity) ? item.severity : "info") as "info" | "warning" | "error",
        message: String(item.message),
      }));
  } catch {
    return [];
  }
}

export function readAIReviewChecklist(): Exclude<AIReviewMode, "all" | "custom">[] {
  const saved = localStorage.getItem(LS_KEY_AI_REVIEW_CHECKLIST);
  if (!saved) return DEFAULT_AI_REVIEW_CHECKLIST;
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return DEFAULT_AI_REVIEW_CHECKLIST;
    const valid = new Set(AI_REVIEW_CHECKLIST_OPTIONS.map((option) => option.id));
    const filtered = parsed.filter((value): value is Exclude<AIReviewMode, "all" | "custom"> => valid.has(value));
    return filtered.length > 0 ? filtered : DEFAULT_AI_REVIEW_CHECKLIST;
  } catch {
    return DEFAULT_AI_REVIEW_CHECKLIST;
  }
}

export function readLastAIReviewMode(): AIReviewMode {
  const saved = localStorage.getItem(LS_KEY_AI_LAST_REVIEW_MODE);
  return AI_REVIEW_MODE_OPTIONS.some((option) => option.id === saved) ? saved as AIReviewMode : "all";
}

export function saveLastAIReviewMode(mode: AIReviewMode) {
  localStorage.setItem(LS_KEY_AI_LAST_REVIEW_MODE, mode);
}

function selectedReviewOptions(mode: AIReviewMode) {
  if (mode === "all") return AI_REVIEW_CHECKLIST_OPTIONS;
  if (mode === "custom") {
    const selected = new Set(readAIReviewChecklist());
    return AI_REVIEW_CHECKLIST_OPTIONS.filter((option) => selected.has(option.id));
  }
  return AI_REVIEW_CHECKLIST_OPTIONS.filter((option) => option.id === mode);
}

function buildReviewFocusInstruction(mode: AIReviewMode) {
  const options = selectedReviewOptions(mode);
  const labels = options.map((option) => `- [${option.tag}] ${option.description}`).join("\n");
  const modeLabel = AI_REVIEW_MODE_OPTIONS.find((option) => option.id === mode)?.label || "Review";

  return `REVIEW MODE: ${modeLabel}
Focus only on these categories:
${labels}

When listing findings, start each finding with exactly one matching tag from the list above, e.g. [BUG] \`path/to/file.ts\`: finding text.
If the selected categories have no concrete findings, say so clearly and list any residual checks to run.`;
}

export interface ConflictExplanation {
  /** Why this conflict occurred */
  whyConflict: string;
  /** What "ours" (current branch) changed */
  oursChanged: string;
  /** What "theirs" (incoming branch) changed */
  theirsChanged: string;
  /** AI recommendation on resolution */
  recommendation: string;
}

/**
 * Explain a merge conflict block — why it happened, what each side changed, and recommendation.
 */
export async function explainConflictWithAI(
  filePath: string,
  ours: string[],
  theirs: string[],
  contextBefore: string[],
  contextAfter: string[],
  repoPath?: string,
): Promise<ConflictExplanation> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key or local model in settings");
  }

  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);
  const conventionInstruction = repoPath ? await getConventionContext(repoPath) : "";

  const oursCode = ours.length > 0 ? ours.join("\n") : "(no changes — this side deleted the lines)";
  const theirsCode = theirs.length > 0 ? theirs.join("\n") : "(no changes — this side deleted the lines)";
  const ctxBefore = contextBefore.length > 0 ? contextBefore.slice(-8).join("\n") : "";
  const ctxAfter = contextAfter.length > 0 ? contextAfter.slice(0, 8).join("\n") : "";

  const prompt = `You are a senior software engineer explaining a Git merge conflict to a developer.

FILE: "${filePath}"

${ctxBefore ? `--- Surrounding context (before conflict):\n${ctxBefore}\n` : ""}
--- OURS (current branch):
${oursCode}

--- THEIRS (incoming branch):
${theirsCode}
${ctxAfter ? `\n--- Surrounding context (after conflict):\n${ctxAfter}` : ""}

TASK: Explain this conflict block. Return a JSON object with these exact fields:
- "whyConflict": 2-3 sentences explaining WHY this conflict happened. What did each branch change differently in the same area? Be specific about the code.
- "oursChanged": 1-2 sentences explaining what the current branch (ours) did in this code region. Be specific.
- "theirsChanged": 1-2 sentences explaining what the incoming branch (theirs) did in this code region. Be specific.
- "recommendation": 1-2 sentences recommending how to resolve this conflict — accept ours, accept theirs, combine both, or a custom merge approach. Explain WHY.

Be concise and technical. Reference actual code identifiers from the conflict.
Return ONLY the JSON object. No markdown code fences, no wrapping, no explanation.
${languageInstruction}${conventionInstruction}`;

  const raw = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
  if (!raw) throw new Error("Empty response from AI");

  // Parse JSON — handle markdown fences and fallback
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      whyConflict: String(parsed.whyConflict || "Unable to determine cause."),
      oursChanged: String(parsed.oursChanged || "No description available."),
      theirsChanged: String(parsed.theirsChanged || "No description available."),
      recommendation: String(parsed.recommendation || "Review both sides and choose manually."),
    };
  } catch {
    // Fallback: return raw text as the explanation
    return {
      whyConflict: raw.slice(0, 500),
      oursChanged: "",
      theirsChanged: "",
      recommendation: "",
    };
  }
}

export async function explainCommitWithAI(
  repoPath: string,
  commitHash: string,
  commitMessage: string,
): Promise<string> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key in settings to use AI features");
  }

  // Fetch full commit diff (no filePath = entire commit)
  const diff = await api.diff.commit(repoPath, commitHash);
  if (!diff.trim()) {
    return "This commit has no file changes to explain (e.g., an empty merge commit).";
  }

  const truncatedDiff = diff.slice(0, 12_000);
  const branchName = await getCurrentBranchName(repoPath);
  const branchContext = branchName ? `Branch: ${branchName}\n` : "";
  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);

  const customRulesInstruction = buildCustomRulesInstruction(settings.customRules);
  const conventionInstruction = await getConventionContext(repoPath);
  const prompt = `You are a senior software engineer reviewing a Git commit. Explain this commit for code review.

${branchContext}Commit message: ${commitMessage}

Diff:
${truncatedDiff}

INSTRUCTIONS:
1. Start with a 1-2 sentence summary of WHAT this commit does.
2. Explain the MOTIVATION — why this change was likely needed.
3. List the KEY CHANGES as bullet points (max 5-6).
4. If there are potential RISKS or BREAKING CHANGES, mention them briefly.
5. Be concise and direct. No markdown code blocks.
${languageInstruction}${customRulesInstruction}${conventionInstruction}`;

  const explanation = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
  if (!explanation) {
    throw new Error("Empty response from AI");
  }
  return explanation;
}

export async function reviewCommitWithAI(
  repoPath: string,
  commitHash: string,
  commitMessage: string,
  mode: AIReviewMode = "all",
): Promise<string> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key in settings to use AI features");
  }

  const diff = await api.diff.commit(repoPath, commitHash);
  if (!diff.trim()) {
    return "This commit has no file changes to review (e.g., an empty merge commit).";
  }

  const truncatedDiff = diff.slice(0, 12_000);
  const branchName = await getCurrentBranchName(repoPath);
  const branchContext = branchName ? `Branch: ${branchName}\n` : "";
  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);

  const customRulesInstruction = buildCustomRulesInstruction(settings.customRules);
  const conventionInstruction = await getConventionContext(repoPath);
  const reviewFocusInstruction = buildReviewFocusInstruction(mode);
  const prompt = `You are a world-class senior software architect performing a thorough code review. Analyze the git diff below for this commit.

${branchContext}Commit: ${commitMessage}

INSTRUCTIONS:
1. RISK ASSESSMENT: Rate the overall risk level (Low / Medium / High) with a one-line justification.
2. FINDINGS: List specific code review findings. Each finding MUST reference the file path wrapped in backticks, e.g. \`src/auth/login.ts\`. Always use the exact file path from the diff header.
3. If the code looks solid with no issues, say so clearly — do not invent problems.
4. Be professional, direct, constructive. Use markdown styling.
${reviewFocusInstruction}
${languageInstruction}${customRulesInstruction}${conventionInstruction}

Diff:
${truncatedDiff}`;

  const review = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
  if (!review) {
    throw new Error("Empty response from AI reviewer");
  }
  return review;
}

export async function explainMergeRequestWithAI(
  mergeRequest: MergeRequest,
  files: MergeRequestFileChange[],
  repoPath?: string,
): Promise<string> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key in settings to use AI features");
  }

  const fileSummary = files.map((file) => {
    const oldPath = file.oldPath ? ` (from ${file.oldPath})` : "";
    const stats = file.additions !== undefined || file.deletions !== undefined
      ? ` +${file.additions ?? 0}/-${file.deletions ?? 0}`
      : "";
    return `- [${file.status}] ${file.path}${oldPath}${stats}`;
  }).join("\n");

  const diffSnippets = files
    .filter((file) => file.patch?.trim())
    .slice(0, 12)
    .map((file) => `### ${file.path}\n${file.patch!.slice(0, 1800)}`)
    .join("\n\n");
  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);

  const customRulesInstruction = buildCustomRulesInstruction(settings.customRules);
  const conventionInstruction = repoPath ? await getConventionContext(repoPath) : "";
  const prompt = `You are a senior engineer reviewing a merge request. Explain the change and call out review-relevant details.

Title: ${mergeRequest.title}
Author: ${mergeRequest.author}
State: ${mergeRequest.state}
Branches: ${mergeRequest.sourceBranch} -> ${mergeRequest.targetBranch}

Description:
${mergeRequest.description || "(No description)"}

Changed files:
${fileSummary || "(No file changes returned)"}

Diff snippets:
${diffSnippets || "(No patch snippets returned)"}

INSTRUCTIONS:
1. Start with a concise 1-2 sentence summary of what this MR changes.
2. List key file-level changes as bullets.
3. Mention risk areas, testing focus, or possible regressions.
4. Keep it useful for code review. No code blocks.
${languageInstruction}${customRulesInstruction}${conventionInstruction}`;

  const explanation = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
  if (!explanation) {
    throw new Error("Empty response from AI");
  }
  return explanation;
}

export async function reviewMergeRequestWithAI(
  mergeRequest: MergeRequest,
  files: MergeRequestFileChange[],
  repoPath?: string,
  mode: AIReviewMode = "all",
): Promise<string> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key in settings to use AI features");
  }

  const fileSummary = files.map((file) => {
    const oldPath = file.oldPath ? ` (from ${file.oldPath})` : "";
    const stats = file.additions !== undefined || file.deletions !== undefined
      ? ` +${file.additions ?? 0}/-${file.deletions ?? 0}`
      : "";
    return `- [${file.status}] ${file.path}${oldPath}${stats}`;
  }).join("\n");

  const diffSnippets = files
    .filter((file) => file.patch?.trim())
    .slice(0, 16)
    .map((file) => `### ${file.path}\n${file.patch!.slice(0, 2200)}`)
    .join("\n\n");
  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);

  const customRulesInstruction = buildCustomRulesInstruction(settings.customRules);
  const conventionInstruction = repoPath ? await getConventionContext(repoPath) : "";
  const reviewFocusInstruction = buildReviewFocusInstruction(mode);
  const prompt = `You are a rigorous senior engineer performing a merge request review.

Title: ${mergeRequest.title}
Author: ${mergeRequest.author}
State: ${mergeRequest.state}
Branches: ${mergeRequest.sourceBranch} -> ${mergeRequest.targetBranch}

Description:
${mergeRequest.description || "(No description)"}

Changed files:
${fileSummary || "(No file changes returned)"}

Diff snippets:
${diffSnippets || "(No patch snippets returned)"}

INSTRUCTIONS:
1. Review using the selected review mode.
2. Lead with review findings. For each finding include severity, file path, and why it matters.
3. FORMAT: Each finding bullet MUST reference the file path wrapped in backticks, e.g. \`src/auth/login.ts\`. Always use the exact file path from the diff header.
4. If no concrete issues are found, say "No blocking issues found" and list residual risks or tests to run.
5. End with a short recommendation: Approve, Approve with comments, or Request changes.
6. Be concise and practical. Use markdown bullets, no code blocks.
${reviewFocusInstruction}
${languageInstruction}${customRulesInstruction}${conventionInstruction}`;

  const review = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
  if (!review) {
    throw new Error("Empty response from AI reviewer");
  }
  return review;
}

export function shouldAnalyzeScope(files: FileChange[]): boolean {
  if (files.length < 5) return false;
  const dirs = new Set(files.map((f) => f.path.split("/")[0]));
  return dirs.size >= 2;
}

export async function analyzeCommitScope(
  repoPath: string,
  files: FileChange[],
): Promise<CommitScopeSuggestion | null> {
  const settings = readAISettings();
  if (!hasProvider(settings)) return null;
  if (!shouldAnalyzeScope(files)) return null;

  const diff = await api.diff.staged(repoPath);
  if (!diff.trim()) return null;

  const branchName = await getCurrentBranchName(repoPath);
  const branchContext = branchName ? `Branch: ${branchName}\n` : "";
  const customRulesInstruction = buildCustomRulesInstruction(settings.customRules);
  const conventionInstruction = await getConventionContext(repoPath);

  const prompt = `You are an expert developer reviewing staged git changes. Analyze the diff and determine if the changes should be split into multiple atomic commits.

Return a JSON object with this exact structure:
{
  "shouldSplit": boolean,
  "overallMessage": "single commit message if not splitting",
  "groups": [
    {
      "files": ["path/to/file1"],
      "message": "conventional commit message for this group",
      "reason": "why these files belong together"
    }
  ],
  "explanation": "brief explanation of why splitting is recommended"
}

RULES:
- If changes are logically cohesive, set shouldSplit=false and provide overallMessage
- If changes span unrelated concerns, set shouldSplit=true and provide groups
- Each group should be a self-contained atomic change
- Each message follows format: type(scope): description
- Maximum 4 groups
- Return ONLY the JSON, no markdown code blocks, no wrapping
${customRulesInstruction}${conventionInstruction}
${branchContext}Staged diff:
${diff.slice(0, 12_000)}`;

  const raw = cleanAIText(await requestAIText(prompt, settings));
  if (!raw) return null;

  try {
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.shouldSplit === "boolean") {
      return parsed as CommitScopeSuggestion;
    }
  } catch {
    // Invalid JSON — return null, caller falls back to single message
  }
  return null;
}

/**
 * AI-powered risk summary for a diff — combines local pattern scan with
 * optional AI deep analysis. Returns a full RiskReport.
 */
export async function generateRiskSummary(
  repoPath: string,
  files: FileChange[],
  diff?: string,
): Promise<RiskReport & { aiSummary?: string }> {
  // Phase 1: instant local scan
  const localReport = scanForRisks(
    files.map((f) => ({ path: f.path, status: f.status })),
    diff,
  );

  // Phase 2: AI deep analysis (only if provider is configured and there are findings or many files)
  const settings = readAISettings();
  if (!hasProvider(settings) || (localReport.findings.length === 0 && files.length < 5)) {
    return localReport;
  }

  const diffContent = diff || await api.diff.staged(repoPath).catch(() => "");
  if (!diffContent.trim()) return localReport;

  const conventionInstruction = await getConventionContext(repoPath);
  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);
  const fileList = files.map((f) => `- [${f.status}] ${f.path}`).join("\n");

  const prompt = `You are a senior DevOps/security engineer. Analyze this git diff before a push or merge.

FILE CHANGES:
${fileList}

DIFF (truncated):
${diffContent.slice(0, 10_000)}

TASK: Provide a concise risk assessment. Focus on:
1. SECURITY RISKS: leaked credentials, exposed secrets, insecure configs, auth bypass
2. DATA RISKS: destructive SQL (DROP/DELETE/TRUNCATE), data loss, schema breaking changes
3. INFRA RISKS: Dockerfile/workflow/CI changes, deployment config changes
4. MIGRATION RISKS: database migrations, schema changes that may break compatibility
5. AUTH CHANGES: authentication/authorization logic changes that may affect access control

FORMAT:
- Start with a one-line OVERALL RISK LEVEL (LOW / MEDIUM / HIGH / CRITICAL).
- List each finding as a bullet with a category tag: [SECURITY], [DATA], [INFRA], [MIGRATION], [AUTH], [QUALITY]
- If no risks found, say "No significant risks detected."
- Be concise, direct, and actionable. No markdown code blocks.
${languageInstruction}${conventionInstruction}`;

  try {
    const aiResult = cleanAIText(await requestAIText(prompt, withReviewModel(settings)));
    if (aiResult) {
      return { ...localReport, aiSummary: aiResult };
    }
  } catch {
    // AI analysis failed — return local-only results
  }

  return localReport;
}

export function generateLocalCommitMessage(files: FileChange[], branchName = "") {
  const commitStyle = readCommitMessageStyle();
  const detailLevel = readCommitMessageDetailLevel();
  const statusCounts = files.reduce<Record<string, number>>((counts, file) => {
    counts[file.status] = (counts[file.status] || 0) + 1;
    return counts;
  }, {});
  const folders = files.map((file) => getTopLevelFolder(file.path)).filter(Boolean);
  const primaryScope = mostCommon(folders);
  const primaryStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "modified";
  const type = primaryStatus === "deleted"
    ? "refactor"
    : primaryStatus === "added" || primaryStatus === "untracked"
      ? "feat"
      : "chore";
  const scope = primaryScope ? `(${primaryScope})` : "";

  const description = files.length === 1
    ? `${statusVerb(primaryStatus)} ${getFileName(files[0].path)}`
    : `update ${files.length} files`;

  return formatLocalCommitMessage(commitStyle, detailLevel, type, scope, description, branchName, files);
}

export function readAISettings(): AISettings {
  // Read from active profile first; fall back to legacy keys if no profile exists
  const profile = loadActiveProfile();
  return {
    profileId: profile.id,
    provider: profile.provider || "openai-compatible",
    apiKey: profile.apiKey || localStorage.getItem("gitflowAiApiKey") || "",
    model: profile.commitModel || localStorage.getItem("gitflowAiModel") || DEFAULT_MODEL,
    reviewModel: profile.reviewModel
      || localStorage.getItem("gitflowAiReviewModel")
      || profile.commitModel
      || localStorage.getItem("gitflowAiModel")
      || DEFAULT_MODEL,
    customUrl: profile.apiUrl || localStorage.getItem("gitflowAiApiUrl") || "",
    tokenLimit: profile.tokenLimit || Number(localStorage.getItem("gitflowAiTokenLimit") || "4096"),
    detailLevel: readCommitMessageDetailLevel(),
    commitStyle: readCommitMessageStyle(),
    customRules: localStorage.getItem("gitflowAiCustomRules") || "",
    reviewLanguage: readAIReviewLanguage(),
  };
}

function readCommitMessageStyle(): CommitMessageStyle {
  const saved = localStorage.getItem("gitflowCommitMessageStyle");
  if (saved === "plain" || saved === "gitmoji" || saved === "jira") {
    return saved;
  }
  return "conventional";
}

export function readCommitMessageDetailLevel(): CommitMessageDetailLevel {
  const saved = localStorage.getItem("gitflowAiDetailLevel");
  const validLevels: CommitMessageDetailLevel[] = ["ultra-minimal", "minimal", "medium", "detailed", "comprehensive"];
  if (saved && validLevels.includes(saved as CommitMessageDetailLevel)) {
    return saved as CommitMessageDetailLevel;
  }
  return "medium";
}

function readAIReviewLanguage(): AIReviewLanguage {
  const saved = localStorage.getItem("gitflowAiReviewLanguage");
  const validLanguages: AIReviewLanguage[] = [
    "auto",
    "english",
    "vietnamese",
    "japanese",
    "korean",
    "chinese",
    "spanish",
    "french",
    "german",
  ];
  if (saved && validLanguages.includes(saved as AIReviewLanguage)) {
    return saved as AIReviewLanguage;
  }
  return "auto";
}

function buildCustomRulesInstruction(customRules: string): string {
  return customRules.trim()
    ? `\nUSER CUSTOM GUIDELINES:\n${customRules.trim()}\n`
    : "";
}

function buildConventionInstruction(files: ConventionFile[]): string {
  if (!files.length) return "";
  const block = files.map((f) => `### ${f.name}\n${f.content}`).join("\n\n");
  return `\nPROJECT CONVENTIONS (from repo root — must follow these):\n${block}\n`;
}

async function getConventionContext(repoPath: string): Promise<string> {
  try {
    const cached = conventionCache.get(repoPath);
    if (cached && Date.now() - cached.ts < CONVENTION_TTL_MS) {
      return buildConventionInstruction(cached.files);
    }
    const files = await api.ai.readConventionFiles(repoPath);
    conventionCache.set(repoPath, { files, ts: Date.now() });
    return buildConventionInstruction(files);
  } catch {
    return "";
  }
}

/** Returns detected convention files for a repo (from cache or fresh fetch). */
export async function readDetectedConventions(repoPath: string): Promise<ConventionFile[]> {
  try {
    const cached = conventionCache.get(repoPath);
    if (cached && Date.now() - cached.ts < CONVENTION_TTL_MS) return cached.files;
    const files = await api.ai.readConventionFiles(repoPath);
    conventionCache.set(repoPath, { files, ts: Date.now() });
    return files;
  } catch {
    return [];
  }
}

function buildReviewLanguageInstruction(language: AIReviewLanguage) {
  if (language === "auto") {
    return "LANGUAGE: Match the user's language when it is clear from the request or commit/MR text; otherwise use English.";
  }

  const labels: Record<Exclude<AIReviewLanguage, "auto">, string> = {
    english: "English",
    vietnamese: "Vietnamese",
    japanese: "Japanese",
    korean: "Korean",
    chinese: "Chinese",
    spanish: "Spanish",
    french: "French",
    german: "German",
  };

  return `LANGUAGE: Write the entire response in ${labels[language]}. Keep technical identifiers, file paths, code symbols, and API names unchanged.`;
}

function hasProvider(settings: AISettings) {
  if (settings.provider === "ollama" || settings.provider === "llamacpp") return true;
  return !!settings.apiKey;
}

function withReviewModel(settings: AISettings): AISettings {
  return {
    ...settings,
    model: settings.reviewModel || settings.model,
  };
}

async function getCurrentBranchName(repoPath: string) {
  try {
    const branches = await api.branches.list(repoPath);
    return branches.find((branch: Branch) => branch.current)?.name || "";
  } catch {
    return "";
  }
}

export function buildCommitPrompt(diff: string, settings: AISettings, branchName: string, conventionContext = "") {
  const formatInstruction = commitStyleInstruction(settings.commitStyle);
  const styleInstruction = settings.detailLevel === "ultra-minimal"
    ? "3. Return ONLY a single line (the subject line). No body."
    : settings.detailLevel === "minimal"
      ? "3. Return subject + 1-2 lines of brief explanation."
      : settings.detailLevel === "medium"
        ? "3. If the changes are complex, add a short body after a blank line."
        : settings.detailLevel === "detailed"
          ? "3. Write a detailed commit message with a body and concise bullet points."
          : "3. Write comprehensive message with body, 5-8 bullet points, reasoning section, and any breaking changes.";
  const branchContext = branchName
    ? `\nCurrent Git Branch Name: ${branchName}\n`
    : "";
  const customRules = settings.customRules.trim()
    ? `\nUSER CUSTOM RULES:\n${settings.customRules.trim()}\n`
    : "";

  return `You are an expert developer. Generate a professional Git commit message using the selected style based on the staged diff below.

CRITICAL INSTRUCTIONS:
1. ${formatInstruction}
2. Keep the subject under 50 characters.
${styleInstruction}
4. No markdown code blocks, no introductory text, no quotes. Return ONLY the raw commit message.
5. Use English unless custom rules say otherwise.
${branchContext}${customRules}${conventionContext}
Staged diff:
${diff.slice(0, 8000)}`;
}

function commitStyleInstruction(style: CommitMessageStyle) {
  switch (style) {
    case "plain":
      return "Format: short imperative subject without a Conventional Commit prefix.";
    case "gitmoji":
      return "Format: start the subject with one relevant gitmoji, then a Conventional Commit subject.";
    case "jira":
      return "Format: start with a Jira ticket from the branch name when present, then a Conventional Commit subject.";
    default:
      return "Format: <type>(<optional-scope>): <description in imperative mood, lowercase, no period>";
  }
}

export function formatLocalCommitMessage(
  style: CommitMessageStyle,
  detailLevel: CommitMessageDetailLevel,
  type: string,
  scope: string,
  description: string,
  branchName: string,
  files: FileChange[],
) {
  const subject = formatCommitSubject(style, type, scope, description, branchName);

  if (detailLevel === "ultra-minimal") {
    return subject;
  }

  if (detailLevel === "minimal") {
    return subject;
  }

  const changeList = buildLocalChangeList(
    files,
    detailLevel === "detailed" || detailLevel === "comprehensive" ? 8 : 3
  );

  if (changeList.length === 0) {
    return subject;
  }

  if (detailLevel === "medium") {
    return `${subject}\n\n${changeList.map((line) => `- ${line}`).join("\n")}`;
  }

  if (detailLevel === "detailed") {
    return `${subject}\n\nChanges:\n${changeList.map((line) => `- ${line}`).join("\n")}`;
  }

  if (detailLevel === "comprehensive") {
    const reasoning = "See branch name and diff for context.";
    return `${subject}\n\nChanges:\n${changeList.map((line) => `- ${line}`).join("\n")}\n\nReasoning:\n${reasoning}`;
  }

  return subject;
}

function formatCommitSubject(
  style: CommitMessageStyle,
  type: string,
  scope: string,
  description: string,
  branchName: string,
) {
  if (style === "plain") {
    return description;
  }
  if (style === "gitmoji") {
    return `${gitmojiForType(type)} ${type}${scope}: ${description}`;
  }
  if (style === "jira") {
    const ticket = extractTicket(branchName);
    return ticket ? `${ticket} ${type}${scope}: ${description}` : `${type}${scope}: ${description}`;
  }
  return `${type}${scope}: ${description}`;
}

function buildLocalChangeList(files: FileChange[], limit: number) {
  return files.slice(0, limit).map((file) => `${statusVerb(file.status)} ${file.path}`);
}

function extractTicket(branchName: string) {
  return branchName.match(/[A-Z][A-Z0-9]+-\d+/)?.[0] || "";
}

function gitmojiForType(type: string) {
  switch (type) {
    case "feat":
      return "✨";
    case "fix":
      return "🐛";
    case "refactor":
      return "♻️";
    default:
      return "🔧";
  }
}

async function requestAIText(prompt: string, settings: AISettings) {
  // ── Cache: return cached response for identical (prompt + model + profile) ──
  const key = cacheKey(prompt, settings.model, settings.profileId);
  const cached = cacheGet(key);
  if (cached) return cached;

  // ── Rate limit: wait if we've exceeded the sliding window ──
  await waitForRateSlot();

  let result: string;

  if (settings.provider === "anthropic") {
    let endpoint = settings.customUrl.trim() || "https://api.anthropic.com/v1/messages";
    if (settings.customUrl && !endpoint.endsWith("/messages")) {
      endpoint = endpoint.replace(/\/+$/, "") + "/messages";
    }
    const res = await api.ai.request(
      endpoint,
      "POST",
      {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
      },
      JSON.stringify({
        model: settings.model,
        max_tokens: settings.tokenLimit,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    );
    assertSuccess(res.status);
    result = parseAnthropicResponse(res.body);
  } else {
    // OpenAI-compatible, Ollama, llama.cpp all use the same /chat/completions protocol
    const defaultEndpoints: Record<string, string> = {
      "ollama": "http://localhost:11434/v1/chat/completions",
      "llamacpp": "http://localhost:8080/v1/chat/completions",
    };
    let endpoint = settings.customUrl.trim();
    if (!endpoint) {
      endpoint = defaultEndpoints[settings.provider] || "https://api.openai.com/v1/chat/completions";
    }
    if (settings.customUrl && !endpoint.endsWith("/chat/completions") && !endpoint.endsWith("/completions")) {
      endpoint = endpoint.replace(/\/+$/, "") + "/chat/completions";
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.apiKey) {
      headers.Authorization = `Bearer ${settings.apiKey}`;
    }

    const res = await api.ai.request(
      endpoint,
      "POST",
      headers,
      JSON.stringify({
        model: settings.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: settings.tokenLimit,
        stream: false,
      }),
    );
    assertSuccess(res.status);
    result = parseOpenAIResponse(res.body);
  }

  // ── Store in cache ──
  cacheSet(key, result);
  return result;
}

function assertSuccess(status: number) {
  if (status < 200 || status >= 300) {
    throw new Error(`API Error: ${status}`);
  }
}

function parseAnthropicResponse(body: string) {
  const trimmed = body.trim();
  if (trimmed.startsWith("data:")) {
    return parseSSE(trimmed, (json) => json.choices?.[0]?.delta?.content || json.delta?.content || "");
  }
  const data = JSON.parse(trimmed);
  return data.content?.[0]?.text || "";
}

function parseOpenAIResponse(body: string) {
  const trimmed = body.trim();
  if (trimmed.startsWith("data:")) {
    return parseSSE(trimmed, (json) => json.choices?.[0]?.delta?.content || json.choices?.[0]?.text || "");
  }
  const data = JSON.parse(trimmed);
  return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
}

function parseSSE(body: string, extract: (json: any) => string) {
  let text = "";
  for (const line of body.split("\n")) {
    const cleaned = line.trim();
    if (!cleaned.startsWith("data:") || cleaned === "data: [DONE]") continue;
    try {
      text += extract(JSON.parse(cleaned.slice(5).trim()));
    } catch {
      // Ignore malformed SSE fragments.
    }
  }
  return text;
}

function cleanAIText(text: string) {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
  }
  return clean.trim();
}

function statusVerb(status: string) {
  switch (status) {
    case "added":
    case "untracked":
      return "add";
    case "deleted":
      return "remove";
    case "renamed":
      return "rename";
    default:
      return "update";
  }
}

function mostCommon(items: string[]) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function getTopLevelFolder(path: string) {
  const [first, second] = path.split("/");
  if (!first || !second) return "";
  if (first === "apps" || first === "packages" || first === "crates") return second;
  return first;
}

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

export async function improveCommitMessage(
  repoPath: string,
  currentMessage: string,
  _files: FileChange[],
): Promise<string> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key or local model in settings");
  }

  const branchName = await getCurrentBranchName(repoPath);
  const diff = await api.diff.staged(repoPath);

  const conventionContext = await getConventionContext(repoPath);
  const branchContext = branchName ? `\nCurrent Git Branch Name: ${branchName}\n` : "";
  const customRules = settings.customRules.trim()
    ? `\nUSER CUSTOM RULES:\n${settings.customRules.trim()}\n`
    : "";

  const prompt = `You are a commit message expert. The user has written a draft commit message. Improve it for clarity, grammar, and conventional commit format while preserving the original intent.

Rules:
- Keep the same meaning and scope
- Improve grammar and clarity
- Follow conventional commits format if the project uses it
- Keep the same detail level (don't add information not in the diff)
- Return ONLY the improved message, no explanation
- No markdown code blocks
${branchContext}${customRules}${conventionContext}
Current message:
${currentMessage}

Staged diff:
${diff.slice(0, 6000)}`;

  const result = cleanAIText(await requestAIText(prompt, settings));
  if (!result) {
    throw new Error("Empty response from AI");
  }
  return result;
}

export async function addCommitBody(
  repoPath: string,
  subject: string,
  _files: FileChange[],
): Promise<string> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key or local model in settings");
  }

  const branchName = await getCurrentBranchName(repoPath);
  const diff = await api.diff.staged(repoPath);

  const conventionContext = await getConventionContext(repoPath);
  const branchContext = branchName ? `\nCurrent Git Branch Name: ${branchName}\n` : "";
  const customRules = settings.customRules.trim()
    ? `\nUSER CUSTOM RULES:\n${settings.customRules.trim()}\n`
    : "";

  const prompt = `You are a commit message expert. Generate a detailed commit body for the following commit subject.

The body should:
- Explain WHY the change was made, not just WHAT
- Mention key files/components affected
- Note any breaking changes or migration steps
- Use bullet points for multiple changes
- Be concise but informative (3-8 lines max)

Return the subject line followed by a blank line and the body. No explanation.
- No markdown code blocks
${branchContext}${customRules}${conventionContext}
Subject: ${subject}

Staged diff:
${diff.slice(0, 6000)}`;

  const result = cleanAIText(await requestAIText(prompt, settings));
  if (!result) {
    throw new Error("Empty response from AI");
  }
  return result;
}

// ── AI Merge Strategy Advisor ──────────────────────────────────────────────

export interface MergeStrategyRecommendation {
  strategy: "merge" | "rebase" | "squash" | "fast-forward";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  pros: string[];
  cons: string[];
}

export interface MergeStrategyAdvice {
  recommendation: MergeStrategyRecommendation;
  alternatives: MergeStrategyRecommendation[];
  summary: string;
}

const MERGE_STRATEGY_SCHEMAS: Record<string, string> = {
  "merge": "git merge --no-ff (creates a merge commit preserving branch topology)",
  "rebase": "git rebase + git merge --ff-only (replays commits on top of target for linear history)",
  "squash": "git merge --squash (combines all commits into one on target branch)",
  "fast-forward": "git merge --ff-only (moves branch pointer forward, no new commit)",
};

export async function adviseMergeStrategy(
  repoPath: string,
  currentBranch: string,
  targetBranch: string,
  ahead: number,
  behind: number,
  incomingCommits: Array<{ hash: string; message: string; author: string }>,
  changedFiles: Array<{ path: string; status: string; additions: number; deletions: number }>,
): Promise<MergeStrategyAdvice> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key or local model in settings");
  }

  const commitSummary = incomingCommits
    .slice(0, 30)
    .map((c) => `  ${c.hash.slice(0, 7)} ${c.message} (${c.author})`)
    .join("\n");

  const fileSummary = changedFiles
    .slice(0, 40)
    .map((f) => `  [${f.status}] ${f.path} +${f.additions}/-${f.deletions}`)
    .join("\n");

  const languageInstruction = buildReviewLanguageInstruction(settings.reviewLanguage);
  const conventionContext = await getConventionContext(repoPath);

  const prompt = `You are a Git merge strategy advisor. Analyze the branch comparison data and recommend the best merge strategy.

## Available Strategies

${Object.entries(MERGE_STRATEGY_SCHEMAS).map(([k, v]) => `- **${k}**: ${v}`).join("\n")}

## Branch Comparison Data

- Current branch: ${currentBranch}
- Target branch: ${targetBranch}
- Commits ahead (in ${targetBranch} but not ${currentBranch}): ${behind}
- Commits behind (in ${currentBranch} but not ${targetBranch}): ${ahead}
- Incoming commits (${behind} total):
${commitSummary || "  (none)"}
- Changed files (${changedFiles.length} total):
${fileSummary || "  (none)"}

## INSTRUCTIONS

1. Analyze the data and recommend the SINGLE best strategy.
2. Provide a confidence level: high (clear winner), medium (reasonable choice), or low (trade-offs involved).
3. Explain your reasoning in 2-3 sentences.
4. List 2-3 pros and 1-2 cons of the recommended strategy.
5. Provide 2-3 alternative strategies with their own reasoning (1 sentence each), pros (1-2 each), and cons (1 each).
6. Write a brief summary of your recommendation (1-2 sentences).

## RESPONSE FORMAT

Return EXACTLY this JSON structure — no markdown, no explanation outside the JSON:

{
  "recommendation": {
    "strategy": "merge|rebase|squash|fast-forward",
    "confidence": "high|medium|low",
    "reasoning": "...",
    "pros": ["...", "..."],
    "cons": ["...", "..."]
  },
  "alternatives": [
    {
      "strategy": "...",
      "confidence": "...",
      "reasoning": "...",
      "pros": ["..."],
      "cons": ["..."]
    }
  ],
  "summary": "..."
}

${languageInstruction}${conventionContext}`;

  const raw = await requestAIText(prompt, settings);

  // Try to parse JSON response
  const parsed = parseMergeStrategyAdvice(raw);
  if (parsed) return parsed;

  // Fallback: construct from free-text response
  return buildFallbackAdvice(raw, behind, ahead, incomingCommits.length, changedFiles.length);
}

function parseMergeStrategyAdvice(raw: string): MergeStrategyAdvice | null {
  try {
    // Strip markdown code fences if present
    let text = raw.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }
    // Find JSON object in the response
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null;
    const json = text.slice(jsonStart, jsonEnd + 1);
    const data = JSON.parse(json);

    if (!data.recommendation?.strategy) return null;

    const validStrategies = ["merge", "rebase", "squash", "fast-forward"];
    if (!validStrategies.includes(data.recommendation.strategy)) return null;

    return {
      recommendation: {
        strategy: data.recommendation.strategy,
        confidence: data.recommendation.confidence || "medium",
        reasoning: data.recommendation.reasoning || "",
        pros: Array.isArray(data.recommendation.pros) ? data.recommendation.pros : [],
        cons: Array.isArray(data.recommendation.cons) ? data.recommendation.cons : [],
      },
      alternatives: (Array.isArray(data.alternatives) ? data.alternatives : [])
        .filter((a: any) => validStrategies.includes(a?.strategy))
        .map((a: any) => ({
          strategy: a.strategy,
          confidence: a.confidence || "medium",
          reasoning: a.reasoning || "",
          pros: Array.isArray(a.pros) ? a.pros : [],
          cons: Array.isArray(a.cons) ? a.cons : [],
        })),
      summary: data.summary || "",
    };
  } catch {
    return null;
  }
}

function buildFallbackAdvice(
  raw: string,
  behind: number,
  ahead: number,
  commitCount: number,
  fileCount: number,
): MergeStrategyAdvice {
  const text = cleanAIText(raw);
  const strategy: MergeStrategyRecommendation["strategy"] =
    ahead === 0 && behind > 0 ? "fast-forward" :
    commitCount > 10 ? "squash" :
    "merge";

  return {
    recommendation: {
      strategy,
      confidence: "low",
      reasoning: text.slice(0, 500) || `Based on ${behind} incoming commits and ${ahead} divergent commits.`,
      pros: [],
      cons: [],
    },
    alternatives: [],
    summary: text.slice(0, 200) || `Recommend ${strategy} for this branch merge.`,
  };
}

// ── Commit History Summary ───────────────────────────────────────────

export interface CommitSummaryResult {
  summary: string;
  stats: {
    totalCommits: number;
    authors: string[];
    dateRange: { from: string; to: string };
  };
}

export async function generateCommitSummary(
  commits: Array<{ hash: string; message: string; date: string; author: string }>,
  timeRange: string,
): Promise<CommitSummaryResult> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("AI provider not configured");
  }

  const commitList = commits.map((c, i) =>
    `${i + 1}. [${c.date.slice(0, 10)}] ${c.message} — ${c.author}`
  ).join("\n");

  const authors = [...new Set(commits.map((c) => c.author))];
  const dateRange = {
    from: commits.length > 0 ? commits[commits.length - 1].date.slice(0, 10) : "",
    to: commits.length > 0 ? commits[0].date.slice(0, 10) : "",
  };

  const prompt = `You are a helpful engineering standup assistant. Summarize this git commit history for a standup meeting.

TIME RANGE: ${timeRange}
COMMITS (${commits.length} total, ${authors.length} contributor${authors.length === 1 ? "" : "s"}):
${commitList}

TASK: Generate a concise standup summary. Use this exact structure:

## What was done
Group commits by topic/feature/fix. Each group gets a brief description of what was accomplished. Use bullet points.

## Key changes
List the 3-5 most important changes with brief explanations of impact.

## Stats
- Total commits: N
- Contributors: name1, name2
- Date range: YYYY-MM-DD to YYYY-MM-DD

Be concise, professional, and actionable. Focus on outcomes, not implementation details. No markdown code blocks.`;

  const raw = cleanAIText(await requestAIText(prompt, settings));

  return {
    summary: raw,
    stats: {
      totalCommits: commits.length,
      authors,
      dateRange,
    },
  };
}
