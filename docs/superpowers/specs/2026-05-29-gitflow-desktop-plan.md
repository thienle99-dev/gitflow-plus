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
- [x] Parallel startup queries — `Promise.all` cho git_log + git_status + git_branches khi mở repo

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
- [x] Web Worker cho graph layout — move `computeGraphLayout` ra khỏi main thread (pure function, dễ isolate)
- [x] True virtualization — TanStack Virtual, chỉ render rows đang visible thay vì pagination
- [x] Unit tests for layout algorithm

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
- [x] Word-level diff highlighting — highlight từng từ thay đổi trong một dòng, không chỉ cả dòng
- [x] Lazy load CodeMirror — chỉ import khi user click xem diff, không load upfront (~500KB saved)

### Step 10: Git Actions
- [x] Pull button → invoke git_pull → refresh queries
- [x] Push button → invoke git_push → show result toast
- [x] Fetch button → invoke git_fetch → refresh branches
- [x] Checkout branch (from sidebar double-click + context menu)
- [x] Create branch dialog (name input + base ref selector)
- [x] Error handling: toast notifications, auth prompts
- [x] Clone dialog — URL input + destination path picker
- [x] Revert commit — tạo commit mới đảo ngược thay đổi (an toàn cho shared branches)
- [x] Branch merge preview — show ahead/behind count + diff preview trước khi merge

### Step 11: File Watcher
- [x] `watcher/fs_watcher.rs` — notify crate setup
- [x] Debounce 300ms
- [x] Classify events: worktree / refs / HEAD
- [x] Emit Tauri events per type
- [x] Frontend listener → invalidate relevant queries
- [x] Start/stop watcher on repo open/close

### Step 12: Polish / Release Readiness
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
- [ ] Operation lock/queue — tránh chạy đồng thời pull/push/fetch/merge/rebase/cherry-pick trên cùng repo
- [ ] Long-running operation progress + cancel affordance khi git command hỗ trợ
- [ ] Pre-flight safety checks — dirty worktree, untracked files, detached HEAD, conflict/rebase/merge-in-progress
- [ ] Confirm destructive actions — discard/reset/delete branch/drop stash cần confirm rõ impact
- [ ] Release gates — build app, run tests, smoke test real repo, verify packaged app launch

### UX Improvements
- [ ] Command palette (Cmd+K) — quick actions, branch/commit search, recent repos
- [ ] Operation center — show running git/AI tasks, progress, cancel, recent results
- [ ] Smart pre-flight dialogs — summarize risk before merge/rebase/cherry-pick/push/discard
- [ ] Improved interactive staging UX — applied state, patch failure explanation, undo last hunk action
- [ ] AI result actions — apply/copy/regenerate/change tone/change language
- [ ] PR/MR review summary strip — CI, approvals, conflicts, changed files, branch direction
- [ ] File diff filters — search changed files, filter by status, sort by risk/size
- [ ] Auth setup flow — guided setup for GitHub/GitLab token, SSH, HTTPS credentials
- [ ] Settings connection tests — verify AI key, GitHub token, GitLab token

#### UI/UX Refinement & Polish (Brainstormed)
- [ ] Unified Toast & Error System — Tích hợp Sonner/React-Hot-Toast, xóa bỏ hoàn toàn browser native alerts
- [ ] Custom Warning/Confirmation Modals — Tạo modal dialogs custom (destructive actions like discard changes, delete branch)
- [ ] Welcome Screen Refresh — Thiết kế tối giản kiểu macOS native, cải thiện typography và layout recent repos list
- [ ] Functional Status Bar — Tận dụng Bottom Bar hiển thị branch hiện tại, status sync, conflict count, remove nonfunctional terminal
- [ ] Responsive Toolbar — Tự động dồn các action phụ (LFS, Analytics, Undo) vào menu "More" trên màn hình nhỏ
- [ ] macOS Source List Sidebar — Cải thiện styling Sidebar, bổ sung các badges báo số lượng branches, commits behind/ahead
- [ ] Commit Graph Visual Polish — Tăng chiều cao dòng graph, bổ sung avatar author (gravatar) và hiệu ứng selection glow
- [ ] Tailwind Theme System Clean-up — Refactor code style, chuyển các utilities màu sắc trong index.css thành Tailwind plugin chính thức, thêm tùy chọn follow system theme (Auto)
- [ ] Shared AI Markdown Renderer — Gộp 3 markdown parsers trùng lặp (DiffViewer, CommitDetail ×2) thành 1 component `<AIMarkdown>` dùng chung
- [ ] Extract Shared UI Components — Gộp duplicate StatusBadge, fileIcon(), getFileName(), getFolder() vào `components/ui/shared/`
- [ ] Base Dialog Component — Tạo `<Dialog>` base với focus trap, Escape key, backdrop, animated entry/exit. Tất cả 14 dialogs kế thừa
- [ ] Split SettingsDialog — Tách 66KB mega-file thành tab sections: General, AI, Integrations, Git, Appearance
- [ ] CodeMirror Theme Sync — Tạo custom CodeMirror themes matching Gruvbox variants (hiện chỉ có oneDark)
- [ ] Split Monolithic Components — Tách WorkingTree (1149L), DiffViewer (1057L), TrayPanel (944L) thành sub-components ≤400 dòng
- [ ] Accessibility Basics — Focus management cho dialogs, ARIA attributes cho graph rows/tree items, keyboard shortcut hints trên buttons
- [ ] Stash Panel Polish — Unify button styling, confirm trước Drop, thêm inline stash preview summary

