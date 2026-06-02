# GitFlow Desktop — Implementation Plan

## Phase 1: Core Git Workflow (MVP)

### Step 1: Project Scaffold
- [x] Init root `package.json` (workspace)
- [x] Create `apps/desktop/` with Vite + React + TypeScript
- [x] Add Tailwind CSS config (dark mode class strategy)
- [x] Init Tauri 2 (`src-tauri/`)
- [x] Configure custom titlebar (macOS traffic lights)
- [x] Verify `cargo tauri dev` launches blank window

### Step 2: Rust Git Commands
- [x] `commands/mod.rs` — register all commands
- [x] `commands/repo.rs` — open_repo, get_repo_info, validate path
- [x] `commands/log.rs` — git_log (paginated, 200/page)
- [x] `commands/status.rs` — git_status (porcelain parse)
- [x] `commands/branch.rs` — list, create, checkout, delete
- [x] `commands/commit.rs` — stage, unstage, commit, amend
- [x] `commands/diff.rs` — file diff, commit diff, staged diff
- [x] `commands/remote.rs` — pull, push, fetch
- [x] `commands/clone.rs` — git_clone (URL + destination path)
- [x] Async Tauri commands — đảm bảo tất cả `#[tauri::command]` là `async fn`, tránh block main thread
- [x] Stream git log output — dùng `Stdio::piped()` đọc từng dòng, emit chunks về frontend (user thấy commits xuất hiện dần)
- [x] Unit tests for output parsing

### Step 3: API Layer (Frontend)
- [x] `api/tauri.ts` — typed invoke wrappers for all commands
- [x] `queries/useGitLog.ts` — paginated, queryKey: ["git", repoPath, "log"]
- [x] `queries/useGitStatus.ts` — staleTime: 0
- [x] `queries/useGitBranches.ts`
- [x] `queries/useGitDiff.ts`
- [x] TanStack Query provider setup
- [ ] Parallel startup queries — `Promise.all` cho git_log + git_status + git_branches khi mở repo

### Step 4: Layout Shell
- [x] `layouts/MainLayout.tsx` — 3-panel + bottom bar
- [x] `react-resizable-panels` integration
- [x] Custom titlebar component (macOS vibrancy style)
- [x] Toolbar component (pull/push/fetch/commit/branch buttons)
- [x] Dark/light theme toggle (Tailwind class + localStorage)

### Step 5: Sidebar
- [x] `components/sidebar/BranchList.tsx` — disclosure triangles, grouped
- [x] `components/sidebar/RemoteList.tsx`
- [x] `components/sidebar/TagList.tsx`
- [x] Double-click branch → checkout
- [x] Current branch highlight
- [x] Sidebar collapse (Cmd+B)

### Step 6: Commit Graph
- [x] `lib/graph-layout.ts` — DAG builder, lane assignment algorithm
- [x] `components/graph/CommitGraph.tsx` — SVG container + virtual scroll
- [x] `components/graph/CommitNode.tsx` — circle + ref badges
- [x] `components/graph/GraphEdge.tsx` — lines + bezier curves
- [x] Branch coloring (8-10 color palette)
- [x] Click → select commit
- [x] Right-click → context menu
- [x] Pagination: load more on scroll bottom
- [x] Canvas renderer — thay SVG bằng Canvas để tránh DOM overhead với 1000+ nodes/edges
- [ ] Web Worker cho graph layout — move `computeGraphLayout` ra khỏi main thread (pure function, dễ isolate)
- [ ] True virtualization — TanStack Virtual, chỉ render rows đang visible thay vì pagination
- [ ] Unit tests for layout algorithm

### Step 7: Right Panel
- [x] `components/detail/CommitDetail.tsx` — hash, author, date, message
- [x] `components/detail/FileChangedList.tsx` — click file → show diff
- [x] State switching: no selection → working tree, selected → commit detail

### Step 8: Working Tree (Stage/Commit)
- [x] `components/detail/WorkingTree.tsx` — staged + unstaged sections
- [x] Stage/unstage per file (checkbox click)
- [x] Bulk stage/unstage all
- [x] Commit message textarea
- [x] Commit button (Cmd+Enter shortcut)
- [x] Amend toggle
- [ ] Interactive staging — stage/unstage per hunk hoặc per line (`git add -p` equivalent)

