# UX Flow Improvements — Design Spec

## Overview

Cải thiện UX flow của GitFlow Desktop qua 6 phases incremental. Focus vào core workflow efficiency, discoverability, và keyboard-first experience. Mỗi phase deliver value độc lập, không phụ thuộc phase sau.

---

## Phase 1: Core Workflow Improvements

### 1.1 Status Badge trên Toolbar

Thay thế button "Show Changes" bằng status badge component:
- Hiển thị `3 staged • 5 unstaged` với màu sắc: staged = xanh, unstaged = cam
- Click badge → chuyển focus xuống WorkingTree panel
- Data từ `useGitStatus` query (đã có)
- Badge tự ẩn khi không có changes

### 1.2 Keyboard Shortcuts cho Stage/Unstage

| Shortcut | Action |
|----------|--------|
| `Cmd+S` | Stage selected file (hoặc stage all nếu không có file selected) |
| `Cmd+U` | Unstage selected file (hoặc unstage all) |
| `Cmd+Shift+A` | Stage all (toggle) |
| `Cmd+Return` | Commit (đã có, giữ nguyên) |

- Tooltip trên buttons: `Stage (⌘S)`
- `Shift+Click` → multi-select files để stage batch

### 1.3 Quick Stage All Button

- Nút "Stage All" prominent trên unstaged section header
- Hiệu ứng click: scale bounce + checkmark animation
- Data: danh sách unstaged files từ query

### 1.4 Visual Commit Readiness Indicator

- Commit button glow accent khi có staged files + commit message không empty
- Empty message → disabled button + tooltip "Enter a commit message"
- Không staged files → disabled button + "Stage files to commit first"

---

## Phase 2: Merge & Conflict Resolution UX

### 2.1 Merge Preview Dialog

Xuất hiện trước khi merge, cho user review trước:
- **Branch selector** — dropdown với filter, show branch list
- **Status info** — `main is 3 ahead, 2 behind feature/xyz` (từ `useGitSyncStatus`)
- **Conflict preview** — conflicted files list với warning icon
- **Safe indicator** — green badge "No conflicts detected" khi clean
- **AI analysis** (optional, khi AI config có) — nút "Analyze merge risk"
- Buttons: "Merge" (default), "Merge --no-ff", "Cancel"

### 2.2 Inline Conflict Resolution trong Diff Viewer

Thay vì dialog riêng, tích hợp vào DiffViewer:
- Conflict files hiển thị trong WorkingTree với icon `⚠️`
- Click → mở DiffViewer với 3-panel: OURS | RESULT | THEIRS
- Gutter markers: `<<<<<<<`, `=======`, `>>>>>>>`
- Quick resolve buttons per hunk: Accept Ours / Accept Theirs / Accept Both / AI Resolve
- Progress bar: `Resolved 3/5 conflicts`
- Auto-detect khi hết conflicts → nút "Mark as Resolved" → commit merge

### 2.3 Merge Status Badge

- Toolbar badge khi đang merge: `Merging: feature/xyz`
- Click badge → expand: conflicted files list + resolved count
- "Abort Merge" button (danger, confirm dialog trước)

### 2.4 Quick Safe Merge

- Nếu detect không conflicts → merge immediate (1 click)
- Toast: `Merged feature/xyz → main`
- Auto-invalidate queries → graph + branch list refresh

---

## Phase 3: GitFlow Workflow UX

### 3.1 GitFlow Toolbar Section

Section mới trên toolbar với 3 dropdowns:
- **Feature** — Start / Finish / List
- **Release** — Start / Finish / List
- **Hotfix** — Start / Finish / List
- Chưa init GitFlow → disabled buttons + tooltip "Init GitFlow first"
- **Init GitFlow** button (hiện khi detect chưa init)

Button colors: Feature = orange, Release = blue, Hotfix = red

### 3.2 Feature Start/Finish

**Start:**
- Dialog: "Feature name" input (kebab-case auto-convert)
- Base branch: develop (default), có thể đổi dropdown
- Option: "Push to remote" checkbox
- Success → `git checkout -b feature/<name> develop` + toast + graph update

