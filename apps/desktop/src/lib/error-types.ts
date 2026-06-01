/**
 * Git error classification utilities.
 * Parses git/Tauri error strings into typed error objects for differentiated UX.
 */

export type ErrorCategory =
  | "network"
  | "auth"
  | "conflict"
  | "validation"
  | "system"
  | "unknown";

export interface ClassifiedError {
  message: string;
  category: ErrorCategory;
  detail: string;      // user-friendly action hint
  retryable: boolean;
}

const NETWORK_PATTERNS = [
  /could not (access|read|resolve|connect)/i,
  /unable to access/i,
  /fatal:.*(?:timed out|timeout)/i,
  /couldn't find remote ref/i,
  /fatal:.*not found/i,
  /failed to (fetch|push|pull)/i,
  /Connection (refused|reset|closed)/i,
  /Name or service not known/i,
  /Cannot rebase onto/i,
  /remote error/i,
];

const AUTH_PATTERNS = [
  /permission denied/i,
  /authentication failed/i,
  /no anonymous access/i,
  /could not read.*?password/i,
  /could not read.*?credential/i,
  /publickey/i,
  /key (is invalid|not found|not recognised)/i,
  /fatal.*?credential/i,
  /403/i,
  /401/i,
  /SSL certificate problem/i,
  /could not authenticate/i,
];

const CONFLICT_PATTERNS = [
  /CONFLICT/i,
  /Merge conflict/i,
  /merge conflict/i,
  /Automatic merge failed/i,
  /You have not concluded your merge/i,
  /fix conflicts/i,
  /need merge/i,
  /would be overwritten by merge/i,
  /Cherry-pick conflict/i,
  /Rebase conflict/i,
  /cannot rebase: You have unstaged changes/i,
  /Your local changes to the following files would be overwritten/i,
  /The following untracked working tree files would be overwritten/i,
];

const VALIDATION_PATTERNS = [
  /ambiguous argument/i,
  /does not match any/i,
  /not a valid (object name|ref|commit)/i,
  /pathspec '.*' did not match/i,
  /Couldn't find remote ref/i,
  /already exists/i,
  /cannot lock ref/i,
  /is not a commit/i,
  /Needed a single revision/i,
  /Unknown option/i,
  /too many arguments/i,
  /fatal.*?not a git repository/i,
  /'origin' does not appear to be a git repository/i,
];

export function classifyGitError(error: unknown): ClassifiedError {
  const message = error instanceof Error ? error.message : String(error);

  // Auth errors (checked first to prevent 401/403 access issues from matching generic network patterns)
  if (AUTH_PATTERNS.some((p) => p.test(message))) {
    return {
      message: "Credential Required",
      category: "auth",
      detail: `Authentication failed (401/403 or permission denied). Please verify your remote credentials, SSH keys, or access token. (${message.replace(/^fatal:\s*/i, "").trim().slice(0, 120)})`,
      retryable: false,
    };
  }

  // Network errors
  if (NETWORK_PATTERNS.some((p) => p.test(message))) {
    return {
      message,
      category: "network",
      detail: "Check your internet connection and remote URL. The operation may succeed if you try again.",
      retryable: true,
    };
  }

  // Conflict errors
  if (CONFLICT_PATTERNS.some((p) => p.test(message))) {
    return {
      message,
      category: "conflict",
      detail: "Resolve the conflicts manually, then stage the resolved files.",
      retryable: false,
    };
  }

  // Validation errors
  if (VALIDATION_PATTERNS.some((p) => p.test(message))) {
    return {
      message,
      category: "validation",
      detail: "Double-check the branch name, ref, or path you provided.",
      retryable: false,
    };
  }

  // System-level errors (Tauri bridge issues, disk, etc.)
  if (
    /Failed to run git/i.test(message) ||
    message.includes("Invoke") ||
    message.includes("internal error") ||
    message.includes("Not a git repository") ||
    /No such file or directory/i.test(message)
  ) {
    return {
      message,
      category: "system",
      detail: "This is an app-level error. Check that git is installed and the repository path is valid.",
      retryable: false,
    };
  }

  // Fallback: unknown
  return {
    message,
    category: "unknown",
    detail: "An unexpected error occurred. If this persists, check the console for details.",
    retryable: false,
  };
}

export function formatShortError(message: string): string {
  // Strip common prefixes for compact display
  return message
    .replace(/^fatal:\s*/i, "")
    .replace(/^error:\s*/i, "")
    .replace(/\n.*$/s, "")  // keep only first line
    .trim()
    .slice(0, 120);
}
