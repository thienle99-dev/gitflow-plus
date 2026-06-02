# Auto-fetch + Revert Commit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement background auto-fetch (periodic `git fetch` + updated behind count badge) and revert commit action (UI + backend).

**Architecture:** Auto-fetch is frontend-only (setInterval in MainLayout). Revert commit needs a new Rust command + frontend wrapper + UI buttons.

**Tech Stack:** React 18, Zustand, TanStack Query, Tailwind CSS, Rust (tokio::process::Command)

---

## File Structure

| File | Change |
|------|--------|
| `apps/desktop/src/layouts/MainLayout.tsx` | Add auto-fetch `setInterval` effect |
| `src-tauri/src/commands/commit.rs` | Add `revert_commit` command |
| `src-tauri/src/lib.rs` | Register `revert_commit` in invoke_handler |
| `apps/desktop/src/api/tauri.ts` | Add `api.commit.revert()` wrapper |
| `apps/desktop/src/components/features/commit-detail/CommitDetail.tsx` | Add Revert button |
| `apps/desktop/src/components/features/graph/CommitGraph.tsx` | Add "Revert" to context menu |

---

## Part A: Auto-fetch

### Context

- `getSyncStatusInterval()` in `queries/useGitLog.ts:9-14` already reads `gitflowAutoFetch` + `gitflowFetchIntervalMinutes` from localStorage
- `useGitSyncStatus` in `queries/useGitLog.ts:160-168` already polls `get_sync_status` at the configured interval
- `get_sync_status` in `commands/remote.rs:108-134` runs `git rev-list --left-right --count HEAD...@{u}` — this compares local vs remote tracking branch but does NOT fetch
- Settings UI in `SettingsDialog.tsx` already has auto-fetch toggle + interval selector
- **The gap:** Nothing actually runs `git fetch` periodically, so the behind count never updates automatically

### Task 1: Add background auto-fetch in MainLayout

