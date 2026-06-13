# Git Worktree Management

## Goal
Full git worktree management: Rust backend (list/add/remove/lock/unlock/prune) + sidebar panel UI.

## Tasks

### 1. Rust: Create `worktree.rs` with all commands
**File**: `src-tauri/src/commands/worktree.rs`

Structs:
- `WorktreeInfo { path, head, branch, is_locked, is_bare, prunable }`

Commands:
- `worktree_list(path) -> Vec<WorktreeInfo>` — parse `git worktree list --porcelain`
- `worktree_add(path, target_path, branch?, new_branch?) -> String` — `git worktree add <path> [<branch>]` with optional `-b <new_branch>`
- `worktree_remove(path, worktree_path, force?) -> String` — `git worktree remove [--force] <path>`
- `worktree_lock(path, worktree_path) -> String` — `git worktree lock <path>`
- `worktree_unlock(path, worktree_path) -> String` — `git worktree unlock <path>`
- `worktree_prune(path) -> String` — `git worktree prune`

→ Verify: `cargo check`

### 2. Rust: Register commands in `lib.rs` + `mod.rs`
- Add `pub mod worktree;` to `commands/mod.rs`
- Add all 6 commands to `invoke_handler!` in `lib.rs`

→ Verify: `cargo check`

### 3. Frontend: Add API wrappers in `tauri.ts`
```typescript
worktrees: {
  list: (path) => invoke("worktree_list", { path }),
  add: (path, targetPath, branch?, newBranch?) => invoke("worktree_add", { path, targetPath, branch, newBranch }),
  remove: (path, worktreePath, force?) => invoke("worktree_remove", { path, worktreePath, force }),
  lock: (path, worktreePath) => invoke("worktree_lock", { path, worktreePath }),
  unlock: (path, worktreePath) => invoke("worktree_unlock", { path, worktreePath }),
  prune: (path) => invoke("worktree_prune", { path }),
}
```

→ Verify: `tsc` passes

### 4. Frontend: Create React Query hook `useWorktrees.ts`
- `useWorktrees(repoPath)` — query with key `["git", repoPath, "worktrees"]`
- `useWorktreeAdd()` — mutation, invalidates worktrees + branches
- `useWorktreeRemove()` — mutation, invalidates worktrees + branches
- `useWorktreeLock/Unlock()` — mutations
- `useWorktreePrune()` — mutation

→ Verify: `tsc` passes

### 5. Frontend: Create `WorktreePanel.tsx` in `components/features/sidebar/`
- List all worktrees with path, branch, lock status
- Current worktree highlighted
- Actions: add (dialog), remove (confirm), lock/unlock, prune
- "Open in Finder" button for each worktree path

→ Verify: `tsc` passes, `pnpm build`

### 6. Frontend: Wire panel into sidebar
- Add worktree section/tab to sidebar
- Register in sidebar navigation

→ Verify: `pnpm build`

### 7. Verify end-to-end
- `cargo test` in src-tauri
- `pnpm test` in apps/desktop
- `pnpm build` in apps/desktop

## Done When
- [ ] All 6 Rust commands registered and compiling
- [ ] `worktree list --porcelain` parsing works correctly
- [ ] Frontend API wrappers + React Query hooks complete
- [ ] Sidebar panel shows worktrees with actions
- [ ] All tests pass

## Notes
- `git worktree list --porcelain` outputs machine-readable format with key-value pairs per worktree
- Each worktree block: `worktree <path>\nHEAD <hash>\nbranch <ref>\nlocked\nbare\nprunable`
- Blocks separated by blank line
- `locked` key appears only if locked (no value)
- `prunable` key appears only if prunable
