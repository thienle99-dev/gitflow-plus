# Right Panel Redesign — macOS Inspector Pattern

> Date: 2026-06-25
> Status: Approved
> Scope: RightPanel, CommitDetail, WorkingTree, DiffViewer, FileList, navigation state

## Problem Statement

Right panel has 4 UX pain points:
1. **Commit detail too cluttered** — metadata dump with no visual hierarchy
2. **File list unclear** — status icons too small, actions hidden
3. **Diff viewer lacking** — no keyboard nav, no word-diff, no gutter actions
4. **No visual hierarchy** — everything has equal weight, flat layout

## Design Principles

- macOS Inspector aesthetic: SF Pro typography hierarchy, section-based layout, hairline separators, generous whitespace
- Progressive disclosure: collapse secondary info, reveal on demand
- Consistent file list: shared component across WorkingTree and CommitDetail
- Stack-based navigation: breadcrumb replaces ad-hoc `selectedCommit`/`selectedFile` state

---

## Section 1: Overall Structure

### Current

Flat tab switching — WorkingTree | CommitDetail | DiffViewer. No visual hierarchy, each view takes full panel.

### Proposed — 3-Zone Layout

```
┌─────────────────────────────────────────────┐
│  [Zone A: Navigation Bar]                   │
│  Segmented: Working Tree | Commit Detail     │
│  (commit detail auto-shows on select)       │
├─────────────────────────────────────────────┤
│                                             │
│  [Zone B: Content Area]                     │
│  Scrollable, fills remaining space          │
│                                             │
│  WorkingTree → file list + commit box       │
│  CommitDetail → commit info + file list     │
│  DiffViewer → split/unified diff            │
│                                             │
├─────────────────────────────────────────────┤
│  [Zone C: Status Bar]                       │
│  File count, diff stats, keyboard hints     │
│  (subtle, 24px height)                      │
└─────────────────────────────────────────────┘
```

### Key Changes

- **No explicit Diff tab** — clicking a file in WorkingTree/CommitDetail replaces Zone B with Diff view; Zone A becomes breadcrumb ("← File List")
- **Breadcrumb navigation** instead of tabs when drilling down
- **Status bar** for context: "3 files changed, +42 -18" or "j/k navigate hunks"

---

## Section 2: Commit Detail View

### Current

Cluttered metadata dump — hash, author, date, refs, parent hashes all at equal weight.

### Proposed — Section-Based Inspector

```
┌─────────────────────────────────────────────┐
│  ┌─ HEADER ──────────────────────────────┐  │
│  │  abc1234  ● main  v2.1.0             │  │
│  │  (hash=monospace muted, badges=pills) │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ AUTHOR ──────────────────────────────┐  │
│  │  👤 John Doe                          │  │
│  │  john@example.com · 2 hours ago       │  │
│  │  (name=body, email+time=footnote)     │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ MESSAGE ─────────────────────────────┐  │
│  │  feat(auth): add OAuth2 support       │  │
│  │                                       │  │
│  │  Implement GitHub OAuth2 flow for     │  │
│  │  login. Includes token refresh and    │  │
│  │  PKCE challenge.                      │  │
│  │  (title=bold, body=muted, 1.6 lh)    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ CHANGED FILES (4) ──── +120 -34 ────┐  │
│  │  ▸ src/auth.ts          M   +45 -12   │  │
│  │  ▸ src/api/handler.ts   M   +30 -8    │  │
│  │  ▸ tests/auth.test.ts   A   +45 -0    │  │
│  │  ▸ README.md            M   +0 -14    │  │
│  │  (collapsible, hover→reveal actions,  │  │
│  │   click→drill to diff)                │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ METADATA (collapsed) ───────────────┐  │
│  │  ▸ Parent, GPG, tree hash...         │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ ACTIONS ─────────────────────────────┐  │
│  │  [Revert]  [Cherry-pick]  [AI Explain]│  │
│  │  (secondary buttons, bottom-pinned)   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Typography Hierarchy (SF Pro)

| Level | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| Title 3 | 17px | Bold | Primary | Author name, message title |
| Body | 13px | Regular | Primary | Message body, file names |
| Footnote | 11px | Regular | Muted | Email, date, hash, stats |

### File List in Commit Detail

- Status letter (M/A/D/R) with clear colors instead of tiny icons
- `+N -N` stats right-aligned, monospace
- Hover row → background highlight + action buttons fade in
- Click → breadcrumb navigation to Diff view

---

## Section 3: Working Tree View

### Current

Monolithic 1618-line component — staging, commit box, file list, AI features all mixed together.

### Proposed — Clean Separation

```
┌─────────────────────────────────────────────┐
│  ┌─ COMMIT BOX ─────────────────────────┐  │
│  │  ┌────────────────────────────────┐   │  │
│  │  │ Write a commit message...      │   │  │
│  │  └────────────────────────────────┘   │  │
│  │  [Commit]                    3 staged │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ STAGED (3) ─────────────────────────┐  │
│  │  ● src/auth.ts           M  +45 -12  │  │
│  │  ● src/api/handler.ts    M  +30 -8   │  │
│  │  ● tests/auth.test.ts    A  +45 -0   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ UNSTAGED (2) ───────────────────────┐  │
│  │  ○ README.md             M   +0 -14  │  │
│  │  ○ .env.example          M   +2 -1   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ UNTRACKED (1) ──────────────────────┐  │
│  │  ○ tmp/debug.log         ?   +88     │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ AI ─────────────────────────────────┐  │
│  │  [✨ Suggest message] [🔍 Review]    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Key Changes

