import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";

export interface RepoAutoRefreshOptions {
  /** Invalidates full commit log (key "log"). Off by default. */
  includeLog?: boolean;
  /** Invalidates "info" key */
  includeInfo?: boolean;
  /** Invalidates "stash-list" key */
  includeStash?: boolean;
  /** Invalidates "submodules" key */
  includeSubmodules?: boolean;
  /** Invalidates "lfs" key */
  includeLfs?: boolean;
  /** Debounce delay in ms (default 250) */
  debounceMs?: number;
  /** Throttle window for focus-refresh in ms (default 5000) */
  focusThrottleMs?: number;
}

const defaultOptions: Required<RepoAutoRefreshOptions> = {
  includeLog: false,
  includeInfo: false,
  includeStash: false,
  includeSubmodules: false,
  includeLfs: false,
  debounceMs: 250,
  focusThrottleMs: 5_000,
};

/**
 * Shared hook: listens for Rust backend file-watcher events (`repo:changed`)
 * and window focus to auto-invalidate React Query keys.
 *
 * This keeps git state fresh in both the main window and tray panel
 * without duplicating the invalidation logic.
 */
export function useRepoAutoRefresh(
  repoPath: string | null,
  opts?: RepoAutoRefreshOptions,
) {
  const queryClient = useQueryClient();
  const {
    includeLog,
    includeInfo,
    includeStash,
    includeSubmodules,
    includeLfs,
    debounceMs,
    focusThrottleMs,
  } = { ...defaultOptions, ...opts };

  const invalidateTimersRef = useRef<Map<string, number>>(new Map());
  const lastFocusRefreshRef = useRef(0);

  const scheduleInvalidate = useCallback(
    (queryKey: unknown[], delay = debounceMs) => {
      const key = JSON.stringify(queryKey);
      const existing = invalidateTimersRef.current.get(key);
      if (existing !== undefined) window.clearTimeout(existing);
      const timer = window.setTimeout(() => {
        invalidateTimersRef.current.delete(key);
        queryClient.invalidateQueries({ queryKey });
      }, delay);
      invalidateTimersRef.current.set(key, timer);
    },
    [queryClient, debounceMs],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      invalidateTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      invalidateTimersRef.current.clear();
    };
  }, []);

  // Listen for file-watcher events from Rust backend
  useEffect(() => {
    if (!repoPath) return;
    const unlisten = listen<{ event_type: string }>("repo:changed", (event) => {
      const type = event.payload.event_type;
      if (type === "worktree") {
        scheduleInvalidate(["git", repoPath, "status"]);
        if (includeSubmodules) scheduleInvalidate(["git", repoPath, "submodules"]);
        if (includeLfs) scheduleInvalidate(["git", repoPath, "lfs"]);
        scheduleInvalidate(["git", repoPath, "diff"]);
      } else if (type === "refs") {
        if (includeLog) scheduleInvalidate(["git", repoPath, "log"]);
        if (includeInfo) scheduleInvalidate(["git", repoPath, "info"]);
        scheduleInvalidate(["git", repoPath, "branches"]);
        scheduleInvalidate(["git", repoPath, "recent-commits"]);
        scheduleInvalidate(["git", repoPath, "sync-status"]);
        if (includeStash) scheduleInvalidate(["git", repoPath, "stash-list"]);
      } else if (type === "head") {
        if (includeLog) scheduleInvalidate(["git", repoPath, "log"]);
        if (includeInfo) scheduleInvalidate(["git", repoPath, "info"]);
        scheduleInvalidate(["git", repoPath, "branches"]);
        scheduleInvalidate(["git", repoPath, "recent-commits"]);
        scheduleInvalidate(["git", repoPath, "sync-status"]);
        if (includeStash) scheduleInvalidate(["git", repoPath, "stash-list"]);
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [repoPath, scheduleInvalidate, includeLog, includeInfo, includeStash, includeSubmodules, includeLfs]);

  // Auto-refresh git state when window gains focus
  useEffect(() => {
    if (!repoPath) return;
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < focusThrottleMs) return;
      lastFocusRefreshRef.current = now;
      scheduleInvalidate(["git", repoPath, "status"]);
      scheduleInvalidate(["git", repoPath, "sync-status"]);
      scheduleInvalidate(["git", repoPath, "branches"]);
      scheduleInvalidate(["git", repoPath, "recent-commits"]);
      if (includeLog) scheduleInvalidate(["git", repoPath, "log"]);
      if (includeInfo) scheduleInvalidate(["git", repoPath, "info"]);
      if (includeStash) scheduleInvalidate(["git", repoPath, "stash-list"]);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [repoPath, scheduleInvalidate, focusThrottleMs, includeLog, includeInfo, includeStash]);
}
