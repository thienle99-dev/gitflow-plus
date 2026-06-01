import { api, type FileChange, type Branch } from "@/api/tauri";

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
type CommitMessageDetailLevel = "minimal" | "medium" | "detailed";

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

function readCommitMessageDetailLevel(): CommitMessageDetailLevel {
  const saved = localStorage.getItem("gitflowAiDetailLevel");
  if (saved === "minimal" || saved === "detailed") {
    return saved;
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

function buildCommitPrompt(diff: string, settings: AISettings, branchName: string) {
  const formatInstruction = commitStyleInstruction(settings.commitStyle);
  const styleInstruction = settings.detailLevel === "minimal"
    ? "3. Return ONLY a single line (the subject line). Do NOT add a body."
    : settings.detailLevel === "detailed"
      ? "3. Write a detailed commit message with a body and concise bullet points."
      : "3. If the changes are complex, add a short body after a blank line.";
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

function formatLocalCommitMessage(
  style: CommitMessageStyle,
  detailLevel: CommitMessageDetailLevel,
  type: string,
  scope: string,
  description: string,
  branchName: string,
  files: FileChange[],
) {
  const subject = formatCommitSubject(style, type, scope, description, branchName);
  if (detailLevel === "minimal") {
    return subject;
  }

  const changeList = buildLocalChangeList(files, detailLevel === "detailed" ? 8 : 3);
  if (changeList.length === 0) {
    return subject;
  }

  if (detailLevel === "detailed") {
    return `${subject}\n\nChanges:\n${changeList.map((line) => `- ${line}`).join("\n")}`;
  }

  return `${subject}\n\n${changeList.map((line) => `- ${line}`).join("\n")}`;
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
