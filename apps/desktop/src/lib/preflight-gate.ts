/**
 * Preflight gate — checks repository state before performing git operations.
 * Blocks operations when conditions would cause data loss or errors.
 */

import { api, type PreflightResult } from "@/api/tauri";

export type PreflightAction = "merge" | "rebase" | "cherry-pick" | "checkout" | "push" | "pull" | "commit";

interface GateResult {
  allowed: boolean;
  warnings: string[];
  preflight: PreflightResult;
}

/**
 * Run preflight check and determine if the given action is allowed.
 */
export async function preflightGate(repoPath: string, action: PreflightAction): Promise<GateResult> {
  const preflight = await api.preflight.check(repoPath);
  const warnings: string[] = [];

  // Block if another operation is in progress
  if (preflight.merge_in_progress && action !== "merge") {
    warnings.push("A merge is in progress. Complete or abort it first.");
  }
  if (preflight.rebase_in_progress && action !== "rebase") {
    warnings.push("A rebase is in progress. Continue, skip, or abort it first.");
  }
  if (preflight.cherry_pick_in_progress && action !== "cherry-pick") {
    warnings.push("A cherry-pick is in progress. Complete or abort it first.");
  }

  // Block if conflicts exist
  if (preflight.has_conflicts) {
    warnings.push(`There are ${preflight.conflicted_files.length} unresolved conflict(s). Resolve them first.`);
  }

  // Action-specific checks
  switch (action) {
    case "merge":
      if (preflight.merge_in_progress) {
        warnings.push("A merge is already in progress.");
      }
      if (preflight.rebase_in_progress) {
        warnings.push("Cannot merge during an active rebase.");
      }
      if (preflight.cherry_pick_in_progress) {
        warnings.push("Cannot merge during an active cherry-pick.");
      }
      break;

    case "rebase":
      if (preflight.rebase_in_progress) {
        warnings.push("A rebase is already in progress.");
      }
      if (preflight.merge_in_progress) {
        warnings.push("Cannot rebase during an active merge.");
      }
      if (preflight.cherry_pick_in_progress) {
        warnings.push("Cannot rebase during an active cherry-pick.");
      }
      if (preflight.dirty_worktree) {
        warnings.push("Working tree has uncommitted changes. Commit or stash before rebasing.");
      }
      break;

    case "cherry-pick":
      if (preflight.cherry_pick_in_progress) {
        warnings.push("A cherry-pick is already in progress.");
      }
      if (preflight.merge_in_progress) {
        warnings.push("Cannot cherry-pick during an active merge.");
      }
      if (preflight.rebase_in_progress) {
        warnings.push("Cannot cherry-pick during an active rebase.");
      }
      break;

    case "checkout":
      if (preflight.dirty_worktree) {
        warnings.push(`Working tree has ${preflight.dirty_file_count} uncommitted change(s).`);
      }
      if (preflight.detached_head) {
        warnings.push("HEAD is detached. Create a branch first.");
      }
      break;

    case "push":
      if (preflight.dirty_worktree) {
        warnings.push(`Working tree has ${preflight.dirty_file_count} uncommitted change(s).`);
      }
      break;

    case "pull":
      if (preflight.dirty_worktree) {
        warnings.push(`Working tree has ${preflight.dirty_file_count} uncommitted change(s).`);
      }
      break;

    case "commit":
      if (preflight.has_conflicts) {
        warnings.push("Cannot commit with unresolved conflicts.");
      }
      break;
  }

  return {
    allowed: warnings.length === 0,
    warnings,
    preflight,
  };
}

/**
 * Check if a blocking condition exists (operation in progress or conflicts).
 */
export function hasBlockingCondition(preflight: PreflightResult): boolean {
  return (
    preflight.merge_in_progress ||
    preflight.rebase_in_progress ||
    preflight.cherry_pick_in_progress ||
    preflight.has_conflicts
  );
}
