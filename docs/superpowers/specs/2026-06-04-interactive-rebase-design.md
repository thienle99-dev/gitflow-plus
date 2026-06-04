# Interactive Rebase UI — Design Spec

## Goal

Add a visual interactive rebase editor to GitFlow Desktop. Users right-click a commit on the graph, select "Rebase from here...", and get a drag-and-drop dialog to reorder, squash, edit, reword, fixup, or drop commits before executing the rebase.

## User Flow

```
Right-click commit on graph
  → "Rebase from here..."
    → InteractiveRebaseDialog opens
      → Fetches commits from selected commit to HEAD via api.rebase.todoList
      → User can:
         • Drag to reorder commits
         • Change action per commit: pick / squash / edit / reword / fixup / drop
         • Edit commit message inline (for reword/squash)
      → Click "Start Rebase"
        → api.rebase.start executes
          → Success: toast + refresh graph + close dialog
          → Conflicts: show conflict resolution UI (continue/skip/abort)
```

## Architecture

### Files to Create

| File | Purpose |
|------|---------|
| `apps/desktop/src/queries/useGitRebase.ts` | React Query hooks wrapping `api.rebase.*` |
| `apps/desktop/src/components/features/dialogs/InteractiveRebaseDialog.tsx` | Main dialog component |

### Files to Modify

| File | Change |
|------|--------|
| `apps/desktop/src/stores/ui.ts` | Add `rebaseTargetCommit: string \| null` state |
| `apps/desktop/src/components/features/graph/CommitGraph.tsx` | Add "Rebase from here..." context menu item |
| `apps/desktop/src/layouts/MainLayout.tsx` | Register lazy import + dialog entry |
| `apps/desktop/src/components/layout/BottomBar.tsx` | Show rebase-in-progress indicator |

### Backend (already complete)

| Command | API | Status |
|---------|-----|--------|
| `rebase_todo_list` | `api.rebase.todoList(path, base)` | ✅ Exists |
| `rebase_start` | `api.rebase.start(path, base, todos)` | ✅ Exists |
| `rebase_continue` | `api.rebase.continue(path)` | ✅ Exists |
| `rebase_skip` | `api.rebase.skip(path)` | ✅ Exists |
| `rebase_abort` | `api.rebase.abort(path)` | ✅ Exists |
| `rebase_status` | `api.rebase.status(path)` | ✅ Exists |

### Type Definitions (from backend)

```ts
// Already defined in src-tauri/src/commands/rebase.rs
interface RebaseTodo {
  action: string;       // "pick" | "squash" | "edit" | "drop" | "reword" | "fixup"
  commit_hash: string;
  message: string;
}

interface RebaseResult {
  success: boolean;
  message: string;
  conflicted_files: string[];
}
```

## Component Design

### `useGitRebase.ts`

Follows the same pattern as `useGitMerge.ts`:

```ts
// Hook to fetch the todo list for a given base commit
export function useRebaseTodoList(repoPath: string | null, base: string | null)

// Mutation to start the interactive rebase
export function useRebaseStart(repoPath: string | null)

// Mutations for conflict resolution
export function useRebaseContinue(repoPath: string | null)
export function useRebaseSkip(repoPath: string | null)
export function useRebaseAbort(repoPath: string | null)

// Query to check rebase status (conflicted files)
export function useRebaseStatus(repoPath: string | null)
```

### `InteractiveRebaseDialog.tsx`

Props:
```ts
interface InteractiveRebaseDialogProps {
  open: boolean;
  baseCommit: string;  // The commit hash the user right-clicked
  onClose: () => void;
}
```

Internal state:
```ts
const [todos, setTodos] = useState<RebaseTodo[]>([]);  // Ordered list from API
const [rebaseInProgress, setRebaseInProgress] = useState(false);
const [conflictedFiles, setConflictedFiles] = useState<string[]>([]);
```

UI Sections:

**1. Commit List (drag-and-drop)**
- Each row shows: drag handle, action dropdown, short hash, commit message
- Drag handle on the left for reordering
- Action dropdown: `pick` (default), `squash`, `fixup`, `reword`, `edit`, `drop`
- For `reword`/`squash`: inline editable message field appears below the row
- `drop` rows get a strikethrough + muted style
- No external DnD library needed — use HTML5 Drag and Drop API (already works well for simple lists)

**2. Action Legend**
- Small collapsible section explaining each action (pick, squash, edit, reword, fixup, drop)

**3. Footer Buttons**
- "Cancel" — closes dialog
- "Start Rebase" — calls `api.rebase.start` with reordered/modified todos
- Disabled when all commits are dropped or list is empty