### Step 9: Diff Viewer
- [x] `components/diff/DiffViewer.tsx` — wrapper component
- [x] `lib/parse-diff.ts` — unified diff parser
- [x] Split view mode (CodeMirror 6 × 2, scroll sync)
- [x] Unified view mode (single CodeMirror)
- [x] Segmented control toggle (split/unified)
- [x] Syntax highlight auto-detect by extension
- [x] Edge cases: binary, large file, new/deleted
- [ ] Word-level diff highlighting — highlight từng từ thay đổi trong một dòng, không chỉ cả dòng
- [ ] Lazy load CodeMirror — chỉ import khi user click xem diff, không load upfront (~500KB saved)

### Step 10: Git Actions
- [x] Pull button → invoke git_pull → refresh queries
- [x] Push button → invoke git_push → show result toast
- [x] Fetch button → invoke git_fetch → refresh branches
- [x] Checkout branch (from sidebar double-click + context menu)
- [x] Create branch dialog (name input + base ref selector)
- [x] Error handling: toast notifications, auth prompts
- [x] Clone dialog — URL input + destination path picker
- [ ] Revert commit — tạo commit mới đảo ngược thay đổi (an toàn cho shared branches)
- [ ] Branch merge preview — show ahead/behind count + diff preview trước khi merge

### Step 11: File Watcher
- [x] `watcher/fs_watcher.rs` — notify crate setup
- [x] Debounce 300ms
- [x] Classify events: worktree / refs / HEAD
- [x] Emit Tauri events per type
- [x] Frontend listener → invalidate relevant queries
- [x] Start/stop watcher on repo open/close

### Step 12: Polish
- [x] Dark/light theme complete (all components)
- [x] Keyboard shortcuts (Cmd+B sidebar, Cmd+Enter commit, etc.)
- [x] Recent repos list (localStorage)
- [x] Open repo via file picker dialog
- [x] Window state persistence (tauri-plugin-window-state)
- [x] Loading states + skeleton UI
- [x] Empty states (no repo open, no commits)
- [ ] Git credentials handling (HTTPS auth prompt, SSH key detection)
- [x] Error UX phân loại: network error / auth error / conflict error → UX riêng
- [x] Undo last commit (git reset --soft HEAD~1) button
- [x] Performance logging — measure open repo, render graph, status refresh (đo trước khi optimize)

---

## Phase 2: Advanced Git + AI Features (after Phase 1 ships)

### GitFlow Workflow (core brand feature)
- [ ] Detect gitflow init (`.git/config` có `[gitflow]` section)
- [ ] `gitflow init` — setup branch naming conventions (main/develop/feature/release/hotfix prefix)
- [ ] Feature: start (`git checkout -b feature/<name> develop`), finish (merge → develop, delete branch)
- [ ] Release: start (`git checkout -b release/<version> develop`), finish (merge → main + develop, tag)
- [ ] Hotfix: start (`git checkout -b hotfix/<version> main`), finish (merge → main + develop, tag)
- [ ] GitFlow toolbar section — dedicated buttons cho từng action
- [ ] Visual indicator trên commit graph — highlight gitflow branches theo màu riêng

### Git Advanced
- [x] Merge branch + detect conflict state
- [x] Conflict resolver UI (3-panel CodeMirror)
- [x] Interactive rebase (GIT_SEQUENCE_EDITOR approach)
- [x] Stash management
- [x] Stash diff viewer — preview nội dung stash trước khi apply
- [x] Tag CRUD
- [x] Git log search/filter
- [x] Cherry-pick (pick commit từ branch khác)
- [x] Multi-select commits — chọn nhiều commits để cherry-pick batch hoặc xem combined diff
- [x] Blame view (inline trong diff viewer — ai viết dòng nào)
- [x] File history — xem toàn bộ commits đã chạm vào một file (`git log -- <file>`)
- [x] Submodule support (hiển thị status, init/update)
- [ ] Git hooks visibility (show active hooks, --no-verify option)
- [x] Undo stack (reflog-based, undo last commit/stage/checkout)
- [x] Auto-fetch — background fetch theo interval (configurable, mặc định 5 phút), badge "X commits behind"

