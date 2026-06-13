# Operation Progress + Cancel for fetch/pull/push/rebase

## Goal
Add real-time progress bars and cancel buttons for fetch, pull, push, and rebase operations — matching the clone dialog's UX pattern.

## Tasks

### 1. Rust: Add `spawn_with_progress` to `RunningOps`
**File**: `src-tauri/src/commands/running_ops.rs`
- Add method `spawn_with_progress(id, cmd, app, event_name)` that:
  - Spawns child with piped stdout+stderr
  - Takes stderr handle before storing child in slot
  - Spawns a thread to read stderr line-by-line and emit Tauri events via `app.emit(event_name, payload)`
  - Returns oneshot::Receiver like `spawn()` does
- Add `GitProgress` struct: `{ phase: String, percent: f64, message: String }` (same shape as CloneProgress)
- Reuse parse logic from `clone.rs` — extract to shared fn or duplicate the patterns

→ Verify: `cargo check` passes in `src-tauri/`

### 2. Rust: Add shared progress parser
**File**: `src-tauri/src/commands/remote.rs` (or new `progress.rs`)
- Create `parse_remote_progress(line: &str) -> Option<GitProgress>` that handles:
  - `Receiving objects: XX%`
  - `Resolving deltas: XX%`
  - `Unpacking objects: XX%`
  - `remote: Counting objects: XX%`
  - `remote: Compressing objects: XX%`
  - `Writing objects: XX%` (push)
  - `Enumerating objects:` (indeterminate)
  - `From <url>` (fetch source line)

→ Verify: Add unit tests for the parser

### 3. Rust: Update fetch/pull/push to emit progress
**File**: `src-tauri/src/commands/remote.rs`
- Add `app: tauri::AppHandle` param to `git_fetch`, `git_pull`, `git_push`
- When `operation_id` is Some: use `running_ops.spawn_with_progress(op_id, cmd, app, "git-progress")` instead of `running_ops.spawn()`
- Add `--progress` flag to git args (git outputs progress to stderr by default when stderr is a pipe, but `--progress` forces it)

→ Verify: `cargo check` passes

### 4. Rust: Add cancel support to rebase
**File**: `src-tauri/src/commands/rebase.rs`
- Add `running_ops: tauri::State<'_, RunningOps>` and `operation_id: Option<String>` params to `rebase_start`, `rebase_continue`, `rebase_skip`
- When `operation_id` is Some: use `running_ops.spawn()` instead of `cmd.output().await`
- `rebase_abort` doesn't need cancel (it IS the cancel)

→ Verify: `cargo check` passes

### 5. Rust: Register updated commands in lib.rs
**File**: `src-tauri/src/lib.rs`
- No new commands needed — existing signatures are updated in-place
- Verify `cargo check` still passes

→ Verify: `cargo check` passes

### 6. Frontend: Update API types and wrappers
**File**: `apps/desktop/src/api/tauri.ts`
- Add `GitProgress` interface (or reuse `CloneProgress` shape)
- Update `remote.fetch/pull/push` wrappers to pass `appHandle` — actually, Tauri auto-injects `AppHandle`, no frontend change needed for that
- Update `rebase.start/continue/skip` wrappers to accept optional `operationId` param

→ Verify: `pnpm build` passes in `apps/desktop/`

### 7. Frontend: Add progress + cancel to OperationRow
**File**: `apps/desktop/src/components/layout/OperationCenter.tsx`
- Add cancel button (X icon) for running operations where `op.cancelable` is true
- Wire to `cancelOperation` from store
- Add progress bar (thin bar below the row) when `op.progress` is set
- Listen for `git-progress` Tauri events, match by operation ID, update `op.detail` with progress message

→ Verify: `pnpm build` passes

### 8. Frontend: Wire progress events to operations store
**File**: `apps/desktop/src/stores/operations.ts`
- Add `progress?: { phase: string; percent: number; message: string }` field to `Operation` interface
- Add `updateProgress(id, progress)` action
- In `trackRemoteOp`: listen for `git-progress` events, match by operation ID, call `updateProgress`
- Clean up listener on completion/cancel

→ Verify: `pnpm build` passes

### 9. Frontend: Update callers to pass operationId for rebase
**Files**: Wherever rebase is called (CommandPalette, dialogs, etc.)
- Pass `operationId` from `trackRemoteOp` to rebase API calls
- Wrap rebase calls with `trackRemoteOp` if not already

→ Verify: `pnpm build` passes

### 10. Verify end-to-end
- `cargo check` in `src-tauri/`
- `pnpm build` in `apps/desktop/`
- `pnpm test` in `apps/desktop/`

## Done When
- [ ] fetch/pull/push show real-time progress (phase + percent) in OperationCenter
- [ ] fetch/pull/push/rebase show cancel button while running
- [ ] Cancel button kills the git process
- [ ] Rebase operations tracked in OperationCenter with cancel support
- [ ] All existing tests pass, no build errors

## Notes
- Clone's pattern (`clone.rs:82-92`) is the reference for stderr progress streaming
- `RunningOps.spawn()` (`running_ops.rs:23-64`) is the reference for cancellation
- Git outputs progress to stderr when it detects a pipe (not a TTY)
- The `--progress` flag forces git to show progress even when not on a TTY
- For rebase, progress is per-commit ("Applying: ...") — less granular but still useful
