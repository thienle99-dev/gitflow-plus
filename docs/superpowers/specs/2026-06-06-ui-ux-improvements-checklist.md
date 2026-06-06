# UI/UX Improvements Checklist — GitFlow Desktop

> Generated: 2026-06-06
> Status: Planning

---

## Phase 1: Critical Fixes (Broken Animations + Consistency)

### 1.1 Fix Broken `animate-in` CSS Classes

Multiple components reference `tailwindcss-animate` classes (`animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-bottom-1`) but the plugin is **not installed**. These animations silently do nothing.

| # | File | Line | Broken Class | Fix |
|---|------|------|-------------|-----|
| 1 | `TitleBar.tsx` | 217 | `animate-in fade-in duration-100` | Replace with `anim-dialog-enter` |
| 2 | `BottomBar.tsx` | 307 | `animate-in fade-in slide-in-bottom-1` | Replace with `anim-palette-enter` |
| 3 | `Toolbar.tsx` | 210 | `animate-in fade-in duration-200` | Replace with `anim-overlay-enter` |
| 4 | `RightPanel.tsx` | 93 | `animate-in zoom-in-95 duration-200` | Replace with `anim-dialog-enter` |
| 5 | `RightPanel.tsx` | 183 | `animate-in fade-in duration-200` | Replace with `anim-overlay-enter` |
| 6 | `ErrorBoundary.tsx` | 119 | `animate-in slide-in-from-top-2` | Replace with `anim-slide-up-enter` (inverted) |

**Approach**: Use the existing custom CSS classes from `index.css` (`anim-dialog-enter`, `anim-overlay-enter`, `anim-palette-enter`, `anim-slide-up-enter`).

### 1.2 Standardize Border-Radius Tokens

Current inconsistency: `rounded-mac`, `rounded-lg`, `rounded`, `rounded-[4px]`, `rounded-[5px]`, `rounded-[3px]`.

| # | Token | Usage | Scope |
|---|-------|-------|-------|
| 7 | `rounded-mac` | Cards, dialogs, panels | Keep as primary |
| 8 | `rounded` | Small buttons, badges | Keep as secondary |
| 9 | `rounded-[4px]`, `rounded-[5px]`, `rounded-[3px]` | Various buttons | Replace with `rounded` |
| 10 | `rounded-lg` | Welcome screen, menus | Replace with `rounded-mac` |

### 1.3 Standardize Spacing Scale

Current mix: `gap-1`, `gap-1.5`, `gap-2`, `gap-2.5`, `gap-3` in similar contexts.

| # | Area | Fix |
|---|------|-----|
| 11 | Toolbar button group internals | Standardize to `gap-0.5` (p-0.5 container) |
| 12 | Toolbar between groups | Standardize to `gap-2` |
| 13 | BottomBar items | Standardize to `gap-3` |
| 14 | Sidebar section items | Standardize to `gap-1` |

---

## Phase 2: Focus Management & Accessibility

### 2.1 Dialog Focus Trap

| # | File | Fix |
|---|------|-----|
| 15 | `Dialog.tsx` | Add `aria-modal="true"` and focus trap (first focusable element on open, Tab cycles within) |
| 16 | `CommandPalette.tsx` | Add focus trap for search input |
| 17 | `ConfirmDialog.tsx` | Auto-focus the primary action button |
| 18 | All dialogs | Return focus to trigger element on close |

### 2.2 Keyboard Navigation

| # | File | Fix |
|---|------|-----|
| 19 | `FileChangeList.tsx` | Arrow keys to navigate file list, Enter to open diff, Space to toggle stage |
| 20 | `Sidebar.tsx` | Arrow keys to navigate branches, Enter to checkout |
| 21 | `CommitBox.tsx` | Cmd+Enter to commit (already exists), Tab to cycle through AI actions |

### 2.3 ARIA Labels

| # | File | Line | Fix |
|---|------|------|-----|
| 22 | `BottomBar.tsx` | 237 | Add `aria-label` to staging stats section |
| 23 | `BottomBar.tsx` | 219 | Add `aria-label` to sync stats section |
| 24 | `Toolbar.tsx` | 269 | Add `aria-label` to action button groups |
| 25 | `Sidebar.tsx` | 314 | Add `aria-label` to branch tree sections |

---

## Phase 3: Visual Transitions & Feedback

### 3.1 RightPanel Content Transitions

