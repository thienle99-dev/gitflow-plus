# GitFlow Desktop — Implementation Plan

## Phase 1: Core Git Workflow (MVP)

### Step 1: Project Scaffold
- [ ] Init root `package.json` (workspace)
- [ ] Create `apps/desktop/` with Vite + React + TypeScript
- [ ] Add Tailwind CSS config (dark mode class strategy)
- [ ] Init Tauri 2 (`src-tauri/`)
- [ ] Configure custom titlebar (macOS traffic lights)
- [ ] Verify `cargo tauri dev` launches blank window

### Step 2: Rust Git Commands
- [ ] `commands/mod.rs` — register all commands
- [ ] `commands/repo.rs` — open_repo, get_repo_info, validate path
- [ ] `commands/log.rs` — git_log (paginated, 200/page)
- [ ] `commands/status.rs` — git_status (porcelain parse)
- [ ] `commands/branch.rs` — list, create, checkout, delete
- [ ] `commands/commit.rs` — stage, unstage, commit, amend
- [ ] `commands/diff.rs` — file diff, commit diff, staged diff
- [ ] `commands/remote.rs` — pull, push, fetch
- [ ] Unit tests for output parsing

### Step 3: API Layer (Frontend)
- [ ] `api/tauri.ts` — typed invoke wrappers for all commands
- [ ] `queries/useGitLog.ts` — paginated, queryKey: ["git", repoPath, "log"]
- [ ] `queries/useGitStatus.ts` — staleTime: 0
- [ ] `queries/useGitBranches.ts`
- [ ] `queries/useGitDiff.ts`
- [ ] TanStack Query provider setup

### Step 4: Layout Shell
- [ ] `layouts/MainLayout.tsx` — 3-panel + bottom bar
- [ ] `react-resizable-panels` integration
- [ ] Custom titlebar component (macOS vibrancy style)
- [ ] Toolbar component (pull/push/fetch/commit/branch buttons)
- [ ] Dark/light theme toggle (Tailwind class + localStorage)

### Step 5: Sidebar
- [ ] `components/sidebar/BranchList.tsx` — disclosure triangles, grouped
- [ ] `components/sidebar/RemoteList.tsx`
- [ ] `components/sidebar/TagList.tsx`
- [ ] Double-click branch → checkout
- [ ] Current branch highlight
- [ ] Sidebar collapse (Cmd+B)

### Step 6: Commit Graph
- [ ] `lib/graph-layout.ts` — DAG builder, lane assignment algorithm
- [ ] `components/graph/CommitGraph.tsx` — SVG container + virtual scroll
- [ ] `components/graph/CommitNode.tsx` — circle + ref badges
- [ ] `components/graph/GraphEdge.tsx` — lines + bezier curves
- [ ] Branch coloring (8-10 color palette)
- [ ] Click → select commit
- [ ] Right-click → context menu
- [ ] Pagination: load more on scroll bottom
- [ ] Unit tests for layout algorithm

### Step 7: Right Panel
- [ ] `components/detail/CommitDetail.tsx` — hash, author, date, message
- [ ] `components/detail/FileChangedList.tsx` — click file → show diff
- [ ] State switching: no selection → working tree, selected → commit detail

### Step 8: Working Tree (Stage/Commit)
- [ ] `components/detail/WorkingTree.tsx` — staged + unstaged sections
- [ ] Stage/unstage per file (checkbox click)
- [ ] Bulk stage/unstage all
- [ ] Commit message textarea
- [ ] Commit button (Cmd+Enter shortcut)
- [ ] Amend toggle

### Step 9: Diff Viewer
- [ ] `components/diff/DiffViewer.tsx` — wrapper component
- [ ] `lib/parse-diff.ts` — unified diff parser
- [ ] Split view mode (CodeMirror 6 × 2, scroll sync)
- [ ] Unified view mode (single CodeMirror)
- [ ] Segmented control toggle (split/unified)
- [ ] Syntax highlight auto-detect by extension
- [ ] Edge cases: binary, large file, new/deleted

### Step 10: Git Actions
- [ ] Pull button → invoke git_pull → refresh queries
- [ ] Push button → invoke git_push → show result toast
- [ ] Fetch button → invoke git_fetch → refresh branches
- [ ] Checkout branch (from sidebar double-click + context menu)
- [ ] Create branch dialog (name input + base ref selector)
- [ ] Error handling: toast notifications, auth prompts

### Step 11: File Watcher
- [ ] `watcher/fs_watcher.rs` — notify crate setup
- [ ] Debounce 300ms
- [ ] Classify events: worktree / refs / HEAD
- [ ] Emit Tauri events per type
- [ ] Frontend listener → invalidate relevant queries
- [ ] Start/stop watcher on repo open/close

### Step 12: Polish
- [ ] Dark/light theme complete (all components)
- [ ] Keyboard shortcuts (Cmd+B sidebar, Cmd+Enter commit, etc.)
- [ ] Recent repos list (localStorage)
- [ ] Open repo via file picker dialog
- [ ] Window state persistence (tauri-plugin-window-state)
- [ ] Loading states + skeleton UI
- [ ] Empty states (no repo open, no commits)

---

## Phase 2: Advanced Git (after Phase 1 ships)

- [ ] Merge branch + detect conflict state
- [ ] Conflict resolver UI (3-panel CodeMirror)
- [ ] Interactive rebase (GIT_SEQUENCE_EDITOR approach)
- [ ] Stash management
- [ ] Tag CRUD
- [ ] Git log search/filter

## Phase 3: Remote Integration (after Phase 2)

- [ ] GitHub/GitLab OAuth flow
- [ ] PR list view
- [ ] Create PR form
- [ ] Workspace (multi-repo)
- [ ] Bulk fetch/pull

---

## Verification Checklist

- [ ] `cargo tauri dev` launches without crash
- [ ] Open real git repo → graph renders
- [ ] Stage → commit → push cycle works
- [ ] File watcher: external edit → status updates
- [ ] Virtual scroll: 1000+ commits smooth
- [ ] Diff viewer: all file states (M/A/D/R)
- [ ] Dark/light toggle works
- [ ] `cargo test` passes
- [ ] `npm test` passes
