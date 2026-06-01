# Submodule Support Design — GitFlow Desktop

**Date:** 2026-06-01  
**Status:** Design approved  
**Scope:** Display submodule status, init, update, and removal in the file tree UI

---

## Overview

GitFlow Desktop will integrate submodule management into the file tree as special folder entries. Users can view submodule status at a glance via badges, and perform four core operations (init, update, open in new window, remove) from either a right-click context menu or a detail panel in the right sidebar.

---

## Architecture

### Backend (Rust)

**Existing commands** in `src-tauri/src/commands/submodule.rs`:
- `submodule_list(path: String) -> Result<Vec<SubmoduleInfo>, String>` — fetch all submodules with status
- `submodule_init(path: String, submodule_path: Option<String>)` — initialize a submodule
- `submodule_update(path: String, submodule_path: Option<String>)` — update submodule to tracked commit

**New command:**
- `submodule_remove(path: String, submodule_path: String)` — deinit submodule (remove from index, keep files)

**Data model** (`SubmoduleInfo`):
```rust
pub struct SubmoduleInfo {
    pub name: String,           // folder name (last path segment)
    pub path: String,           // relative path in repo
    pub commit_hash: String,    // tracked commit SHA
    pub status: String,         // "ok", "not_initialized", "modified", "conflict"
    pub desc: String,           // description from git config
}
```

Status values:
- `"ok"` — initialized, commit matches index
- `"not_initialized"` — not yet cloned (prefix: `-`)
- `"modified"` — checked-out commit differs from index (prefix: `+`)
- `"conflict"` — merge conflict in submodule (prefix: `U`)

### Frontend (React)

**New query hook** (`apps/desktop/src/queries/useSubmoduleList.ts`):
```typescript
export function useSubmoduleList(repoPath: string | null) {
  return useQuery({
    queryKey: ["git", repoPath, "submodules"],
    queryFn: () => api.submodules.list(repoPath!),
    enabled: !!repoPath,
  });
}
```

**API wrapper** (extend `apps/desktop/src/api/tauri.ts`):
```typescript
submodules: {
  list: (path: string) => invoke<SubmoduleInfo[]>("submodule_list", { path }),
  init: (path: string, submodulePath?: string) => 
    invoke<string>("submodule_init", { path, submodulePath: submodulePath ?? null }),
  update: (path: string, submodulePath?: string) => 
    invoke<string>("submodule_update", { path, submodulePath: submodulePath ?? null }),
  remove: (path: string, submodulePath: string) => 
    invoke<string>("submodule_remove", { path, submodulePath }),
}
```

**UI Components:**

1. **SubmoduleEntry** (`apps/desktop/src/components/sidebar/SubmoduleEntry.tsx`)
   - Renders as a folder entry with link icon + status badge
   - Non-expandable (atomic unit)
   - Right-click → context menu
   - Click → select in `useUIStore`, show in right panel

2. **SubmoduleContextMenu** (extend existing context menu logic)
   - Four actions: Init, Update, Open in New Window, Remove
   - Disabled states based on status (e.g., can't init if already initialized)

3. **SubmoduleDetail** (extend `RightPanel`)
   - Shows when a submodule is selected
   - Displays: name, path, commit hash, status with explanation
   - Four action buttons (init, update, open, remove)
   - Loading/error states during operations

---

## UI Layout

### File Tree
```
📁 src/
  📁 components/
  📁 utils/
🔗 libs/ui (✓)          ← submodule entry with badge
🔗 libs/api (⚠)         ← modified status
🔗 vendor/dep (✗)       ← not initialized
```

**Badge meanings:**
- ✓ (green) — initialized, up-to-date
- ⚠ (yellow) — modified (commit mismatch)
- ✗ (red) — not initialized
- ⚡ (orange) — conflict

### Right Panel (Submodule Selected)
```
┌─────────────────────────────────┐
│ Submodule: libs/ui              │
├─────────────────────────────────┤
│ Path: libs/ui                   │
│ Commit: abc1234...              │
│ Status: Modified                │
│ (checked-out commit differs)    │
├─────────────────────────────────┤
│ [Init] [Update] [Open] [Remove] │
└─────────────────────────────────┘
```

---

## State Management

**UI State** (`useUIStore`):
- `selectedFile: string | null` — already exists, reuse for submodules
- Submodule selection is treated like file selection

**Server State** (TanStack Query):
- Query key: `["git", repoPath, "submodules"]`
- Invalidated on `worktree` events (file watcher)
- Refetched after init/update/remove operations

---

## Data Flow

1. **Initial load:** `MainLayout` starts file watcher on repo change
2. **File watcher event:** `repo:changed` with `event_type: "worktree"`
3. **Query invalidation:** `queryClient.invalidateQueries({ queryKey: ["git", repoPath, "submodules"] })`
4. **Fetch:** `useSubmoduleList` refetches via `api.submodules.list(repoPath)`
5. **Render:** File tree renders submodule entries with badges
6. **User action:** Right-click or click detail panel button
7. **Operation:** Call `api.submodules.init/update/remove(repoPath, submodulePath)`
8. **Refresh:** Invalidate query, refetch to show updated status

---

## Implementation Phases

### Phase 1: Backend
- Add `submodule_remove` command to `src-tauri/src/commands/submodule.rs`
- Register in `invoke_handler!` in `src-tauri/src/lib.rs`

### Phase 2: Frontend API & Query
- Add `submodules` namespace to `api/tauri.ts`
- Create `useSubmoduleList` hook
- Add submodule query invalidation to `MainLayout.tsx` (on `worktree` events)

### Phase 3: UI Components
- Create `SubmoduleEntry` component
- Integrate into file tree rendering logic
- Create `SubmoduleDetail` component for right panel
- Add context menu actions

### Phase 4: Integration & Testing
- Test all four operations (init, update, open, remove)
- Test status badge updates after operations
- Test error handling (permission denied, network issues, etc.)
- Manual testing with real repos containing submodules

---

## Error Handling

**Backend:**
- Git command failures return `Err(stderr)` with descriptive message
- No submodules → return empty `Vec`

**Frontend:**
- Query errors show in right panel: "Failed to load submodules"
- Operation errors show toast notification with git stderr
- Buttons disabled during loading to prevent double-clicks

---

## Testing Strategy

**Unit tests:**
- `submodule_list` parsing (various status prefixes)
- `submodule_init/update/remove` command construction

**Integration tests:**
- Create test repo with submodules
- Verify list, init, update, remove operations
- Verify status transitions

**Manual testing:**
- Open repo with submodules
- Verify badges display correctly
- Test each action from context menu and detail panel
- Verify UI updates after operations

---

## Future Enhancements (Out of Scope)

- Recursive submodule operations (nested submodules)
- Submodule add/clone from UI
- Diff view for submodule changes
- Submodule branch tracking