### Performance
- [x] Incremental git log — cache commit list, chỉ fetch commits mới hơn HEAD đã biết (`git log <known_HEAD>..HEAD`)
- [x] Response caching cho diff — tránh re-parse cùng một diff khi user switch qua lại giữa files
- [x] Measure & profile — dùng performance logging từ Phase 1 để xác định bottleneck thực tế trước khi optimize thêm

### AI Features (Cloud LLM API)
- [x] Settings UI: API key input (Claude/OpenAI), model selector, token limit
- [ ] API key storage in OS keychain (`keyring` crate)
- [ ] Rust backend: LLM API client + streaming response via Tauri events
- [x] **AI Conflict Resolution** — phân tích ours/theirs + surrounding context, đề xuất merged result
- [x] **AI Commit Message** — phân tích staged diff, generate conventional commit (type: subject + body)
- [x] **AI Explain Changes** — giải thích commit/diff bằng ngôn ngữ tự nhiên
- [x] **AI Code Review Assist** — flag bugs, suggest improvements, đề xuất test cases
- [ ] **AI Commit Scope Suggestion** — gợi ý tách commit nếu staged changes quá lớn/không liên quan
- [ ] **AI Branch Naming** — suggest branch name từ description
- [ ] Context-aware prompts — gửi kèm project conventions (.cursorrules, CLAUDE.md) nếu có
- [ ] Rate limiting + response caching cho cùng diff
- [x] Fallback: API fail → toast error, manual workflow vẫn hoạt động bình thường

## Phase 3: Remote Integration (after Phase 2)

- [ ] GitHub/GitLab OAuth flow
- [ ] PR list view
- [ ] Create PR form (+ draft PR support)
- [ ] PR templates — detect `.github/pull_request_template.md`, pre-fill
- [ ] PR Review inline — xem review comments trực tiếp trong diff viewer
- [ ] CI/CD status — show pipeline status per commit/PR (GitHub Actions, GitLab CI)
- [ ] Issue linking — link commits/PRs tới issues, show trong commit detail
- [ ] Clone from GitHub/GitLab — search và clone repos trực tiếp trong app sau khi OAuth
- [ ] Branch protection rules visualization — show branches nào đang protected và rules
- [ ] Desktop notifications — notify khi long-running ops xong hoặc CI/CD status thay đổi
- [ ] Workspace (multi-repo)
- [ ] Bulk fetch/pull

## Phase 4: Productivity & Collaboration (after Phase 3)

- [ ] Command palette (Cmd+K) — quick search branches, commands, recent repos
- [ ] Git bisect UI — visual binary search cho bug introduction
- [ ] Worktree management — tạo/switch/delete git worktrees
- [ ] Diff bookmarks — đánh dấu files/hunks để review sau
- [ ] Commit signing — GPG/SSH signing support + verification badges
- [ ] Custom aliases — user define git aliases, show trong toolbar/menu
- [ ] Commit message templates per project (snippets)
- [ ] Activity heatmap — contribution graph (như GitHub profile)
- [ ] Branch comparison — so sánh 2 branches side-by-side (ahead/behind + diff)
- [ ] Gitignore editor — visual editor cho `.gitignore`, browse files, add patterns, test matching
- [ ] Patch export/import — export commits thành `.patch` file, apply patch từ file
- [x] Git LFS support — detect LFS-tracked files, show LFS status, hỗ trợ lfs pull/push
- [ ] Repository health check — scan large files không LFS-tracked, sensitive data patterns, broken symlinks

## Phase 5: Plugin System & Extensibility (future)

- [ ] Plugin API — cho phép community build extensions (custom panels, commands)
- [ ] Theme marketplace — custom color themes
- [ ] Custom graph layouts — user chọn style (compact, expanded, timeline)
- [ ] Scripting — Lua/JS scripting cho automation (batch operations)
- [ ] Webhook integration — trigger actions on events (commit → notify Slack)

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
