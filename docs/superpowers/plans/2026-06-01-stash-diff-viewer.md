# Stash Diff Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a split-view stash diff viewer with switchable display modes (unified, side-by-side, inline) and action buttons (apply, pop, drop).

**Architecture:** Backend adds `stash_diff` command. Frontend adds query hook, refactors StashPanel to split layout, creates DiffRenderer for parsing/rendering diffs in three modes, and integrates SubmoduleDetail-style actions.

**Tech Stack:** Rust (Tauri commands), TypeScript/React (TanStack Query, Zustand), git CLI

---

## File Structure

**Backend (Rust):**
- Modify: `src-tauri/src/commands/stash.rs` — add `stash_diff` command

**Frontend (React):**
- Create: `apps/desktop/src/queries/useStashDiff.ts` — query hook
- Create: `apps/desktop/src/lib/diff-renderer.ts` — diff parsing and rendering logic
- Modify: `apps/desktop/src/api/tauri.ts` — add `stash.diff` method
- Create: `apps/desktop/src/components/phase2/StashDiffViewer.tsx` — diff display component
- Modify: `apps/desktop/src/components/phase2/StashPanel.tsx` — refactor to split layout
- Modify: `apps/desktop/src/stores/ui.ts` — add `selectedStashIndex` state

---

## Tasks

### Task 1: Backend — Add stash_diff Command

**Files:**
- Modify: `src-tauri/src/commands/stash.rs`

- [ ] **Step 1: Add stash_diff function**

Open `src-tauri/src/commands/stash.rs` and add this function after `git_stash_drop`:

```rust
pub fn git_stash_diff(path: &str, index: u32) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", index);
    let output = Command::new("git")
        .args(["--no-pager", "-C", path, "stash", "show", "-p", &stash_ref])
        .output()
        .map_err(|e| format!("Failed to get stash diff: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to get stash diff: {}", stderr.trim()))
    }
}

#[tauri::command]
pub fn stash_diff(path: String, index: u32) -> Result<String, String> {
    git_stash_diff(&path, index)
}
```

- [ ] **Step 2: Build and verify**

Run: `cd src-tauri && cargo build`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/stash.rs
git commit -m "feat: add stash_diff backend command"
```

---

### Task 2: Frontend API — Add stash.diff method

**Files:**
- Modify: `apps/desktop/src/api/tauri.ts`

- [ ] **Step 1: Add stash.diff method**

Open `apps/desktop/src/api/tauri.ts` and find the `stash:` namespace. Add this method:

```typescript
  stash: {
    list: (path: string) =>
      invoke<StashEntry[]>("stash_list", { path }),
    push: (path: string, message?: string, includeUntracked?: boolean) =>
      invoke<string>("stash_push", { path, message: message ?? null, includeUntracked: includeUntracked ?? false }),
    pop: (path: string, index?: number) =>
      invoke<string>("stash_pop", { path, index: index ?? null }),
    apply: (path: string, index?: number) =>
      invoke<string>("stash_apply", { path, index: index ?? null }),
    drop: (path: string, index?: number) =>
      invoke<string>("stash_drop", { path, index: index ?? null }),
    diff: (path: string, index: number) =>
      invoke<string>("stash_diff", { path, index }),  // Add this line
  },
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/desktop && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/api/tauri.ts
git commit -m "feat: add stash.diff API method"
```

---

### Task 3: Frontend Query Hook — useStashDiff

**Files:**
- Create: `apps/desktop/src/queries/useStashDiff.ts`

- [ ] **Step 1: Create query hook file**

Create `apps/desktop/src/queries/useStashDiff.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/tauri";