### First-Launch Onboarding Wizard
- [x] Show onboarding wizard on first app launch only (`gitflowOnboardingCompleted !== "true"`)
- [x] Allow users to skip onboarding; skipped setup still marks onboarding complete
- [x] Add Settings/Help entry point to run onboarding again (BottomBar "Setup" icon + MainLayout `activeDialog === "onboarding"` wiring)
- [x] Replace automatic first-session feature guide popup with onboarding; keep feature guide manually accessible
- [x] Welcome step — explain app briefly, offer Open Repository, Clone Repository, Continue setup
- [x] Theme step — choose theme using existing theme cards and save to `theme`
- [x] Git basics step — configure auto-fetch, fetch interval, confirm dangerous actions, reopen last repo
- [x] AI setup step — optional API key, custom API URL, commit model, review model, token limit
- [x] Custom prompt step — configure custom AI rules, commit style, AI detail level, review language
- [x] Finish step — show setup summary and actions to Open Repository, Clone Repository, or Finish
- [x] Persist onboarding metadata: `gitflowOnboardingCompleted`, `gitflowOnboardingSkipped`, `gitflowOnboardingVersion`
- [x] Dispatch `gitflow-settings-updated` after saving onboarding settings
- [x] Reuse existing settings keys so Settings dialog and onboarding stay in sync
- [ ] Tests: first launch opens onboarding, skip persists, finish saves settings, rerun loads current settings

### Pre-Commit Lint Gate (Code + Commit Message Lint)
- [ ] Setup Configurable Settings & States (`stores/ui.ts` / `stores/repo.ts` / `SettingsDialog.tsx`)
- [ ] Implement Commit Message Lint Engine (`lib/commit-lint.ts` with Conventional Commits regex + 7 rules)
- [ ] Add Inline Commit message feedback & Character Counter in CommitForm
- [ ] Implement Rust backend for Linter detection & Execution (`commands/lint.rs`)
- [ ] Connect Rust linting commands to Frontend via API layer and query hooks (`api/tauri.ts`, `queries/useLint.ts`)
- [ ] Design and build `LintWarningDialog` (displaying message issues & ESLint/Biome/Ruff code warnings)
- [ ] Integrate Pre-Commit Gate to handleCommit in `WorkingTree.tsx` and `TrayPanelView.tsx`
- [ ] Add Unit Tests for Lint engine and UI states

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
- [ ] GitFlow action previews — show target branches, changed files, conflicts risk trước khi finish/release/hotfix

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
- [ ] API key storage in OS keychain (`keyring` crate), migrate existing localStorage secrets safely
- [ ] Secret hygiene — mask tokens in UI, avoid logging secrets, clear secrets from diagnostics/crash reports
- [ ] Rust backend: LLM API client + streaming response via Tauri events
- [x] **AI Conflict Resolution** — phân tích ours/theirs + surrounding context, đề xuất merged result
- [x] **AI Commit Message** — phân tích staged diff, generate conventional commit (type: subject + body)
- [x] **AI Explain Changes** — giải thích commit/diff bằng ngôn ngữ tự nhiên
- [x] **AI Code Review Assist** — flag bugs, suggest improvements, đề xuất test cases
- [x] **AI Commit Scope Suggestion** — gợi ý tách commit nếu staged changes quá lớn/không liên quan
- [ ] **AI Branch Naming** — suggest branch name từ description
- [x] Context-aware prompts — backend đọc project conventions (.cursorrules, CLAUDE.md, AGENTS.md), wired vào tất cả 7 prompt flows + settings preview showing detected convention files
- [x] Rate limiting + response caching cho cùng diff — DJB2 hash cache (10min TTL, 50 max), sliding window rate limiter (10 req/60s)
- [x] Fallback: API fail → toast error, manual workflow vẫn hoạt động bình thường
- [ ] **AI PR/MR Description** — generate PR title/body từ commits + diff, detect breaking changes, checklist, test plan
- [ ] **AI Release Notes** — gom commits/tags thành changelog theo Conventional Commits hoặc custom format
- [x] **AI Risk Summary** — phân tích diff trước merge/push: local pattern scanner (sensitive files, migration, config/env, auth, destructive diffs) + optional AI deep analysis; RiskSummaryDialog wired into push flow
- [ ] **AI Test Suggestion** — đề xuất test cần chạy/thêm dựa trên staged diff hoặc branch diff
- [ ] **AI Conflict Explanation** — ngoài resolve conflict, giải thích vì sao conflict xảy ra và bên nào thay đổi gì
- [ ] **AI Commit Splitter** — đề xuất tách staged changes thành nhiều commits logic, có thể stage theo nhóm file/hunk
- [ ] **AI Sensitive Data Scan** — cảnh báo secrets/API keys/token/private certs trước commit/push
- [ ] **AI Git Command Assistant** — user mô tả ý định bằng tự nhiên, app đề xuất Git action an toàn kèm preview trước khi chạy
- [ ] **AI Branch/Issue Summary** — tóm tắt branch hiện tại: mục tiêu, commits chính, files thay đổi, rủi ro còn lại
- [x] **AI Review Comment Drafts** — tạo comment review inline cho diff, dùng khi review PR/MR: generateInlineReviewComments() returns structured JSON, InlineCommentWidget in CodeMirror, toggle button in DiffViewer toolbar, autoInlineReview prop for per-file trigger from WorkingTree (hover MessageSquare icon + right-click context menu "AI Inline Review")

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
- [ ] Remote operation dry-run/preview — protected branch warning, push target confirmation, force-push guard
- [ ] Credential health check — verify GitHub/GitLab token scopes and SSH remote availability