**4. Conflict Resolution Mode** (shown after rebase starts with conflicts)
- Header changes to "Rebase in Progress — Conflicts Detected"
- Shows list of conflicted files
- Three buttons: "Continue" / "Skip Commit" / "Abort Rebase"
- Continue calls `api.rebase.continue`, skip calls `api.rebase.skip`, abort calls `api.rebase.abort`

### Drag-and-Drop Implementation

Using HTML5 Drag and Drop (no library):

```tsx
<li
  draggable
  onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(index)); }}
  onDragOver={(e) => { e.preventDefault(); }}
  onDrop={(e) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    reorder(fromIndex, index);
  }}
>
```

The `reorder` function moves the item in the `todos` array and updates state.

### CommitGraph Context Menu

Add after "Revert commit..." in the `ctxItems` array:

```ts
{
  label: "Interactive rebase from here...",
  icon: <RotateCcwIcon />,
  action: () => {
    // Store the target commit hash, open the rebase dialog
    useUIStore.getState().openDialog("interactive-rebase");
    // Need to pass the commit hash — add rebaseTargetCommit to ui.ts
  },
}
```

### UI Store Addition

```ts
// In ui.ts — add to UIState interface:
rebaseTargetCommit: string | null;

// Add to initial state:
rebaseTargetCommit: null,

// Add setter:
setRebaseTargetCommit: (hash: string | null) => void;

// In closeDialog, also clear rebaseTargetCommit
closeDialog: () => set({
  activeDialog: null,
  mergeTargetBranch: null,
  compareBranchTarget: null,
  rebaseTargetCommit: null,  // ADD
}),
```

### MainLayout Registration

```ts
// Lazy import at top:
const InteractiveRebaseDialog = lazy(() =>
  import("@/components/features/dialogs/InteractiveRebaseDialog")
);

// In dialogComponents map:
"interactive-rebase": rebaseTargetCommit ? (
  <InteractiveRebaseDialog
    open={true}
    baseCommit={rebaseTargetCommit}
    onClose={closeDialog}
  />
) : null,
```

### BottomBar Rebase Indicator

When `rebaseStatus` reports `in_progress === true`, show a persistent banner:

```tsx
// In BottomBar — add near the conflict indicator:
const { data: rebaseStatus } = useRebaseStatus(repoPath);

{rebaseStatus?.[0] && (
  <button
    className="flex items-center gap-1 text-[10px] font-semibold text-[#ff9f0a] border-l border-border-20 pl-3 h-3 cursor-pointer"
    onClick={() => openDialogState("interactive-rebase")}
    title="Rebase in progress — click to manage"
  >
    <RotateCcw size={10} />
    <span>Rebasing</span>
  </button>
)}
```

## Data Flow

```
User right-clicks commit abc123
  → CommitGraph: openDialog("interactive-rebase")
  → CommitGraph: setRebaseTargetCommit("abc123")
  → MainLayout renders: <InteractiveRebaseDialog baseCommit="abc123" />
  → Dialog useEffect: api.rebase.todoList(repoPath, "abc123")
    → Returns: [pick def456 "fix bug", pick 789abc "add feature", pick 012def "update readme"]
  → User drags "update readme" above "fix bug", squashes "add feature"
  → User clicks "Start Rebase"
  → api.rebase.start(repoPath, "abc123", [
      { action: "pick", commit_hash: "012def", message: "update readme" },
      { action: "pick", commit_hash: "def456", message: "fix bug" },
      { action: "squash", commit_hash: "789abc", message: "add feature" },
    ])
  → Success: showToast, invalidateQueries, closeDialog
  → Conflict: switch to conflict resolution mode
```

## Edge Cases

1. **No commits to rebase** — If `todoList` returns empty, show "No commits to rebase from this point"
2. **Already rebasing** — If `rebaseStatus` shows in_progress, skip todo fetch and go straight to conflict resolution mode
3. **Branch protection** — If HEAD is a remote-tracking branch, show warning: "Rewriting history on a shared branch"
4. **Dirty working tree** — Run preflight check before starting; warn about unstaged changes
5. **Rebase on self** — If selected commit is HEAD, show "Cannot rebase from HEAD — select an earlier commit"

## Verification

- [ ] Right-click any non-HEAD commit → "Interactive rebase from here..." appears in context menu
- [ ] Dialog opens and loads commit list from API
- [ ] Drag-and-drop reorders commits visually
- [ ] Action dropdown changes per-commit action
- [ ] "Start Rebase" executes and refreshes graph on success
- [ ] Conflict mode shows when rebase hits conflicts
- [ ] Continue/Skip/Abort buttons work in conflict mode
- [ ] BottomBar shows "Rebasing" indicator during rebase
- [ ] No TypeScript errors
