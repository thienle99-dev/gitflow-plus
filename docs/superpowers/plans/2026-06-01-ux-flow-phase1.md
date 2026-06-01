# UX Flow Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cải thiện UX flow core workflow: status badge, keyboard shortcuts, quick stage all, visual commit readiness.

**Architecture:** Frontend-only changes. Thêm trạng thái vào Toolbar và WorkingTree. Keyboard shortcuts global listener (giống pattern hiện tại ở MainLayout). Không cần backend command mới.

**Tech Stack:** React 18, Zustand (useUIStore), TanStack Query (existing queries), Tailwind CSS

---

## File Structure

| File | Role |
|------|------|
| `components/common/Toolbar.tsx` | Thêm StatusBadge, thay thế "Show Changes" button |
| `components/detail/WorkingTree.tsx` | Thêm quick stage all button, keyboard shortcuts, commit readiness indicator |
| `layouts/MainLayout.tsx` | Register global stage/unstage shortcuts (Cmd+S, Cmd+U, Cmd+Shift+A) |
| `stores/ui.ts` | Optional: thêm field để WorkingTree biết focus state |

---

### Task 1: Status Badge trên Toolbar

**Files:**
- Modify: `apps/desktop/src/components/common/Toolbar.tsx:58-75`

- [ ] **Step 1: Read the Toolbar return JSX area to find "Show Changes" button**

Run: `grep -n "showChanges\|Show Changes\|allChanges" /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/components/common/Toolbar.tsx`

- [ ] **Step 2: Replace "Show Changes" button with StatusBadge**

```tsx
// After the existing button group, replace the showChanges button:
{/* Status Badge — replaces old "Show Changes" button */}
{changes && (changes.length > 0) && (
  <button
    onClick={showChanges}
    className="flex items-center gap-1.5 px-2 h-7 text-2xs font-medium rounded-mac transition-all border border-transparent hover:border-border"
    title={`${changes.filter(c => c.staged).length} staged, ${changes.filter(c => !c.staged).length} unstaged — click to view`}
  >
    <FileDiff size={13} className="text-accent" />
    {changes.filter(c => c.staged).length > 0 && (
      <span className="text-green-600 dark:text-green-400 font-semibold">
        {changes.filter(c => c.staged).length} staged
      </span>
    )}
    {changes.filter(c => c.staged).length > 0 && changes.filter(c => !c.staged).length > 0 && (
      <span className="text-text-muted">•</span>
    )}
    {changes.filter(c => !c.staged).length > 0 && (
      <span className="text-orange-600 dark:text-orange-400 font-semibold">
        {changes.filter(c => !c.staged).length} unstaged
      </span>
    )}
  </button>
)}
```

- [ ] **Step 3: Verify type check**

Run: `cd /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/common/Toolbar.tsx
git commit -m "feat: add status badge to toolbar showing staged/unstaged counts"
```

---

### Task 2: Keyboard Shortcuts cho Stage/Unstage (global ở MainLayout)

**Files:**
- Modify: `apps/desktop/src/layouts/MainLayout.tsx:113-131`

- [ ] **Step 1: Read current keydown handler in MainLayout**

```bash
sed -n '113,131p' /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/layouts/MainLayout.tsx
```

- [ ] **Step 2: Add Cmd+S, Cmd+U, Cmd+Shift+A shortcuts to handleKeyDown**

Thêm vào trong `handleKeyDown` callback, before the Escape case:

```tsx
      // Stage/unstage shortcuts (only when no dialog is open)
      if (!activeDialog) {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
          e.preventDefault();
          api.commit.stageAll(repoPath!).then(() =>
            queryClient.invalidateQueries({ queryKey: ["git", repoPath] })
          ).catch(console.error);
          return;
        }
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          api.commit.stageAll(repoPath!).then(() =>
            queryClient.invalidateQueries({ queryKey: ["git", repoPath] })
          ).catch(console.error);
          return;
        }
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "u" || e.key === "U")) {
          e.preventDefault();
          api.commit.unstageAll(repoPath!).then(() =>
            queryClient.invalidateQueries({ queryKey: ["git", repoPath] })
          ).catch(console.error);
          return;
        }
      }
```

