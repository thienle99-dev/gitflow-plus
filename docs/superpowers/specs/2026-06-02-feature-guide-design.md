# Feature Guide Dialog — Design Spec

## Overview

A standalone dialog that showcases all GitFlow Desktop features with descriptions, organized by category. Accessible from the Settings dropdown menu and via keyboard shortcut.

## Goals

1. Help new users discover the app's capabilities
2. Provide quick reference for existing features
3. Serve as a self-documenting feature catalog
4. Accessible anytime without interrupting workflow

## Entry Points

| Entry Point | Action |
|-------------|--------|
| Settings Dropdown | New "Feature Guide" menu item with book icon |
| Keyboard shortcut | `Cmd+Shift+H` (Help) |

## Dialog Structure

### Layout
- Modal dialog, 640px wide, max 80vh height
- Scrollable content area
- Header with title + close button (consistent with KeyboardShortcutsModal pattern)
- Sections grouped by category with icons

### Feature Categories

**1. Commit Graph**
- Canvas-based commit graph with branch visualization
- Branch lane coloring and merge line rendering
- Ref badges (branch/tag labels) on commits
- Right-click context menu: copy hash, checkout, create branch, cherry-pick, revert

**2. Working Tree & Commits**
- Stage/unstage individual files or batch operations
- Shift+Click multi-select for batch stage
- Visual commit readiness indicator
- AI-powered commit message generation
- AI commit scope suggestion for splitting large changes
- Amend last commit

**3. GitFlow Workflow**
- Feature: start/finish from develop branch
- Release: start/finish with auto-tagging
- Hotfix: start/finish from main with auto-tagging
- GitFlow initialization wizard

**4. AI Features**
- Generate commit messages from staged diff
- Code review with AI suggestions
- Explain commits in natural language
- AI-assisted conflict resolution
- Commit scope analysis for atomic commits

**5. Git Operations**
- Branch management (create, checkout, delete)
- Merge with conflict detection
- Interactive rebase
- Cherry-pick commits
- Stash management with diff preview
- Tag CRUD
- Blame view
- File history

**6. Diff Viewer**
- Split and unified diff modes
- Inline hunk actions (stage, unstage, discard)
- AI code review integration
- Syntax-aware rendering

**7. Remote & Sync**
- Pull, push, fetch operations
- Auto-fetch with configurable interval
- Sync status badges (ahead/behind)
- Clone repositories

**8. Productivity**
- Keyboard shortcuts for all major actions
- Command palette (search)
- Dark/light theme support
- Recent repositories
- Undo operations via reflog

### Visual Design

Each feature item:
```
┌─────────────────────────────────────────────┐
│ [Icon]  Feature Name                        │
│         Brief description of what it does   │
│         and how to use it                   │
└─────────────────────────────────────────────┘
```

Section header:
```
── Commit Graph ──────────────────────────────
```

## Files Changed

| File | Change |
|------|--------|
| `apps/desktop/src/components/features/dialogs/FeatureGuideDialog.tsx` | New: dialog component |
| `apps/desktop/src/components/ui/theme/SettingsDropdown.tsx` | Add "Feature Guide" menu item |
| `apps/desktop/src/components/layout/Toolbar.tsx` | Wire `onOpenFeatureGuide` callback |
| `apps/desktop/src/layouts/MainLayout.tsx` | Register `feature-guide` dialog + shortcut |

## Out of Scope

- Screenshots or animated GIFs (would require image assets)
- Interactive tutorials or step-by-step walkthroughs
- Feature usage analytics