- **Commit box top** — always visible, no scrolling needed
- **Grouped by status**: Staged / Unstaged / Untracked — collapsible sections with count badges
- **Filled circle (●)** = staged, **Hollow circle (○)** = unstaged
- **Click file** → breadcrumb to Diff view
- **Hover row** → Stage/Unstage/Discard buttons fade in right
- **AI actions** — secondary, bottom section, collapsed by default

### Staging UX

- Single click on circle → stage/unstage (immediate, no confirmation)
- Hover row → "Discard" button (red, with confirm tooltip)
- `Cmd+A` select all, `Cmd+Shift+A` deselect all
- Keyboard: arrow keys navigate, Space toggle stage, Enter open diff

---

## Section 4: Diff Viewer

### Current

Basic inline/side-by-side, no keyboard nav, no word-diff, no gutter actions.

### Proposed — macOS Native Polish

```
┌─────────────────────────────────────────────┐
│  ← File List   src/auth.ts                 │
│  ─────────────────────────────────────────  │
│  ┌─ DIFF TOOLBAR ────────────────────────┐  │
│  │  [Inline | Split]    ← hunk →        │  │
│  │  1/3 hunks    [Word diff ✓]          │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ @@ -1,12 +1,18 @@ imports           │  │
│  │    import { foo } from 'bar'         │  │
│  │  + import { OAuth } from 'oauth2'    │  │
│  │    import { config } from 'config'   │  │
│  │  - const secret = 'hardcoded'        │  │
│  │  + const secret = config.getSecret() │  │
│  │    ...                               │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Toolbar

- **Segmented control** (not tabs): Inline | Split — macOS native feel
- **Hunk navigator**: left/right arrow buttons + "2/5 hunks" label
- **Word diff toggle**: checkbox, off by default
- Compact toolbar, 32px height

### Diff Rendering

- **Hunk headers**: subtle background, monospace, muted color
- **Added lines**: green tint background (`rgba(0,180,0,0.08)`), green gutter `+`
- **Removed lines**: red tint background (`rgba(200,0,0,0.08)`), red gutter `-`
- **Word-level highlights**: stronger tint within changed lines
- **Line numbers**: gutter, monospace 11px, muted
- **Current hunk**: subtle left border accent (blue, 2px)

### Split View Specifics

- Left = old, Right = new, aligned by hunks
- Synced scrolling (always on)
- Gutter connect lines between matching regions (subtle curves)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Next/prev hunk |
| `]` / `claude-opus-4.8;        // history stack for back/forward
  current: NavItem;        // active view
  breadcrumb: NavItem[];   // derived: path from root to current
}
  current: NavItem;        // active view
  breadcrumb: NavItem[];   // derived: path from root to current
}