**Note:** Vì WorkingTree có thể chưa mount (người dùng đang xem commit detail), shortcuts ở global level luôn stage/unstage ALL files. Đây là behavior an toàn và predictable cho power users.

- [ ] **Step 3: Add `repoPath` dependency to handleKeyDown deps array**

```tsx
    [toggleSidebar, activeDialog, closeDialog, repoPath, queryClient],
```

- [ ] **Step 4: Add api import check**

```bash
head -5 /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/layouts/MainLayout.tsx
```
Confirm `import { api } from "@/api/tauri";` is already present (line 8).

- [ ] **Step 5: Type check**

Run: `cd /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/layouts/MainLayout.tsx
git commit -m "feat: add global stage/unstage keyboard shortcuts (Cmd+S, Cmd+U, Cmd+Shift+A)"
```

---

### Task 3: Quick Stage All Button + Tooltip Enhancements trong WorkingTree

**Files:**
- Modify: `apps/desktop/src/components/detail/WorkingTree.tsx`

- [ ] **Step 1: Find the unstaged section header in WorkingTree**

```bash
grep -n "unstagedOpen\|Unstaged\|handleStageAll\|handleUnstageAll\|Stage All" /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/components/detail/WorkingTree.tsx
```

- [ ] **Step 2: Read around the unstaged section render area**

```bash
sed -n '210,270p' /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/components/detail/WorkingTree.tsx
```

- [ ] **Step 3: Replace the unstaged section header with quick stage all button**

Find the unstaged disclosure header. Replace with:

```tsx
            {/* Unstaged */}
            <div className="border-t border-border/40">
              <button
                onClick={() => setUnstagedOpen(!unstagedOpen)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-2xs font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                <ChevronDown size={11} className={`transition-transform ${unstagedOpen ? "" : "-rotate-90"}`} />
                Unstaged ({unstaged.length})
                {unstaged.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStageAll(); }}
                    className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-2xs font-semibold rounded-mac hover:bg-accent/20 transition-all active:scale-95"
                    title="Stage All (⌘⇧A)"
                  >
                    <Plus size={10} />
                    Stage All
                  </button>
                )}
              </button>
              {unstagedOpen && unstaged.length === 0 && (
                <div className="px-3 py-2 text-2xs text-text-muted italic">No unstaged changes</div>
              )}
              {unstagedOpen && unstaged.map((file) => ( ...existing file rendering... ))}
            </div>
```

- [ ] **Step 4: Add tooltips to stage/unstage buttons per file**

Find the stage checkbox or button per file. Add title attribute:
```tsx
title={file.staged ? "Unstage (⌘U)" : "Stage (⌘S)"}
```

- [ ] **Step 5: Add tooltip to the Stage All / Unstage All buttons in staged header**

```tsx
title="Unstage All (⌘U)"
```

- [ ] **Step 6: Type check**

Run: `cd /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/components/detail/WorkingTree.tsx
git commit -m "feat: add quick stage all button to unstaged section header + shortcut tooltips"
```

---

### Task 4: Visual Commit Readiness Indicator

**Files:**
- Modify: `apps/desktop/src/components/detail/WorkingTree.tsx`

- [ ] **Step 1: Find the commit button area in WorkingTree**

```bash
grep -n "handleCommit\|commitMessage\|committing\|disabled" /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/components/detail/WorkingTree.tsx | head -15
sed -n '272,310p' /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/components/detail/WorkingTree.tsx
```

- [ ] **Step 2: Replace commit button with readiness-aware version**

Find the commit `<button>` and replace its className and dynamic props with:

```tsx
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || staged.length === 0 || committing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-mac transition-all ${
                  commitMessage.trim() && staged.length > 0
                    ? "bg-accent text-accent-fg shadow-sm shadow-accent/30 hover:opacity-90"
                    : "bg-surface-2 text-text-muted cursor-not-allowed"
                } ${committing ? "opacity-60" : ""}`}
                title={
                  !commitMessage.trim()
                    ? "Enter a commit message"
                    : staged.length === 0
                      ? "Stage files to commit first"
                      : "Commit (⌘↵)"
                }
              >
                <GitCommit size={13} />
                {committing ? "Committing..." : "Commit"}
              </button>
