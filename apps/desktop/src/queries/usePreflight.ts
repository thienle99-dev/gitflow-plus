import { useQuery } from "@tanstack/react-query";
import { api, type PreflightResult } from "@/api/tauri";

/**
 * Run a pre-flight safety check on the repository before performing
 * a gitflow operation (merge, rebase, cherry-pick, checkout, etc.).
 *
 * Returns a structured report with boolean flags for each condition
 * and human-readable `warnings` the caller can display.
 */
export function usePreflight(repoPath: string | null, enabled = true) {
  return useQuery<PreflightResult>({
    queryKey: ["preflight", repoPath],
    queryFn: () => api.preflight.check(repoPath!),
    enabled: !!repoPath && enabled,
    staleTime: 5_000, // re-check if older than 5 s
  });
}

/**
 * Convenience: does the repo have any blocking condition that should
 * prevent a gitflow operation from starting?
 */
export function hasBlockingCondition(result: PreflightResult): boolean {
  return (
    result.detached_head ||
    result.merge_in_progress ||
    result.rebase_in_progress ||
    result.cherry_pick_in_progress ||
    result.has_conflicts
  );
}

/**
 * Convenience: does the repo have any advisory warning (dirty worktree,
 * untracked files) that should be shown but may not block the operation?
 */
export function hasAdvisoryWarnings(result: PreflightResult): boolean {
  return result.dirty_worktree || result.has_untracked_files;
}