**Files:**
- Modify: `apps/desktop/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Read the current useEffect hooks area in MainLayout**

Find the existing effects around lines 46-83. We need to add a new effect after the file watcher effect.

- [ ] **Step 2: Add auto-fetch useEffect**

Insert after the file watcher effect (after line 83, before the open-dialog listener):

```tsx
  // Auto-fetch: periodically run git fetch in background
  useEffect(() => {
    if (!repoPath) return;

    const autoFetchEnabled = localStorage.getItem("gitflowAutoFetch") !== "false";
    if (!autoFetchEnabled) return;

    const minutes = Number(localStorage.getItem("gitflowFetchIntervalMinutes") || "10");
    const safeMinutes = Number.isFinite(minutes) ? Math.min(60, Math.max(5, minutes)) : 10;
    const intervalMs = safeMinutes * 60_000;

    const runFetch = () => {
      api.remote.fetch(repoPath).then(() => {
        scheduleInvalidate(["git", repoPath, "sync-status"]);
        scheduleInvalidate(["git", repoPath, "branches"]);
      }).catch(() => {
        // Silently ignore — network errors are transient
      });
    };

    // Initial fetch after a short delay (don't block repo open)
    const initialTimer = window.setTimeout(runFetch, 5_000);

    const interval = window.setInterval(runFetch, intervalMs);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [repoPath, scheduleInvalidate]);
```

- [ ] **Step 3: Verify type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/layouts/MainLayout.tsx
git commit -m "feat: add background auto-fetch with configurable interval"
```

---

## Part B: Revert Commit

### Task 2: Add revert_commit Rust command

**Files:**
- Modify: `src-tauri/src/commands/commit.rs`

- [ ] **Step 1: Add revert_commit function at the end of commit.rs**

Append after the `commit_changes` function (after line 176):

```rust
#[tauri::command]
pub async fn revert_commit(path: String, commit_hash: String) -> Result<String, String> {
    let output = Command::new("git")
        .args([
            "--no-pager",
            "-C",
            &path,
            "revert",
            &commit_hash,
            "--no-edit",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run git revert: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let short = stdout
            .lines()
            .last()
            .unwrap_or("Reverted")
            .trim()
            .to_string();
        Ok(short)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stderr_str = stderr.trim();

        // Check for merge commit error
        if stderr_str.contains("is a merge") {
            return Err("Cannot revert merge commit. Use git revert -m 1 manually.".to_string());
        }

        // Check for conflict
        if stderr_str.contains("CONFLICT") || stderr_str.contains("could not apply") {
            return Err(format!("Revert conflict: {}", stderr_str));
        }

        Err(format!("Revert failed: {}", stderr_str))
    }
}
```

- [ ] **Step 2: Register in lib.rs invoke_handler**

In `src-tauri/src/lib.rs`, after line 235 (`commands::commit::commit_changes,`), add:

```rust
            commands::commit::revert_commit,
```

- [ ] **Step 3: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/commit.rs src-tauri/src/lib.rs
git commit -m "feat: add revert_commit Tauri command"
```

---

### Task 3: Add frontend API wrapper

**Files:**
- Modify: `apps/desktop/src/api/tauri.ts`

- [ ] **Step 1: Add revert to the commit API object**

In the `api.commit` object (around line 181-196), add after the `commit` entry:

```typescript
    revert: (path: string, commitHash: string) =>
      invoke<string>("revert_commit", { path, commitHash }),
```

- [ ] **Step 2: Verify type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/api/tauri.ts
git commit -m "feat: add api.commit.revert() wrapper"
```

---

### Task 4: Add Revert button to CommitDetail

**Files:**
- Modify: `apps/desktop/src/components/features/commit-detail/CommitDetail.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports:

```tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/tauri";
import { RotateCcw } from "lucide-react";
```

Note: `RotateCcw` is already imported from lucide-react — verify before adding. `useState` may need to be added.

- [ ] **Step 2: Add state and handler inside CommitDetail component**

After the existing hooks (around line 30), add:

```tsx
  const queryClient = useQueryClient();
  const [reverting, setReverting] = useState(false);

  const handleRevert = async () => {
    if (!repoPath || !selectedCommit) return;
    if (!confirm(`Revert commit ${selectedCommit.slice(0, 7)}? This will create a new commit that undoes the changes.`)) return;
    setReverting(true);
    try {
      const result = await api.commit.revert(repoPath, selectedCommit);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      alert(result);
    } catch (e: any) {
      alert(`Revert failed: ${e}`);
    } finally {
      setReverting(false);
    }
  };
```

- [ ] **Step 3: Add Revert button to the commit metadata area**

After the parents line (after line 89, before the closing `</div>` of the metadata section), add:

```tsx
        <button
          onClick={handleRevert}
          disabled={reverting}
          className="flex items-center gap-1.5 px-2 py-1 mt-1 text-2xs font-medium text-text-muted hover:text-text-primary bg-surface-2-40 hover:bg-surface-2 border border-border-40 rounded-mac transition-all cursor-pointer disabled:opacity-40"
          title="Revert this commit (creates a new undo commit)"
        >
          <RotateCcw size={11} className={reverting ? "animate-spin" : ""} />
          {reverting ? "Reverting..." : "Revert commit"}
        </button>
```

- [ ] **Step 4: Verify type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/features/commit-detail/CommitDetail.tsx
git commit -m "feat: add revert commit button to commit detail panel"
```

---

### Task 5: Add Revert to CommitGraph context menu

**Files:**
- Modify: `apps/desktop/src/components/features/graph/CommitGraph.tsx`

- [ ] **Step 1: Read the current context menu items area**

The context menu items are defined around lines 275-303. We need to add a "Revert commit" item.

- [ ] **Step 2: Add revert handler function**

Find the existing handler functions (checkoutCommit, createBranchFromCommit, etc.) and add:

```tsx
  const revertCommit = async (hash: string) => {
    if (!repoPath) return;
    if (!confirm(`Revert commit ${hash.slice(0, 7)}? This will create a new commit that undoes the changes.`)) return;
    try {
      await api.commit.revert(repoPath, hash);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    } catch (e: any) {
      alert(`Revert failed: ${e}`);
    }
  };
```

- [ ] **Step 3: Add Revert item to ctxItems array**

After the cherry-pick item (after line 302), add:

```tsx
        {
          label: "Revert commit",
          icon: <RotateCcw size={13} />,
          action: () => revertCommit(ctxMenu.hash),
        },
```

Also add `RotateCcw` to the lucide-react imports at the top of the file.

- [ ] **Step 4: Verify type check**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/features/graph/CommitGraph.tsx
git commit -m "feat: add revert commit to graph context menu"
```

---

## Self-Review Checklist

**Spec coverage:** Task 1 → Auto-fetch background interval. Task 2 → Revert Rust command. Task 3 → API wrapper. Task 4 → CommitDetail UI. Task 5 → Context menu.

**Placeholder scan:** All steps have complete code, no TBDs.

**Type consistency:** `api.commit.revert(path, hash)` matches existing pattern. Rust command uses `Result<String, String>` like all other commit commands.

**Settings UI:** Already exists in SettingsDialog.tsx — no changes needed.