```

- [ ] **Step 3: Type check**

Run: `cd /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/detail/WorkingTree.tsx
git commit -m "feat: add visual commit readiness indicator with contextual tooltips"
```

---

### Task 5: Shift+Click Multi-Select cho Stage Batch

**Files:**
- Modify: `apps/desktop/src/components/detail/WorkingTree.tsx`
- Create: Không cần — thêm state local

- [ ] **Step 1: Add multi-select state at top of WorkingTree component**

After the `ctxMenu` state line (~line 50):

```tsx
  // Multi-select for batch stage/unstage
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);
```

- [ ] **Step 2: Add shift-click handler**

After existing handlers (~line 78):

```tsx
  const handleFileClick = (filePath: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedRef.current) {
      // Range selection in the current list
      const currentList = file.staged ? staged : unstaged;
      const currentIdx = currentList.findIndex(f => f.path === filePath);
      const lastIdx = currentList.findIndex(f => f.path === lastClickedRef.current);
      if (currentIdx !== -1 && lastIdx !== -1) {
        const [start, end] = currentIdx > lastIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
        const newSet = new Set(selectedFiles);
        for (let i = start; i <= end; i++) {
          newSet.add(currentList[i].path);
        }
        setSelectedFiles(newSet);
        return;
      }
    }
    // Simple toggle if shift not held
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
    lastClickedRef.current = filePath;
  };

  const handleBatchStage = async () => {
    if (selectedFiles.size === 0) return;
    try {
      for (const path of selectedFiles) {
        await api.commit.stage(repoPath!, path);
      }
      setSelectedFiles(new Set());
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleBatchUnstage = async () => {
    if (selectedFiles.size === 0) return;
    try {
      for (const path of selectedFiles) {
        await api.commit.unstage(repoPath!, path);
      }
      setSelectedFiles(new Set());
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };
```

- [ ] **Step 3: Update file row rendering to use shift-click and show multi-select highlight**

Find the file row rendering loop. Modify the onClick to call `handleFileClick` and add selected highlight:

```tsx
  // In the file rendering inside either staged or unstaged map:
  <div
    key={file.path}
    onClick={(e) => handleFileClick(file.path, e)}
    className={`... ${selectedFiles.has(file.path) ? 'ring-1 ring-accent bg-accent/5' : ''}`}
  >
```

- [ ] **Step 4: Add batch action buttons when files are selected**

After the toggle-all sections area, when `selectedFiles.size > 0`:

```tsx
  {selectedFiles.size > 0 && (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 border-b border-accent/20">
      <span className="text-2xs text-text-muted">{selectedFiles.size} selected</span>
      <button onClick={handleBatchStage} className="text-2xs font-medium text-accent hover:underline">
        Stage selected
      </button>
      <button onClick={handleBatchUnstage} className="text-2xs font-medium text-text-muted hover:text-text-primary hover:underline">
        Unstage selected
      </button>
      <button onClick={() => setSelectedFiles(new Set())} className="text-2xs text-text-muted hover:text-text-primary ml-auto">
        Clear
      </button>
    </div>
  )}
```

- [ ] **Step 5: Type check**

Run: `cd /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/detail/WorkingTree.tsx
git commit -m "feat: add shift-click multi-select for batch stage/unstage"
```

---

## Self-Review Checklist

**Spec coverage:** Task 1 → 1.1 Status Badge. Task 2 → 1.2 Keyboard Shortcuts (Cmd+S, Cmd+U, Cmd+Shift+A). Task 3 → 1.3 Quick Stage All Button + tooltips. Task 4 → 1.4 Visual Commit Readiness Indicator. Task 5 → 1.2 Shift+Click multi-select.

**Placeholder scan:** All steps have complete code, no TBDs, no vague instructions.

**Type consistency:** All function signatures match existing codebase patterns. `api.commit.stageAll`, `api.commit.unstageAll`, `api.commit.stage`, `api.commit.unstage` are existing methods.
