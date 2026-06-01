# Stash Diff Viewer Design — GitFlow Desktop

**Date:** 2026-06-01  
**Status:** Design approved  
**Scope:** Preview stash contents with switchable diff modes before applying/popping/dropping

---

## Overview

GitFlow Desktop will extend the stash panel with a split-view diff viewer. Users can select a stash from the list and preview its contents in three diff formats (unified, side-by-side, inline). Metadata (date, branch, author, file count) provides context. Action buttons (apply, pop, drop) are available directly from the diff view for fast workflows.

---

## Architecture

### Backend (Rust)

**New command** in `src-tauri/src/commands/stash.rs`:
- `stash_diff(path: String, index: u32) -> Result<String, String>` — fetch unified diff for a stash

Implementation:
```bash
git -C <path> stash show -p stash@{<index>}
```

Returns the full diff output as a string. Parsing happens on the frontend.

### Frontend (React)

**New query hook** (`apps/desktop/src/queries/useStashDiff.ts`):
```typescript
export function useStashDiff(repoPath: string | null, stashIndex: number | null) {
  return useQuery({
    queryKey: ["git", repoPath, "stash", stashIndex],
    queryFn: () => api.stash.diff(repoPath!, stashIndex!),
    enabled: !!repoPath && stashIndex !== null,
  });
}
```

**API wrapper** (extend `apps/desktop/src/api/tauri.ts`):
```typescript
stash: {
  // ... existing methods (list, push, pop, apply, drop)
  diff: (path: string, index: number) => 
    invoke<string>("stash_diff", { path, index }),
}
```

**UI Components:**

1. **StashPanel (refactored)** (`apps/desktop/src/components/phase2/StashPanel.tsx`)
   - Split layout: stash list (left) + diff viewer (right)
   - List shows stashes with click handler to select
   - Selected stash index stored in `useUIStore`

2. **StashDiffViewer** (new, `apps/desktop/src/components/phase2/StashDiffViewer.tsx`)
   - Displays metadata: name, date, branch, author, file count
   - Three mode toggle buttons: Unified, Side-by-side, Inline
   - Diff content area (mode-specific rendering)
   - Action buttons: Apply, Pop, Drop
   - Loading/error states

3. **DiffRenderer** (new, `apps/desktop/src/lib/diff-renderer.ts`)
   - Parse unified diff output into structured format
   - Render functions for each mode:
     - `renderUnified()` — traditional format
     - `renderSideBySide()` — two-column layout
     - `renderInline()` — file tree with expandable diffs

---

## UI Layout

### Split View
```
┌─────────────────────────────────────────────────┐
│ Stashes (3)                 │ Stash: stash@{0}  │
├──────────────────┬──────────┼───────────────────┤
│ stash@{0}        │ Date: 2h ago              │
│ stash@{1}        │ Branch: main              │
│ stash@{2}        │ Author: You               │
│                  │ Files: 3 changed          │
│                  ├───────────────────────────┤
│                  │ [Unified] [Side] [Inline] │
│                  ├───────────────────────────┤
│                  │ diff --git a/file.ts ...  │
│                  │ @@ -10,5 +10,8 @@        │
│                  │ - old line                │
│                  │ + new line                │
│                  │ ...                       │
│                  ├───────────────────────────┤
│                  │ [Apply] [Pop] [Drop]      │
└──────────────────┴──────────────────────────┘
```

### Diff Modes

**Unified (default):**
- Single column, traditional git diff format
- Compact, familiar to developers
- Best for quick scanning

**Side-by-Side:**
- Two columns: before (left) and after (right)
- Easier to compare changes visually
- Takes more horizontal space

**Inline:**
- File tree on left, expandable file diffs
- Integrates with existing file view patterns
- Best for exploring specific files

---

## State Management

**UI State** (`useUIStore`):
- `selectedStashIndex: number | null` — which stash is selected
- New field for diff mode preference (or use localStorage)

**Server State** (TanStack Query):
- Query key: `["git", repoPath, "stash", stashIndex]`
- Invalidated after apply/pop/drop operations
- Also invalidate `["git", repoPath, "stash"]` (stash list) after mutations

**Persistent State** (localStorage):
- `stashDiffMode: "unified" | "sideBySide" | "inline"` — user's preferred mode

---

## Data Flow

1. **Initial load:** StashPanel renders list of stashes
2. **User clicks stash:** `useUIStore.setSelectedStashIndex(index)`
3. **Fetch diff:** `useStashDiff` queries `api.stash.diff(repoPath, index)`
4. **Render:** StashDiffViewer displays metadata + diff in selected mode
5. **Mode toggle:** Update localStorage, re-render with new mode
6. **User action:** Click Apply/Pop/Drop
7. **Execute:** Call `api.stash.apply/pop/drop(repoPath, index)`
8. **Refresh:** Invalidate both stash list and diff queries
9. **Return to list:** Clear selected stash index

---

## Metadata Extraction

From `git stash show -p stash@{0}`:
- **Name:** `stash@{0}` (from UI state)
- **Date:** Parse from stash list (already available)
- **Branch:** Parse from stash list (already available)
- **Author:** Parse from stash list (already available)
- **File count:** Count file headers in diff output (`diff --git a/...`)

---

## Implementation Phases

### Phase 1: Backend
- Add `stash_diff` command to `src-tauri/src/commands/stash.rs`
- Register in `invoke_handler!` in `src-tauri/src/lib.rs`

### Phase 2: Frontend API & Query
- Add `stash.diff` to `api/tauri.ts`
- Create `useStashDiff` hook
- Add `selectedStashIndex` to `useUIStore`

### Phase 3: Diff Parsing & Rendering
- Create `diff-renderer.ts` with parsing logic
- Implement three render modes (unified, side-by-side, inline)
- Add localStorage persistence for mode preference

### Phase 4: UI Components
- Refactor `StashPanel` to split layout
- Create `StashDiffViewer` component
- Add mode toggle buttons and action buttons
- Wire up mutations (apply, pop, drop)

### Phase 5: Integration & Testing
- Test all three diff modes with various stash contents
- Test mode switching and persistence
- Test apply/pop/drop actions and UI refresh
- Test error handling (empty stash, permission denied, etc.)
- Manual testing with real stashes

---

## Error Handling

**Backend:**
- Git command failures return `Err(stderr)` with descriptive message
- Empty stash → return empty string (not an error)

**Frontend:**
- Query errors show in diff viewer: "Failed to load stash diff"
- Action errors show toast notification with git stderr
- Buttons disabled during loading to prevent double-clicks
- Graceful fallback if diff parsing fails

---

## Testing Strategy

**Unit tests:**
- Diff parsing: various file changes (add, modify, delete, rename)
- Mode rendering: verify output structure for each mode
- Metadata extraction: file count, etc.

**Integration tests:**
- Create test stashes with various changes
- Verify diff fetching and parsing
- Verify apply/pop/drop operations refresh UI

**Manual testing:**
- Create stashes with different types of changes
- Test each diff mode
- Test mode switching and persistence
- Test all three actions (apply, pop, drop)
- Verify UI updates after operations

---

## Future Enhancements (Out of Scope)

- Stash diff search/filter
- Stash comparison (diff between two stashes)
- Partial stash apply (apply specific files)
- Stash branching (create branch from stash)
