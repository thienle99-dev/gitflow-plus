# GitFlow Desktop — Design Spec & Implementation Plan

## Context

Build a cross-platform Git GUI desktop app (like GitKraken) called **GitFlow Desktop**. The app provides visual commit graph, Git actions, diff viewing, and eventually GitHub/GitLab integration. Target: macOS/Windows/Linux. Philosophy: lightweight (Tauri over Electron), fast, focused on daily Git workflow.

## Architecture Decision

**Frontend-driven state (Approach A):** Frontend (Zustand + TanStack Query) is source of truth for UI state. Rust backend is a thin "git executor" — receives commands, returns results, pushes file-change events. Simple, fast to ship, easy to debug.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Desktop framework | Tauri 2.x |
| Frontend | React 18 + TypeScript |
| Bundler | Vite |
| State management | Zustand (UI) + TanStack Query (git data) |
| Styling | Tailwind CSS (dark/light via `darkMode: 'class'`) |
| Commit graph | Custom SVG + virtual scroll |
| Diff viewer | CodeMirror 6 (`@codemirror/merge`) |
| Backend | Rust (Tauri commands) |
| Git engine | Git CLI subprocess |
| File watching | `notify` crate |
| Auth token storage | `keyring` crate |
| Panel resizing | `react-resizable-panels` |
| Testing | Vitest + Testing Library (frontend), Rust unit tests (backend) |

---

## Project Structure

```
gitflow-desktop/
├── package.json                    # workspace root
├── apps/
│   └── desktop/
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── layouts/
│           │   └── MainLayout.tsx
│           ├── pages/
│           │   └── RepoView.tsx
│           ├── components/
│           │   ├── sidebar/
│           │   ├── graph/
│           │   ├── detail/
│           │   ├── diff/
│           │   └── common/
│           ├── stores/
│           │   ├── repo.ts
│           │   └── ui.ts
│           ├── queries/
│           │   ├── useGitLog.ts
│           │   ├── useGitStatus.ts
│           │   ├── useGitBranches.ts
│           │   └── useGitDiff.ts
│           ├── api/
│           │   └── tauri.ts
│           └── lib/
│               ├── graph-layout.ts
│               └── parse-diff.ts
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/
        ├── main.rs
        ├── commands/
        │   ├── mod.rs
        │   ├── repo.rs
        │   ├── log.rs
        │   ├── status.rs
        │   ├── branch.rs
        │   ├── commit.rs
        │   ├── diff.rs
        │   └── remote.rs
        └── watcher/
            ├── mod.rs
            └── fs_watcher.rs
```

---

## Data Flow

### Frontend → Backend (Commands)
```
React Component → TanStack Query hook → api/tauri.ts (typed invoke) → Tauri IPC → Rust command → git CLI → parse stdout → return struct
```

### Backend → Frontend (File Watcher Events)
```
notify crate → debounce 300ms → classify (.git/refs? worktree? HEAD?) → emit Tauri event → Frontend listener → invalidate TanStack queries
```

**Event types:**
- `repo:worktree-changed` → invalidate status
- `repo:refs-changed` → invalidate branches + log
- `repo:head-changed` → invalidate all

**Query keys:** `["git", repoPath, "log"]`, `["git", repoPath, "status"]`, etc.

---

## Data Models

```typescript
type Commit = {
  hash: string
  parents: string[]
  author: string
  email: string
  date: string
  message: string
  refs: Ref[]
}

type Ref = {
  name: string
  type: "branch" | "remote" | "tag"
}

type FileChange = {
  path: string
  oldPath?: string          // for renames
  status: "modified" | "added" | "deleted" | "renamed" | "untracked"
  staged: boolean
}

type Branch = {
  name: string
  current: boolean
  remote?: string
  ahead?: number
  behind?: number
}
```

---

## Feature Phases

