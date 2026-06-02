# Feature Guide Dialog — Implementation Plan

## File Structure

### New Files
```
apps/desktop/src/components/features/dialogs/FeatureGuideDialog.tsx — Feature guide dialog component
```

### Modified Files
```
apps/desktop/src/components/ui/theme/SettingsDropdown.tsx — Add "Feature Guide" menu item
apps/desktop/src/components/layout/Toolbar.tsx — Wire onOpenFeatureGuide callback
apps/desktop/src/layouts/MainLayout.tsx — Register dialog + add Cmd+Shift+H shortcut
```

---

## Task 1: Create FeatureGuideDialog Component

**File:** `apps/desktop/src/components/features/dialogs/FeatureGuideDialog.tsx`

### Component Structure

```typescript
interface FeatureGuideDialogProps {
  open: boolean;
  onClose: () => void;
}
```

### Feature Data

Define a static array of feature sections, each with:
- `category`: string (section header)
- `icon`: Lucide icon component
- `features`: array of `{ name: string; description: string; icon: LucideIcon }`

### Sections (8 categories, ~30 features total):

1. **Commit Graph** — `GitBranch` icon
   - Canvas graph with branch visualization
   - Branch lane coloring and merge lines
   - Ref badges on commits
   - Right-click context menu (copy hash, checkout, create branch, cherry-pick, revert)

2. **Working Tree & Commits** — `FileText` icon
   - Stage/unstage files with batch operations
   - Shift+Click multi-select
   - Visual commit readiness indicator
   - AI commit message generation
   - AI commit scope suggestion
   - Amend last commit

3. **GitFlow Workflow** — `GitBranchPlus` icon
   - Feature start/finish from develop
   - Release start/finish with auto-tagging
   - Hotfix start/finish from main
   - GitFlow init wizard

4. **AI Features** — `Sparkles` icon
   - Generate commit messages from diff
   - Code review with suggestions
   - Explain commits in natural language
   - AI-assisted conflict resolution
   - Commit scope analysis

5. **Git Operations** — `GitCommit` icon
   - Branch management (create, checkout, delete)
   - Merge with conflict detection
   - Interactive rebase
   - Cherry-pick commits
   - Stash management with diff preview
   - Tag CRUD
   - Blame view
   - File history

6. **Diff Viewer** — `FileDiff` icon
   - Split and unified diff modes
   - Inline hunk actions (stage, unstage, discard)
   - AI code review integration

7. **Remote & Sync** — `RefreshCw` icon
   - Pull, push, fetch operations
   - Auto-fetch with configurable interval
   - Sync status badges (ahead/behind)
   - Clone repositories

8. **Productivity** — `Zap` icon
   - Keyboard shortcuts (Cmd+?)
   - Search commits (Cmd+F)
   - Dark/light themes
   - Recent repositories
   - Undo via reflog

### Layout Pattern

Follow [`KeyboardShortcutsModal.tsx`](apps/desktop/src/components/features/dialogs/KeyboardShortcutsModal.tsx) pattern:
- Fixed overlay with backdrop
- Rounded modal with header (icon + title + close button)
- Scrollable content area
- Each section: category header + card with feature list
- Each feature: icon + name + description in a row

### Styling

- Use existing Tailwind classes from the design system
- Section headers: `text-3xs font-semibold text-text-muted uppercase tracking-wider`
- Feature cards: `bg-surface-1-30 border border-border-40 rounded-mac p-3.5`
- Feature items: flex row with icon, name (bold), description (muted)
- Dialog width: `w-[640px]`, max height: `max-h-[80vh]`

---

## Task 2: Add "Feature Guide" to SettingsDropdown

**File:** `apps/desktop/src/components/ui/theme/SettingsDropdown.tsx`

### Changes

1. Add `onOpenFeatureGuide` to `SettingsDropdownProps` interface
2. Add new menu item after "Keyboard Shortcuts":

```tsx
<button
  onClick={() => {
    onOpenFeatureGuide();
    setOpen(false);
  }}
  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors text-left"
>
  <Book size={13} />
  Feature Guide
</button>
```

3. Import `Book` from lucide-react

---

## Task 3: Wire Callbacks in Toolbar

**File:** `apps/desktop/src/components/layout/Toolbar.tsx`

### Changes

Pass new callback to SettingsDropdown:

```tsx
<SettingsDropdown
  onOpenSettings={() => openDialog("settings")}
  onOpenKeyboardShortcuts={() => openDialog("keyboard-shortcuts")}
  onOpenFeatureGuide={() => openDialog("feature-guide")}
/>
```

---

## Task 4: Register Dialog + Keyboard Shortcut in MainLayout

**File:** `apps/desktop/src/layouts/MainLayout.tsx`

### Changes

1. Import `FeatureGuideDialog`
2. Add to `dialogComponents`:
   ```typescript
   "feature-guide": <FeatureGuideDialog open={true} onClose={closeDialog} />,
   ```
3. Add keyboard shortcut `Cmd+Shift+H` in the `handleKeyDown` callback:
   ```typescript
   if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "h") {
     e.preventDefault();
     openDialog("feature-guide");
   }
   ```

---

## Task 5: Verification

- `npx tsc --noEmit` passes
- Dialog opens from Settings dropdown
- Dialog opens with Cmd+Shift+H
- All 8 sections render with correct icons and descriptions
- Dialog scrolls properly with many features
- Close button and Esc key dismiss the dialog
- Styling matches existing dialog patterns (KeyboardShortcutsModal)

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] FeatureGuideDialog renders all 8 sections
- [ ] Each section has icon, name, and description
- [ ] Dialog is scrollable when content exceeds viewport
- [ ] Settings Dropdown shows "Feature Guide" item
- [ ] Cmd+Shift+H opens the dialog
- [ ] Esc closes the dialog
- [ ] Styling is consistent with KeyboardShortcutsModal
