# Components Folder Reorganization Plan

## Goal

Reorganize `apps/desktop/src/components` into clearer ownership boundaries:

- `ui`: reusable low-level UI components.
- `layout`: app shell and persistent layout components.
- `features`: domain-specific GitFlow Desktop features.

This removes the temporary `phase2` naming, reduces ambiguity in `common`, and makes future feature work easier to place.

## Proposed Structure

```txt
components/
  ui/
    form/
      Input.tsx
      Select.tsx
      Switch.tsx
      index.ts
    feedback/
      ErrorNotification.tsx
    overlay/
      ContextMenu.tsx
    theme/
      ThemePicker.tsx
      SettingsDropdown.tsx

  layout/
    Toolbar.tsx
    BottomBar.tsx
    RightPanel.tsx

  features/
    graph/
      CommitGraph.tsx
      CommitTooltip.tsx
      useCanvasRenderer.ts
      useHitTest.ts

    working-tree/
      WorkingTree.tsx

    commit-detail/
      CommitDetail.tsx

    diff/
      DiffViewer.tsx

    sidebar/
      Sidebar.tsx
      SubmoduleEntry.tsx

    submodules/
      SubmoduleDetail.tsx

    stash/
      StashPanel.tsx

    tags/
      TagPanel.tsx

    blame/
      BlameView.tsx

    actions/
      UndoButton.tsx

    dialogs/
      AISettings.tsx
      AnalyticsDialog.tsx
      CherryPickDialog.tsx
      ConflictResolver.tsx
      CreateBranchDialog.tsx
      KeyboardShortcutsModal.tsx
      SearchDialog.tsx
      SettingsDialog.tsx
      index.ts
```

## File Mapping

```txt
common/form/*                  -> ui/form/*
common/ContextMenu.tsx         -> ui/overlay/ContextMenu.tsx
common/ErrorNotification.tsx   -> ui/feedback/ErrorNotification.tsx
common/ThemePicker.tsx         -> ui/theme/ThemePicker.tsx
common/SettingsDropdown.tsx    -> ui/theme/SettingsDropdown.tsx

common/Toolbar.tsx             -> layout/Toolbar.tsx
common/BottomBar.tsx           -> layout/BottomBar.tsx
detail/RightPanel.tsx          -> layout/RightPanel.tsx

graph/*                        -> features/graph/*
diff/DiffViewer.tsx            -> features/diff/DiffViewer.tsx
detail/WorkingTree.tsx         -> features/working-tree/WorkingTree.tsx
detail/CommitDetail.tsx        -> features/commit-detail/CommitDetail.tsx
detail/SubmoduleDetail.tsx     -> features/submodules/SubmoduleDetail.tsx
sidebar/*                      -> features/sidebar/*

phase2/actions/*               -> features/actions/*
phase2/dialogs/*               -> features/dialogs/*
phase2/panels/StashPanel.tsx   -> features/stash/StashPanel.tsx
phase2/panels/TagPanel.tsx     -> features/tags/TagPanel.tsx
phase2/views/BlameView.tsx     -> features/blame/BlameView.tsx
```

## Duplicate Cleanup

There are currently two create-branch dialogs:

```txt
common/CreateBranchDialog.tsx
phase2/dialogs/CreateBranchDialog.tsx
```

Keep one canonical version:

```txt
components/features/dialogs/CreateBranchDialog.tsx
```

Then update all imports to point to the canonical dialog.

## Implementation Steps

1. Create the new folder structure.
2. Move `common/form` into `ui/form`.
3. Move low-level common components into `ui`.
4. Move shell components into `layout`.
5. Move graph, diff, detail, sidebar, stash, tag, blame, actions, and dialogs into `features`.
6. Update import paths with `rg` verification after each group.
7. Remove duplicate `CreateBranchDialog` after confirming which implementation is newer/canonical.
8. Remove empty legacy folders: `common`, `detail`, `diff`, `graph`, `phase2`, `sidebar` when no imports reference them.
9. Run build and targeted tests.

## Verification

Run:

```bash
pnpm --filter @gitflow-desktop/desktop build
```

Search for stale imports:

```bash
rg "@/components/(common|detail|diff|graph|phase2|sidebar)" apps/desktop/src
```

Expected result: no stale imports, unless a legacy compatibility barrel is intentionally kept.

## Suggested Commit Split

1. `refactor: move reusable components into ui and layout folders`
2. `refactor: move domain components into features folders`
3. `refactor: remove phase2 component namespace and duplicate dialogs`