### Phase 1 — Core Git Workflow (MVP)
- Open local repo (file picker + recent repos list)
- Commit graph: custom SVG, virtual scroll, paginated (200/load)
- Branch list (sidebar): local + remote, checkout on double-click
- File changed list: staged/unstaged sections
- Diff viewer: split + unified mode (CodeMirror 6)
- Stage / unstage (per file or bulk)
- Commit (message + amend option)
- Pull / push / fetch
- Checkout branch
- Create branch (from current HEAD or selected commit)
- File watcher: realtime status refresh

### Phase 2 — Advanced Git
- Merge branch (right-click → merge into current)
- Conflict resolver: 3-panel (ours/theirs/result), accept buttons per hunk
- Interactive rebase: pick/reword/squash/drop via `GIT_SEQUENCE_EDITOR`
- Stash: list, push, pop, apply, drop
- Tags: create (lightweight/annotated), delete, push
- Git log search: by message, author, date range, file path

### Phase 3 — Remote Integration
- GitHub/GitLab OAuth (token in OS keychain)
- PR list: fetch via REST API, filter open/closed/author
- Create PR: title, description, base/head branch, template support
- Workspace: named collection of repos, bulk fetch/pull, status overview

---

## Commit Graph Design

**Layout algorithm:**
1. Build DAG from commit list
2. Assign lanes: HEAD branch = lane 0, forks get next available lane, freed on merge
3. Assign Y positions: fixed row height (32px), chronological top-to-bottom
4. Draw edges: straight lines + bezier curves for merge connections

**Performance:**
- Virtual scroll: render only viewport + ±50 row buffer
- Paginated git log: 200 commits/load, fetch more on scroll
- Incremental layout: new commits extend existing layout
- Branch coloring: 8-10 color palette, consistent per lane

**Interaction:**
- Click → select commit → show detail
- Hover → tooltip
- Right-click → context menu
- Horizontal scroll for wide graphs

---

## Diff Viewer Design

- Split view (default): two CodeMirror instances, scroll synced
- Unified view: single instance with gutter markers
- Uses `@codemirror/merge` extension
- Syntax highlight via `@codemirror/lang-*` (auto-detect by extension)
- Edge cases: binary files (message), large diffs (>1MB warning), new/deleted files

---

## Main Layout

```
┌──────────────┬─────────────────────┬──────────────────┐
│  Sidebar     │   Commit Graph      │  Right Panel     │
│  (250px)     │   (flex-1)          │  (350px)         │
│  branches    │   SVG graph         │  commit detail   │
│  remotes     │                     │  OR              │
│  tags        │                     │  working tree    │
├──────────────┴─────────────────────┴──────────────────┤
│  Bottom Bar: operation logs, progress                  │
└────────────────────────────────────────────────────────┘
```

- Panels resizable via `react-resizable-panels`
- Sidebar collapsible (Cmd+B)
- Right panel: working tree (no selection) or commit detail (selected)
- Bottom bar: auto-show during operations

---

## Conflict Resolver (Phase 2)

3-panel layout:
- Top-left: OURS (read-only CodeMirror)
- Top-right: THEIRS (read-only CodeMirror)
- Bottom: RESULT (editable)
- Per-hunk buttons: Accept Ours / Accept Theirs / Accept Both
- Save → `git add`, all resolved → "Complete Merge" button

---

## UI/UX Design Decisions

**Visual style: IDE-style dense + macOS native feel**
- Nền tối mặc định, viền mỏng, compact layout
- Information-dense: hiện nhiều data cùng lúc (graph + files + diff)
- Tham khảo: Xcode, SF Symbols aesthetic, GitKraken density
- Font: `-apple-system` / SF Pro cho UI text, SF Mono / monospace cho code/hash
- Spacing: 4-8px gaps, 28-32px row height cho lists (macOS standard row height)
- Colors: muted palette, accent colors cho branch lanes + status indicators
- **macOS-inspired elements:**
  - Sidebar: Xcode/Finder style — translucent background, grouped sections với disclosure triangles
  - Vibrancy effect: sidebar và toolbar dùng `backdrop-filter: blur()` (như NSVisualEffectView)
  - Window controls: traffic light buttons tích hợp vào titlebar (Tauri custom titlebar)
  - Border radius: 6-8px cho cards/panels (macOS standard), 4px cho buttons
  - Segmented controls thay vì tabs (cho split/unified toggle, staged/unstaged filter)
  - Toolbar: unified titlebar + toolbar style (như Xcode/Finder toolbar)
  - Hover states: subtle background fill (không outline) — giống macOS list selection
  - Selection: accent color fill với white text (system accent color aware)