| # | File | Fix |
|---|------|-----|
| 26 | `RightPanel.tsx` | Add fade transition when switching between WorkingTree → DiffViewer → CommitDetail |
| 27 | `RightPanel.tsx` | Add `useAnimatedMount` for full-screen diff overlay (currently instant swap) |

### 3.2 File Stage/Unstage Animation

| # | File | Fix |
|---|------|-----|
| 28 | `FileChangeList.tsx` | Add slide animation when files move between staged ↔ unstaged sections |
| 29 | `FileChangeList.tsx` | Add fade-in for new files appearing in the list |

### 3.3 Sync Status Pulse

| # | File | Fix |
|---|------|-----|
| 30 | `BottomBar.tsx` | Add brief pulse animation when ahead/behind counts change |
| 31 | `BottomBar.tsx` | Add subtle glow on conflict indicator when conflicts appear |

### 3.4 Theme Transition

| # | File | Fix |
|---|------|-----|
| 32 | `index.css` | Add `* { transition: background-color 0.3s, color 0.3s, border-color 0.3s }` during theme switch |
| 33 | `repo.ts` | Temporarily add `.theme-transitioning` class to `<html>` during `applyTheme()` |

### 3.5 Sidebar Loading Skeleton

| # | File | Fix |
|---|------|-----|
| 34 | `Sidebar.tsx` | Add `SkeletonSection` for branches while loading |
| 35 | `Sidebar.tsx` | Add `SkeletonTagRow` for tags while loading |

---

## Phase 4: Enhanced Interactions

### 4.1 Edit Menu Functionality

| # | File | Line | Fix |
|---|------|------|-----|
| 36 | `TitleBar.tsx` | 110-117 | Wire Undo/Redo to `document.execCommand` or app-level undo stack |
| 37 | `TitleBar.tsx` | 113-116 | Wire Cut/Copy/Paste to `navigator.clipboard` |

### 4.2 Drag-and-Drop Staging

| # | File | Fix |
|---|------|-----|
| 38 | `FileChangeList.tsx` | Implement HTML5 drag-and-drop between staged/unstaged sections |
| 39 | `FileChangeList.tsx` | Add visual drop zone indicator |

### 4.3 Commit Hash Copy

| # | File | Fix |
|---|------|-----|
| 40 | `CommitDetail.tsx` | Make commit hash clickable to copy |
| 41 | `CommitGraph.tsx` | Add tooltip with copy button on commit hover |

### 4.4 Welcome Screen Enhancement

| # | File | Fix |
|---|------|-----|
| 42 | `MainLayout.tsx` | Replace single button with quick-action cards (Open, Clone, Recent) |
| 43 | `MainLayout.tsx` | Add keyboard shortcut hints (⌘O to open, etc.) |

---

## Phase 5: Micro-Interactions & Polish

### 5.1 Button Feedback

| # | Area | Fix |
|---|------|-----|
| 44 | All primary buttons | Add `active:scale-[0.97]` for press feedback |
| 45 | Toolbar action buttons | Add subtle ripple effect on click |
| 46 | Sidebar branch items | Add highlight animation on checkout |

### 5.2 Loading States

| # | Area | Fix |
|---|------|-----|
| 47 | Toolbar Pull/Fetch/Push | Add spinner animation during operation |
| 48 | Sidebar refresh | Add shimmer while branches reload |
| 49 | CommitBox AI generate | Add typing animation for generated message |

### 5.3 Empty State Enhancements

| # | Area | Fix |
|---|------|-----|
| 50 | WorkingTree | Add illustration when no changes (clean working tree) |
| 51 | RightPanel | Add illustration when no file selected |
| 52 | SearchDialog | Add recent searches when empty |

---

## Verification

After each phase:

1. **TypeScript**: `cd apps/desktop && npx tsc --noEmit` — zero errors
2. **Visual**: Manual check of all affected components
3. **Keyboard**: Tab through all dialogs, verify focus trap
4. **Animation**: Verify enter/exit animations on all panels and dialogs
5. **Theme**: Switch between all themes, verify smooth transition
6. **Accessibility**: Run axe DevTools audit on main layout

---

## Priority Matrix

| Priority | Items | Effort | Impact |
|----------|-------|--------|--------|
| P0 Critical | #1-6 (broken animations) | Low | High — animations are completely broken |
| P1 High | #15-18 (focus trap), #26-27 (panel transitions) | Medium | High — accessibility + UX |
| P2 Medium | #7-14 (consistency), #28-35 (transitions + skeleton) | Medium | Medium — visual polish |
| P3 Low | #36-52 (enhanced interactions, micro-interactions) | High | Low — nice-to-have |