type NavItem =
  | { type: 'working-tree' }
  | { type: 'commit-detail'; commitHash: string }
  | { type: 'diff'; filePath: string; commitHash?: string }
```

### Breadcrumb Bar

```
Working Tree > src/auth.ts
     ^ back    ^ current (no click)
```
```
Commit abc1234 > src/auth.ts
     ^ back         ^ current
```

- Breadcrumb items are clickable (navigate back)
- `Cmd+claude-opus-4.8` — back/forward (like browser)
- `Cmd+Up` — jump to root of breadcrumb

### State Updates

- Click file in list → push `{ type: 'diff', filePath, commitHash? }` onto stack
- Click "Back" or breadcrumb → pop stack
- Select different commit → push `{ type: 'commit-detail', commitHash }`
- Working tree button → reset to root

### Zustand Store Changes

```typescript
// Remove: selectedCommit, selectedFile
// Add:
panelNav: {
  stack: NavItem[];
  current: NavItem;
}
// Derived:
breadcrumb: computed from stack + current
```

---

## Section 7: Animations & Transitions

### Route Transitions (Zone B content change)

- Cross-fade 150ms ease-out — content fades out 150ms, new content fades in 150ms
- No slide animations (macOS native apps don't slide panels)

### Micro-Interactions

- **Hover row**: background color transition 100ms ease
- **Action buttons fade-in**: opacity 0 to 1, 100ms, on row hover
- **Section collapse/expand**: height 200ms ease-in-out, content fade 150ms
- **Status badge**: color pop on stage/unstage, 100ms
- **Breadcrumb**: no animation, instant switch

### Implementation

- CSS transitions only, no JS animation library needed
- Use Tailwind `transition-all duration-150` for consistency
- `prefers-reduced-motion` → disable all transitions

### Empty State Transitions

- Clean → files appear: staggered fade-in 50ms per file (max 300ms total)
- Files → clean: simultaneous fade-out 200ms

### What NOT to Animate

- Panel resize (instant, like macOS native)
- Theme switch (instant)
- Scroll position (instant, preserve on back navigation)

---

## Section 8: Phasing

### Phase 1 — Core (MVP)

- `<FileList>` shared component (tree grouping, status colors, hover actions)
- Navigation stack + breadcrumb (replace `selectedCommit`/`selectedFile` in ui store)
- Commit Detail view (section-based, typography hierarchy)
- Working Tree view (grouped by status, commit box top)
- Status bar

### Phase 2 — Diff Polish

- Diff toolbar redesign (segmented control, hunk navigator)
- Keyboard shortcuts (j/k/]/[/w/s)
- Word diff toggle
- Hunk fold/unfold

### Phase 3 — Animations & Empty States

- CSS cross-fade transitions
- Staggered file list animations
- Polished empty states
- `prefers-reduced-motion` support

### Phase 4 — Polish

- Split view connect curves
- File tree expand/collapse animation
- Search in diff (Cmd+F)
- Context menus

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `components/layout/RightPanel.tsx` | Rewrite | 3-zone layout + breadcrumb navigation |
| `components/features/commit/CommitDetail.tsx` | Rewrite | Section-based inspector layout |
| `components/features/working-tree/WorkingTree.tsx` | Rewrite | Grouped sections, commit box top |
| `components/features/diff/DiffToolbar.tsx` | Rewrite | Segmented control, hunk navigator |
| `components/features/diff/DiffViewer.tsx` | Update | Keyboard nav, word diff, fold/unfold |
| `components/ui/FileList.tsx` | Create | Shared file list with tree grouping |
| `stores/ui.ts` | Update | Replace selectedCommit/selectedFile with panelNav stack |
| `components/layout/StatusBar.tsx` | Create | Status bar component |

## Verification

After each phase:
1. TypeScript: `cd apps/desktop && npx tsc --noEmit` — zero errors
2. Visual: manual check all affected components across themes
3. Keyboard: tab through all interactive elements, verify shortcuts
4. Animation: verify transitions on panel switches
5. Back/forward navigation: verify breadcrumb + keyboard shortcuts
6. Staging: verify stage/unstage cycle with new UI
