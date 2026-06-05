/**
 * Registry that maps React Query mutationKey arrays to human-readable labels
 * for the Operation Center UI.
 */

const LABELS: Record<string, string> = {
  // AI operations
  "ai.generate-commit": "AI: Generate Commit Message",
  "ai.diff-review": "AI: Review Diff",
  "ai.inline-comments": "AI: Inline Comments",
  "ai.commit-review": "AI: Review Commit",
  "ai.commit-explain": "AI: Explain Commit",
  "ai.commit-scope": "AI: Analyze Commit Scope",
  "ai.mr-explain": "AI: Explain Merge Request",
  "ai.mr-review": "AI: Review Merge Request",
  "ai.conflict-explain": "AI: Explain Conflict",
  "ai.commit-guardrail": "AI: Pre-Commit Guardrail",
  "ai.commit-readiness": "AI: Commit Readiness Check",

  // Git mutations
  "git.merge": "Git: Merge Branch",
  "git.merge-abort": "Git: Abort Merge",
  "git.merge-continue": "Git: Continue Merge",
  "git.stash-push": "Git: Stash Changes",
  "git.stash-pop": "Git: Pop Stash",
  "git.stash-apply": "Git: Apply Stash",
  "git.stash-drop": "Git: Drop Stash",
  "git.tag-create": "Git: Create Tag",
  "git.tag-delete": "Git: Delete Tag",
  "git.tag-push": "Git: Push Tag",
  "git.cherry-pick": "Git: Cherry-Pick",
  "git.cherry-pick-abort": "Git: Abort Cherry-Pick",
  "git.reflog-undo": "Git: Undo (Reflog)",
};

/**
 * Resolve a human-readable label from a mutation key.
 * The first element of the key array is used as the lookup key.
 */
export function labelForMutationKey(key: unknown[] | undefined): string | null {
  if (!key || key.length === 0) return null;
  const name = String(key[0]);
  return LABELS[name] ?? null;
}

export function operationTypeForKey(key: unknown[] | undefined): "git" | "ai" {
  if (!key || key.length === 0) return "git";
  return String(key[0]).startsWith("ai.") ? "ai" : "git";
}
