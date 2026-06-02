# Auto-fetch + Revert Commit — Design Spec

**Date:** 2026-06-02  
**Status:** Design  
**Scope:** Background auto-fetch with configurable interval + revert commit action

---

## Feature 1: Auto-fetch

### Problem

`useGitSyncStatus` polls `get_sync_status` at a configurable interval (via `getSyncStatusInterval()`), but `get_sync_status` runs `git rev-list --left-right --count HEAD...@{u}` which only compares local vs the **cached** remote tracking branch. Without a `git fetch`, the behind count never updates — the user must manually click Fetch.

### Current State

| Component | Status | File |
|-----------|--------|------|
| `getSyncStatusInterval()` | ✅ Exists | `queries/useGitLog.ts:9-14` |
| `useGitSyncStatus` with `refetchInterval` | ✅ Exists | `queries/useGitLog.ts:160-168` |
| `get_sync_status` Rust command | ✅ Exists | `commands/remote.rs:108-134` |
| Behind count badge on Pull button | ✅ Exists | `Toolbar.tsx:145-149` |
| Actual background `git fetch` | ❌ Missing | — |
| Auto-fetch settings UI | ❌ Missing | — |

### Approach

Frontend-only: Add a `setInterval` in `MainLayout.tsx` that calls `api.remote.fetch(repoPath)` at the configured interval. After fetch completes, invalidate `sync-status` + `branches` + `log` queries. The existing `useGitSyncStatus` polling will then pick up the updated behind count.

**Why frontend, not Rust backend?**
- Simpler — no need for a Tauri background task / state management
- The existing `getSyncStatusInterval()` + localStorage config is already frontend
- The file watcher already handles query invalidation for worktree/refs changes
- Fetch errors can be silently ignored (network issues are transient)

### Data Flow

```
MainLayout useEffect
  → setInterval(fetchInterval)
  → api.remote.fetch(repoPath)
  → on success: invalidateQueries [sync-status, branches, log]
  → useGitSyncStatus picks up new behind count
  → Pull button badge updates
```

### Settings

Existing localStorage keys (already defined in `getSyncStatusInterval()`):
- `gitflowAutoFetch` — `"true"` (default) / `"false"` to disable
- `gitflowFetchIntervalMinutes` — number, default `10`, clamped to `5-60`

Need a settings UI section to toggle and configure these values.

---

## Feature 2: Revert Commit

### Problem

No way to revert a commit from the UI. `git revert` creates a new commit that undoes the changes of a specified commit — safer than `git reset` for shared branches.

### Approach

Follow existing pattern in `commit.rs` (stage, unstage, commit, discard):

1. **Rust command:** `revert_commit(path, commit_hash)` — runs `git revert <hash> --no-edit`
2. **Frontend wrapper:** `api.commit.revert(path, hash)` in `tauri.ts`
3. **UI:** 
   - Button in commit detail panel (when a commit is selected)
   - Context menu item in CommitGraph right-click menu

### Edge Cases

| Case | Behavior |
|------|----------|
| Revert causes conflict | Return error with conflicted files list |
| Revert HEAD (most recent) | Works same as any commit |
| Revert merge commit | Requires `-m 1` flag — skip for now, return error "Cannot revert merge commit" |
| Dirty working tree | Git will refuse — return error |

---

## File Changes

| File | Change |
|------|--------|
| `apps/desktop/src/layouts/MainLayout.tsx` | Add auto-fetch `setInterval` effect |
| `apps/desktop/src/components/features/dialogs/SettingsDialog.tsx` | Add auto-fetch toggle + interval slider |
| `src-tauri/src/commands/commit.rs` | Add `revert_commit` command |
| `src-tauri/src/lib.rs` | Register `revert_commit` in invoke_handler |
| `apps/desktop/src/api/tauri.ts` | Add `api.commit.revert()` wrapper |
| `apps/desktop/src/components/features/commit-detail/CommitDetail.tsx` | Add Revert button |
| `apps/desktop/src/components/features/graph/CommitGraph.tsx` | Add "Revert" to context menu |
