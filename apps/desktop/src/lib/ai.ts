import { api, type FileChange, type Branch } from "@/api/tauri";
import type { MergeRequest, MergeRequestFileChange } from "@/api/gitHost";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface AISettings {
  apiKey: string;
  model: string;
  customUrl: string;
  tokenLimit: number;
  detailLevel: CommitMessageDetailLevel;
  commitStyle: CommitMessageStyle;
  customRules: string;
}

interface GeneratedCommitMessage {
  message: string;
  fallback: boolean;
  reason?: string;
}

type CommitMessageStyle = "conventional" | "plain" | "gitmoji" | "jira";
type CommitMessageDetailLevel = "ultra-minimal" | "minimal" | "medium" | "detailed" | "comprehensive";

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

  const prompt = buildCommitPrompt(diff, settings, branchName);
  const message = cleanAIText(await requestAIText(prompt, settings));
  if (!message) {
    throw new Error("Empty response from AI");
  }

  return { message, fallback: false };
}

export async function reviewDiffWithAI(filePath: string, diff: string) {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key or local model in settings");
  }

  const prompt = `You are a world-class senior software architect. Analyze the git diff below for the file "${filePath}" and provide two structured sections:
1. CODE EXPLANATION: A clear, high-level summary of WHAT was changed and WHY.
2. CODE REVIEW & SUGGESTIONS: Inspect the code changes for potential bugs, security issues, performance optimization opportunities, or style improvements. If everything looks good, say that clearly.

Be professional, direct, constructive, and use markdown styling.

Diff:
${diff.slice(0, 8000)}`;

  const review = cleanAIText(await requestAIText(prompt, settings));
  if (!review) {
    throw new Error("Empty response from AI reviewer");
  }
  return review;
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

  const prompt = `You are a senior software engineer reviewing a Git commit. Explain this commit in plain English.

${branchContext}Commit message: ${commitMessage}

Diff:
${truncatedDiff}

INSTRUCTIONS:
1. Start with a 1-2 sentence summary of WHAT this commit does.
2. Explain the MOTIVATION — why this change was likely needed.
3. List the KEY CHANGES as bullet points (max 5-6).
4. If there are potential RISKS or BREAKING CHANGES, mention them briefly.
5. Use plain English. Be concise and direct. No markdown code blocks.
6. Use English unless the commit message is in another language.`;

  const explanation = cleanAIText(await requestAIText(prompt, settings));
  if (!explanation) {
    throw new Error("Empty response from AI");
  }
  return explanation;
}

export async function explainMergeRequestWithAI(
  mergeRequest: MergeRequest,
  files: MergeRequestFileChange[],
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

  const prompt = `You are a senior engineer reviewing a merge request. Explain the change in plain English and call out review-relevant details.

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
4. Keep it useful for code review. No code blocks.`;

  const explanation = cleanAIText(await requestAIText(prompt, settings));
  if (!explanation) {
    throw new Error("Empty response from AI");
  }
  return explanation;
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

function readAISettings(): AISettings {
  return {
    apiKey: localStorage.getItem("gitflowAiApiKey") || "",
    model: localStorage.getItem("gitflowAiModel") || DEFAULT_MODEL,
    customUrl: localStorage.getItem("gitflowAiApiUrl") || "",
    tokenLimit: Number(localStorage.getItem("gitflowAiTokenLimit") || "4096"),
    detailLevel: readCommitMessageDetailLevel(),
    commitStyle: readCommitMessageStyle(),
    customRules: localStorage.getItem("gitflowAiCustomRules") || "",
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

function hasProvider(settings: AISettings) {
  return !!settings.apiKey || settings.model === "ollama" || settings.model === "llama.cpp";
}

async function getCurrentBranchName(repoPath: string) {
  try {
    const branches = await api.branches.list(repoPath);
    return branches.find((branch: Branch) => branch.current)?.name || "";
  } catch {
    return "";
  }
}

export function buildCommitPrompt(diff: string, settings: AISettings, branchName: string) {
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
${branchContext}${customRules}
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
  if (settings.model.startsWith("claude-")) {
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
    return parseAnthropicResponse(res.body);
  }

  let endpoint = settings.customUrl.trim();
  if (!endpoint) {
    endpoint = settings.model === "ollama"
      ? "http://localhost:11434/v1/chat/completions"
      : settings.model === "llama.cpp"
        ? "http://localhost:8080/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
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
      model: settings.model === "ollama" ? "llama3" : settings.model === "llama.cpp" ? "local-model" : settings.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: settings.tokenLimit,
      stream: false,
    }),
  );
  assertSuccess(res.status);
  return parseOpenAIResponse(res.body);
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
