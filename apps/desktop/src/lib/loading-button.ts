/**
 * Shared loading button styles — single source of truth for loading states.
 *
 * Pattern:
 * - loading icon REPLACES original icon (not stacked)
 * - button gets accent bg while loading
 * - text changes to "{action}ing…"
 * - sibling buttons dim to opacity-40 while any action in group is loading
 */

/** Base class for toolbar/group buttons */
export const GROUP_BUTTON_BASE =
  "h-7 px-4 flex items-center gap-2 text-2xs font-semibold rounded transition-all cursor-pointer disabled:cursor-not-allowed";

/** Returns class for a button that is the active loading one */
export function loadingButtonClass(): string {
  return "bg-accent-10 text-accent";
}

/** Returns class for a button in a group where ANOTHER button is loading (dimmed) */
export function lockedButtonClass(): string {
  return "text-text-muted-50 opacity-40";
}

/** Returns class for a button in its default idle state */
export function idleButtonClass(): string {
  return "text-text-secondary hover:text-text-primary hover:bg-surface-3";
}

/** Small compact button base (CommitBox AI buttons, etc.) */
export const COMPACT_BUTTON_BASE =
  "h-6 px-1.5 rounded-mac border text-[10px] font-semibold inline-flex shrink-0 items-center gap-1 whitespace-nowrap transition-all cursor-pointer active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed";

/** Loading class for compact buttons */
export function compactLoadingClass(): string {
  return "bg-accent-10 border-accent-30 text-accent";
}

/** Locked class for compact buttons when another operation is running */
export function compactLockedClass(): string {
  return "bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-border-40";
}

/**
 * Maps action name to its -ing form for loading text.
 * Falls back to "{action}ing…" if not in map.
 */
export const LOADING_LABELS: Record<string, string> = {
  pull: "Pulling…",
  fetch: "Fetching…",
  push: "Pushing…",
  review: "Reviewing…",
  guardrail: "Checking…",
  readiness: "Checking…",
  lint: "Linting…",
  generate: "Generating…",
  improve: "Improving…",
  "add-body": "Adding body…",
  "fix-plan": "Planning…",
  "pr-draft": "Generating…",
  "lfs-pull": "Pulling…",
  "lfs-push": "Pushing…",
  "ai-explain": "Analyzing…",
  "inline-comments": "Generating…",
};