## Phase 4: Productivity & Collaboration (after Phase 3)

- [ ] Command palette (Cmd+K) — quick search branches, commands, recent repos
- [ ] Git bisect UI — visual binary search cho bug introduction
- [ ] Worktree management — tạo/switch/delete git worktrees
- [ ] Diff bookmarks — đánh dấu files/hunks để review sau
- [ ] Commit signing — GPG/SSH signing support + verification badges
- [ ] Custom aliases — user define git aliases, show trong toolbar/menu
- [ ] Commit message templates per project (snippets)
- [ ] Activity heatmap — contribution graph (như GitHub profile)
- [x] Branch comparison — so sánh 2 branches side-by-side (ahead/behind + diff)
- [ ] Gitignore editor — visual editor cho `.gitignore`, browse files, add patterns, test matching
- [ ] Patch export/import — export commits thành `.patch` file, apply patch từ file
- [x] Git LFS support — detect LFS-tracked files, show LFS status, hỗ trợ lfs pull/push
- [x] Repository health check — scan large files không LFS-tracked, sensitive data patterns, broken symlinks
- [x] Diagnostic bundle — collect app version, git version, repo state summary, redacted logs for bug reports
- [x] Test fixture repos — conflict, binary, LFS, submodule, large history, rename/delete, detached HEAD, shallow clone

## Phase 5: Plugin System & Extensibility (future)

- [ ] Plugin API — cho phép community build extensions (custom panels, commands)
- [ ] Theme marketplace — custom color themes
- [ ] Custom graph layouts — user chọn style (compact, expanded, timeline)
- [ ] Scripting — Lua/JS scripting cho automation (batch operations)
- [ ] Webhook integration — trigger actions on events (commit → notify Slack)

---

## Verification Checklist

> Release checklist nên phân biệt rõ: implemented / UI wired / manually verified / automated tests.

- [ ] `cargo tauri dev` launches without crash
- [ ] Open real git repo → graph renders
- [ ] Stage → commit → push cycle works
- [ ] File watcher: external edit → status updates
- [ ] Virtual scroll: 1000+ commits smooth
- [ ] Diff viewer: all file states (M/A/D/R)
- [ ] Dark/light toggle works
- [x] `cargo test` passes
- [x] `npm test` passes

## Plan Review Notes

- Treat `[x]` as "implemented enough to inspect", not "release verified". For complex features, track backend, frontend wiring, manual QA, and automated tests separately.
- Prioritize release blockers before adding more feature breadth: credentials/keychain, interactive staging, pre-flight safety, destructive-action confirmation, and packaged-app verification.
- Move GitFlow workflow higher in priority because it is the core brand promise of GitFlow Desktop.
- Keep remote/PR integration behind solid auth, token storage, and operation safety foundations.