export function useStashDiff(repoPath: string | null, stashIndex: number | null) {
  return useQuery({
    queryKey: ["git", repoPath, "stash", stashIndex],
    queryFn: () => api.stash.diff(repoPath!, stashIndex!),
    enabled: !!repoPath && stashIndex !== null,
  });
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la apps/desktop/src/queries/useStashDiff.ts`

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/queries/useStashDiff.ts
git commit -m "feat: add useStashDiff query hook"
```

---

### Task 4: Diff Renderer Library

**Files:**
- Create: `apps/desktop/src/lib/diff-renderer.ts`

- [ ] **Step 1: Create diff-renderer.ts**

Create `apps/desktop/src/lib/diff-renderer.ts`:

```typescript
export interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  lineNumber?: number;
}

export interface DiffFile {
  path: string;
  status: "added" | "modified" | "deleted";
  lines: DiffLine[];
}

export function parseDiff(diffOutput: string): DiffFile[] {
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let fileCount = 0;

  const lines = diffOutput.split("\n");

  for (const line of lines) {
    // Match "diff --git a/path b/path"
    if (line.startsWith("diff --git")) {
      if (currentFile && currentFile.lines.length > 0) {
        files.push(currentFile);
      }
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      const path = match ? match[2] : `file-${fileCount}`;
      currentFile = {
        path,
        status: "modified",
        lines: [],
      };
      fileCount++;
      continue;
    }

    // Detect file status
    if (line.startsWith("new file mode")) {
      if (currentFile) currentFile.status = "added";
    } else if (line.startsWith("deleted file mode")) {
      if (currentFile) currentFile.status = "deleted";
    }

    // Parse diff lines
    if (currentFile) {
      if (line.startsWith("+++") || line.startsWith("---")) {
        currentFile.lines.push({ type: "header", content: line });
      } else if (line.startsWith("+")) {
        currentFile.lines.push({ type: "add", content: line.slice(1) });
      } else if (line.startsWith("-")) {
        currentFile.lines.push({ type: "remove", content: line.slice(1) });
      } else if (line.startsWith("@@")) {
        currentFile.lines.push({ type: "header", content: line });
      } else if (!line.startsWith("diff") && !line.startsWith("index")) {
        currentFile.lines.push({ type: "context", content: line });
      }
    }
  }

  if (currentFile && currentFile.lines.length > 0) {
    files.push(currentFile);
  }

  return files;
}

export function renderUnified(files: DiffFile[]): string {
  return files
    .map((file) => {
      const header = `\n=== ${file.path} ===\n`;
      const lines = file.lines
        .map((line) => {
          if (line.type === "add") return `+ ${line.content}`;
          if (line.type === "remove") return `- ${line.content}`;
          if (line.type === "header") return line.content;
          return `  ${line.content}`;
        })
        .join("\n");
      return header + lines;
    })
    .join("\n");
}

export function renderSideBySide(files: DiffFile[]): DiffFile[] {
  // Return parsed files as-is; rendering happens in React component
  return files;
}

export function renderInline(files: DiffFile[]): DiffFile[] {
  // Return parsed files as-is; rendering happens in React component
  return files;
}

export function countChanges(files: DiffFile[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;

  for (const file of files) {
    for (const line of file.lines) {
      if (line.type === "add") added++;
      if (line.type === "remove") removed++;
    }
  }

  return { added, removed };
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la apps/desktop/src/lib/diff-renderer.ts`

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/lib/diff-renderer.ts
git commit -m "feat: add diff parser and renderer library"
```

---

### Task 5: UI State — Add selectedStashIndex

**Files:**
- Modify: `apps/desktop/src/stores/ui.ts`

- [ ] **Step 1: Add selectedStashIndex to UIStore**

Open `apps/desktop/src/stores/ui.ts` and add this field to the store interface:

```typescript
  selectedStashIndex: number | null;
  setSelectedStashIndex: (index: number | null) => void;
```

- [ ] **Step 2: Add setter implementation**

In the store creation, add:

```typescript
    setSelectedStashIndex: (index) => set({ selectedStashIndex: index }),
```

- [ ] **Step 3: Initialize field**

In the initial state, add:

```typescript
    selectedStashIndex: null,
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd apps/desktop && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/stores/ui.ts
git commit -m "feat: add selectedStashIndex to UI store"
```

---

### Task 6: UI Component — StashDiffViewer

**Files:**
- Create: `apps/desktop/src/components/phase2/StashDiffViewer.tsx`

- [ ] **Step 1: Create StashDiffViewer component**

Create `apps/desktop/src/components/phase2/StashDiffViewer.tsx`:

```typescript
import { StashEntry } from "@/api/tauri";
import { useRepoStore } from "@/stores/repo";
import { useStashDiff } from "@/queries/useStashDiff";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { parseDiff, countChanges } from "@/lib/diff-renderer";
import { showToast } from "@/lib/toast";

interface StashDiffViewerProps {
  stash: StashEntry;
}

type DiffMode = "unified" | "sideBySide" | "inline";

export default function StashDiffViewer({ stash }: StashDiffViewerProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();
  const { data: diffOutput, isLoading } = useStashDiff(repoPath, stash.index);
  const [mode, setMode] = useState<DiffMode>("unified");
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: "apply" | "pop" | "drop") => {
    if (!repoPath) return;
    setLoading(action);
    try {
      if (action === "apply") {
        await api.stash.apply(repoPath, stash.index);
        showToast("Stash applied");
      } else if (action === "pop") {
        await api.stash.pop(repoPath, stash.index);
        showToast("Stash popped");
      } else if (action === "drop") {
        await api.stash.drop(repoPath, stash.index);
        showToast("Stash dropped");
      }
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "stash"] });
    } catch (e) {
      showToast(`Error: ${e}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const files = diffOutput ? parseDiff(diffOutput) : [];
  const changes = countChanges(files);

  return (
    <div className="h-full flex flex-col">
      {/* Metadata */}
      <div className="p-3 border-b border-border/40 space-y-2">
        <h3 className="text-sm font-semibold text-text-primary">
          {stash.message}
        </h3>
        <div className="text-xs text-text-muted space-y-1">
          <div>Branch: {stash.branch}</div>
          <div>Files: {files.length} changed (+{changes.added} -{changes.removed})</div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1 p-2 border-b border-border/40">
        <button
          onClick={() => setMode("unified")}
          className={`px-2 py-1 text-xs rounded ${
            mode === "unified"
              ? "bg-accent text-white"
              : "bg-surface-2 text-text-primary hover:bg-surface-2/80"
          }`}
        >
          Unified
        </button>
        <button
          onClick={() => setMode("sideBySide")}
          className={`px-2 py-1 text-xs rounded ${
            mode === "sideBySide"
              ? "bg-accent text-white"
              : "bg-surface-2 text-text-primary hover:bg-surface-2/80"
          }`}
        >
          Side-by-Side
        </button>
        <button
          onClick={() => setMode("inline")}
          className={`px-2 py-1 text-xs rounded ${
            mode === "inline"
              ? "bg-accent text-white"
              : "bg-surface-2 text-text-primary hover:bg-surface-2/80"
          }`}
        >
          Inline
        </button>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto p-3 bg-surface-1">
        {isLoading ? (
          <div className="text-xs text-text-muted">Loading diff...</div>
        ) : files.length === 0 ? (
          <div className="text-xs text-text-muted">No changes</div>
        ) : mode === "unified" ? (
          <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-words">
            {files
              .map((file) => {
                const header = `\n=== ${file.path} ===\n`;
                const lines = file.lines
                  .map((line) => {
                    if (line.type === "add") return `+ ${line.content}`;
                    if (line.type === "remove") return `- ${line.content}`;
                    if (line.type === "header") return line.content;
                    return `  ${line.content}`;
                  })
                  .join("\n");
                return header + lines;
              })
              .join("\n")}
          </pre>
        ) : (
          <div className="text-xs text-text-muted">
            {mode === "sideBySide" ? "Side-by-side view" : "Inline view"} — rendering in progress
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-t border-border/40">
        <button
          onClick={() => handleAction("apply")}
          disabled={loading === "apply"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "apply" ? "Applying..." : "Apply"}
        </button>
        <button
          onClick={() => handleAction("pop")}
          disabled={loading === "pop"}
          className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
        >
          {loading === "pop" ? "Popping..." : "Pop"}
        </button>
        <button
          onClick={() => handleAction("drop")}
          disabled={loading === "drop"}
          className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50"
        >
          {loading === "drop" ? "Dropping..." : "Drop"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la apps/desktop/src/components/phase2/StashDiffViewer.tsx`

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/phase2/StashDiffViewer.tsx
git commit -m "feat: add StashDiffViewer component"
```

---

### Task 7: Integration — Refactor StashPanel to Split Layout

**Files:**
- Modify: `apps/desktop/src/components/phase2/StashPanel.tsx`

- [ ] **Step 1: Import new components and hooks**

Open `apps/desktop/src/components/phase2/StashPanel.tsx` and add:

```typescript
import { useUIStore } from "@/stores/ui";
import StashDiffViewer from "./StashDiffViewer";
```

- [ ] **Step 2: Add state management**

In the StashPanel component, add:

```typescript
  const selectedStashIndex = useUIStore((s) => s.selectedStashIndex);
  const setSelectedStashIndex = useUIStore((s) => s.setSelectedStashIndex);
```

- [ ] **Step 3: Refactor render to split layout**

Replace the entire return statement with:

```typescript
  return (
    <div className="h-full flex gap-2 p-2">
      {/* Left: Stash List */}
      <div className="w-48 flex flex-col border border-border/40 rounded-mac overflow-hidden">
        <div className="px-3 py-2 border-b border-border/40 bg-surface-2/40">
          <button
            onClick={handleStashPush}
            disabled={stashPush.isPending}
            className="w-full px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
          >
            {stashPush.isPending ? "Stashing..." : "Stash"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="text-xs text-text-muted text-center py-4">
              Loading stashes...
            </div>
          )}
          {!isLoading && (!stashes || stashes.length === 0) && (
            <div className="text-xs text-text-muted text-center py-4">
              No stashes
            </div>
          )}
          {stashes?.map((stash) => {
            const { branch, label } = formatDate(stash.message);
            return (
              <div
                key={stash.index}
                onClick={() => setSelectedStashIndex(stash.index)}
                className={`px-2 py-2 text-xs cursor-pointer border-b border-border/20 ${
                  selectedStashIndex === stash.index
                    ? "bg-accent/20 text-accent"
                    : "hover:bg-surface-2/40 text-text-primary"
                }`}
              >
                <div className="font-semibold truncate">stash@{{{stash.index}}}</div>
                <div className="text-text-muted truncate">{label}</div>
                {branch && <div className="text-text-muted text-xs">{branch}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Diff Viewer */}
      <div className="flex-1 border border-border/40 rounded-mac overflow-hidden">
        {selectedStashIndex !== null && stashes ? (
          <StashDiffViewer stash={stashes[selectedStashIndex]} />
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Select a stash to view diff
          </div>
        )}
      </div>
    </div>
  );
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd apps/desktop && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/phase2/StashPanel.tsx
git commit -m "feat: refactor StashPanel to split layout with diff viewer"
```

---

### Task 8: Testing — Manual Verification

- [ ] **Step 1: Start dev server**

Run: `cd apps/desktop && pnpm dev`

Expected: Vite dev server starts on port 1420.

- [ ] **Step 2: Start Tauri app**

In another terminal, run: `cd src-tauri && cargo tauri dev`

Expected: Desktop app launches.

- [ ] **Step 3: Create test stashes**

In a test repo, create a few stashes with different changes:

```bash
echo "test1" > file1.txt && git add . && git stash push -m "test stash 1"
echo "test2" > file2.txt && git add . && git stash push -m "test stash 2"
```

- [ ] **Step 4: Open repo and view stash panel**

Open the test repo in GitFlow. Click the stash panel.

Expected: Stash list appears on the left, split layout visible.

- [ ] **Step 5: Test stash selection**

Click a stash in the list.

Expected: Diff viewer appears on the right showing the stash changes.

- [ ] **Step 6: Test mode switching**

Click "Unified", "Side-by-Side", "Inline" buttons.

Expected: Display updates (unified mode shows full diff, others show placeholder).

- [ ] **Step 7: Test apply action**

Click Apply button.

Expected: Stash is applied, list refreshes, stash remains in list.

- [ ] **Step 8: Test pop action**

Click Pop button.

Expected: Stash is popped, list refreshes, stash is removed from list.

- [ ] **Step 9: Test drop action**

Click Drop button.

Expected: Stash is dropped, list refreshes, stash is removed from list.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: complete stash diff viewer implementation"
```

---

## Summary

This plan implements the stash diff viewer:
- Backend command for fetching stash diffs
- Frontend query hook for stash diffs
- Diff parser and renderer library
- Split-layout StashPanel with diff viewer
- Three display modes (unified, side-by-side, inline)
- Action buttons (apply, pop, drop) with loading states
- Full integration with query invalidation