**Interaction pattern: Toolbar + Context menu**
- Top toolbar: common actions (pull, push, fetch, commit, branch)
- Right-click context menu: trên commits, branches, files, tags
- Keyboard shortcuts cho power users (nhưng không bắt buộc command palette cho MVP)
- Toolbar icons + text labels (có thể collapse thành icon-only khi window nhỏ)

**Information display: All-in-one view**
- 3-panel layout luôn visible (sidebar + graph + detail)
- Không dùng tabs hay drill-down cho core workflow
- Diff viewer mở inline trong right panel (hoặc expand full-width khi cần)
- Bottom bar cho logs/progress — collapse khi idle

**Motion: Subtle transitions**
- Panel resize: 150ms ease-out
- State changes (select commit, toggle staged): 100-150ms fade
- List expand/collapse: 200ms slide
- Không dùng spring/bounce — giữ snappy
- Respect `prefers-reduced-motion` OS setting

**Component patterns:**
- Buttons: ghost style (transparent bg, border on hover) cho toolbar
- Lists: hover highlight, selected = accent bg
- Inputs: minimal border, focus ring
- Modals: backdrop blur, centered, max-width 500px
- Toast notifications: bottom-right, auto-dismiss 5s
- Context menu: native-feeling (sharp corners, compact padding)

---

## Cross-cutting Concerns

**Error handling:** Rust returns `Result<T, String>`, frontend shows toast via TanStack Query `onError`. Critical errors → modal.

**Dark/Light theme:** Tailwind `darkMode: 'class'`, persist in localStorage, default follows OS.

**Config storage:**
- `~/.gitflow-desktop/config.json` — app preferences
- `~/.gitflow-desktop/workspaces.json` — workspace definitions
- Window state via `tauri-plugin-window-state`

**Performance targets:**
- Open repo: < 1s
- 200 commits + graph: < 500ms
- Status refresh: < 200ms
- Diff display: < 300ms

---

## Implementation Order (Phase 1)

1. **Scaffold** — Tauri 2 + React + Vite + Tailwind + TypeScript setup
2. **Rust commands** — repo.rs, log.rs, status.rs, branch.rs (git CLI wrappers)
3. **API layer** — typed invoke wrappers + TanStack Query hooks
4. **Layout shell** — MainLayout with resizable panels
5. **Sidebar** — branch list, remotes, tags
6. **Commit graph** — DAG layout algorithm + SVG rendering + virtual scroll
7. **Right panel** — commit detail + file changed list
8. **Working tree** — stage/unstage + commit form
9. **Diff viewer** — CodeMirror 6 split/unified
10. **Git actions** — pull/push/fetch/checkout/create branch
11. **File watcher** — notify crate + event emission + query invalidation
12. **Polish** — dark/light theme, keyboard shortcuts, recent repos

---

## Verification

- Run `cargo tauri dev` — app launches, no crashes
- Open a real git repo — commit graph renders correctly
- Test stage/unstage/commit cycle
- Test pull/push with a remote
- Test file watcher: edit file externally → status updates automatically
- Test virtual scroll: open repo with 1000+ commits → smooth scrolling
- Test diff viewer: modified, new, deleted, renamed files
- Rust tests: `cargo test` in src-tauri/
- Frontend tests: `npm test` in apps/desktop/