**Finish:**
- Preview: "Finish feature/xyz → merge into develop"
- Options: Regular merge / Squash / Rebase
- "Delete after finish" (default: yes)
- Summary: commit count trong feature branch
- Conflicts → redirect conflict resolver; Clean → merge + delete + toast

### 3.3 Release Start/Finish

**Start:**
- Input: semantic version (e.g. `1.2.3`)
- `git checkout -b release/1.2.3 develop`
- Optional: bump version file detect

**Finish:**
- Merge → main + develop
- Auto tag: `v1.2.3`
- Summary: diff since last release tag

### 3.4 Hotfix Start/Finish

**Start:**
- Input: version (e.g. `1.2.4`) + hotfix name
- Warning: "Creating from main — not develop"
- `git checkout -b hotfix/1.2.4 main`

**Finish:**
- Merge → main + develop
- Tag: `v1.2.4`
- Conflict check with develop

### 3.5 Visual Indicators

- Branch prefix icons: feature=orange, release=blue, hotfix=red
- Graph lane coloring theo prefix
- Graph badges (node decorations) cho gitflow branches

### 3.6 GitFlow Init Wizard

- Input: main branch name (default: main)
- Input: develop branch name (default: develop)
- Customizable prefixes
- Auto-create develop từ main nếu chưa tồn tại

---

## Phase 4: Command Palette & Search

### 4.1 Command Palette (Cmd+K)

- Overlay toàn màn hình, search bar auto-focus
- **Kết quả sections**:
  - **Commands** — git actions (commit, push, pull, fetch, merge, rebase)
  - **Branches** — switch branch (Enter → checkout), name + status
  - **Commits** — search commit messages (limit 10)
  - **Recent repos** — open recent repo
  - **Settings** — open settings, toggle theme
- Keyboard: ↑↓ navigate, Enter confirm, Escape close
- Recent commands: lưu top 5 recent actions (localStorage)

### 4.2 Inline Search trong Commit Graph

- Search bar trên graph header: `🔍 Search commits...`
- Filter mode: chỉ show commits matching query
- Match highlight: accent glow border
- Clear button (X)

### 4.3 Search History

- Auto-save 10 recent searches (localStorage)
- Recent searches hiển thị khi search bar empty
- "Clear history" link

---

## Phase 5: Branch Management UX

### 5.1 Current Branch Highlight

- Current branch sticky trên cùng branch list
- Bold + accent color + icon
- Status badge: `main • up to date` / `feature/xyz • 3 ahead`

### 5.2 Quick Branch Switcher (Cmd+B)

- Popup overlay gần vị trí cursor
- Search-as-you-type
- Enter → checkout ngay
- Current branch at top

### 5.3 Branch Context Menu

Right-click → menu:
- Checkout
- Delete (confirm)
- Rename (inline edit)
- Merge into current
- Rebase onto current
- Create branch from here
- Copy branch name

### 5.4 Branch Status Indicators

- `main` → `✓ up to date` (green)
- `feature/xyz` → `↑3 ahead` (orange)
- `feature/abc` → `↓2 behind` (red)
- `release/1.0` → `↕3 ahead, 2 behind` (yellow)
- Sync status từ `useGitSyncStatus` (đã có query)

---

## Phase 6: Settings Unification

### 6.1 Unified Settings Entry

- Toolbar gear → Settings dialog (giữ nguyên, đã có card theme picker)
- Remove ThemePicker from toolbar → integrate vào General tab
- `Cmd+,` → open settings
- Tabs: General, AI, Advanced

### 6.2 Settings Quick Actions

- Gear dropdown: Toggle Dark/Light Mode, Open Settings, Keyboard Shortcuts Reference
- Keyboard reference modal: full table of available shortcuts

---

## Implementation Notes

- **Dependencies**: Phase 1 độc lập, Phase 2-6 không phụ thuộc Phase 1
- **No new backend commands needed** — tất cả đều là frontend-only hoặc dùng commands đã có
- **TanStack Query invalidation** không thay đổi pattern
- **Keyboard shortcuts** dùng listener global ở MainLayout (như hiện tại)
- **Dialog system** giữ pattern hiện tại (string-keyed dialogComponents map)
