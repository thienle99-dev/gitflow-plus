# GitFlow Workflow — Implementation Plan

## File Structure

### New Files
```
src-tauri/src/commands/gitflow.rs          — Rust: gitflow_detect, gitflow_init
apps/desktop/src/queries/useGitFlow.ts     — TanStack Query hooks
apps/desktop/src/components/features/dialogs/GitFlowDialog.tsx  — Unified dialog
apps/desktop/src/lib/gitflow-helpers.ts    — Pure helper functions
```

### Modified Files
```
src-tauri/src/commands/mod.rs              — Add pub mod gitflow
src-tauri/src/lib.rs                       — Register new commands
apps/desktop/src/api/tauri.ts              — Add api.gitflow namespace
apps/desktop/src/components/layout/Toolbar.tsx — Add GitFlow section
apps/desktop/src/components/features/sidebar/Sidebar.tsx — Branch color dots
apps/desktop/src/components/features/graph/CommitGraph.tsx — Badge color coding
```

---

## Task 1: Rust — gitflow_detect and gitflow_init

**File:** `src-tauri/src/commands/gitflow.rs`

Create a new Rust module with two commands:

### `gitflow_detect(path: String) -> Result<GitFlowConfig, String>`
1. Read `{path}/.git/config` file
2. Parse for `[gitflow]` section using simple line-by-line parsing
3. Extract keys: `master`, `develop`, `feature-prefix`, `release-prefix`, `hotfix-prefix`, `versiontagprefix`
4. Return `GitFlowConfig` struct with `initialized: true` if section found, `false` otherwise
5. Default values when not initialized: master=`main`, develop=`develop`, feature=`feature/`, release=`release/`, hotfix=`hotfix/`, versiontag=`v`

### `gitflow_init(path: String, config: GitFlowInitRequest) -> Result<String, String>`
1. Read existing `.git/config`
2. Remove any existing `[gitflow]` section
3. Append new `[gitflow]` section with provided values
4. Write back to `.git/config`
5. Return success message

### Structs
```rust
#[derive(Serialize, Deserialize)]
pub struct GitFlowConfig {
    pub initialized: bool,
    pub master: String,
    pub develop: String,
    pub feature_prefix: String,
    pub release_prefix: String,
    pub hotfix_prefix: String,
    pub versiontag_prefix: String,
}

#[derive(Deserialize)]
pub struct GitFlowInitRequest {
    pub master: String,
    pub develop: String,
    pub feature_prefix: String,
    pub release_prefix: String,
    pub hotfix_prefix: String,
    pub versiontag_prefix: String,
}
```

**Registration:**
- Add `pub mod gitflow;` to `src-tauri/src/commands/mod.rs`
- Add `commands::gitflow::gitflow_detect,` and `commands::gitflow::gitflow_init,` to `lib.rs` invoke_handler

---

## Task 2: Frontend API Wrappers + Query Hooks

### 2a: API wrappers in `tauri.ts`

Add to the `api` object:

```typescript
gitflow: {
  detect: (path: string) =>
    invoke<GitFlowConfig>("gitflow_detect", { path }),
  init: (path: string, config: GitFlowInitConfig) =>
    invoke<string>("gitflow_init", { path, config }),
},
```

Add `GitFlowConfig` interface:
```typescript
export interface GitFlowConfig {
  initialized: boolean;
  master: string;
  develop: string;
  feature_prefix: string;
  release_prefix: string;
  hotfix_prefix: string;
  versiontag_prefix: string;
}
```

### 2b: Query hooks in `useGitFlow.ts`

```typescript
// useGitFlowConfig — query gitflow config (auto-refetch on repo change)
// useGitFlowInit — mutation to initialize gitflow
// useGitFlowFeatureStart — mutation: create + checkout feature branch from develop
// useGitFlowFeatureFinish — mutation: checkout develop, merge feature, delete branch
// useGitFlowReleaseStart — mutation: create + checkout release branch from develop
// useGitFlowReleaseFinish — mutation: checkout main, merge release, checkout develop, merge release, tag, delete
// useGitFlowHotfixStart — mutation: create + checkout hotfix branch from main
// useGitFlowHotfixFinish — mutation: checkout main, merge hotfix, checkout develop, merge hotfix, tag, delete
```

Each mutation hook:
- Calls existing `api.branches.*`, `api.merge.*`, `api.tag.*` APIs
- Invalidates `["git", repoPath]` and `["branches", repoPath]` queries on success
- Returns `{ mutate, isPending, error }`

### 2c: Helpers in `gitflow-helpers.ts`

```typescript
// classifyBranch(name: string, config: GitFlowConfig): "feature" | "release" | "hotfix" | "main" | "develop" | "other"
// getBranchColor(classification: string): string  // returns CSS color
// toKebabCase(input: string): string
// validateVersion(input: string): boolean  // basic semver check
// getActiveBranches(branches: Branch[], prefix: string): string[]
```

---

## Task 3: GitFlowDialog Component

**File:** `apps/desktop/src/components/features/dialogs/GitFlowDialog.tsx`

A unified dialog component that handles all GitFlow operations via a `mode` prop:

```typescript
interface GitFlowDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "init" | "feature-start" | "feature-finish" | "release-start" | "release-finish" | "hotfix-start" | "hotfix-finish";
}
```

### Dialog Modes:

**init:**
- Inputs: master branch name, develop branch name, feature/release/hotfix prefixes, version tag prefix
- All fields with sensible defaults
- "Initialize" button

**feature-start:**
- Input: feature name (auto kebab-case)
- Dropdown: base branch (default: develop)
- Checkbox: push to remote

**feature-finish:**
- Info: "Will merge feature/X into develop"
- Dropdown: merge strategy (regular/squash)
- Checkbox: delete branch after finish (default: yes)

**release-start:**
- Input: version (e.g., 1.2.3) with inline validation
- Dropdown: base branch (default: develop)

**release-finish:**
- Info: "Will merge release/X into main + develop"
- Dropdown: merge strategy
- Checkbox: create tag (default: yes)
- Input: tag message (optional)

**hotfix-start:**
- Input: version/hotfix name
- Warning banner: "Creating from main branch"
- Info: "Will create hotfix/X from main"

**hotfix-finish:**
- Info: "Will merge hotfix/X into main + develop"
- Checkbox: create tag (default: yes)

### UI Pattern:
- Reuse existing dialog styling from `CreateBranchDialog.tsx`
- Modal overlay with backdrop blur
- Mac-style rounded corners and close button
- Loading state on submit button
- Error display inline

---

## Task 4: Toolbar GitFlow Section

**File:** `apps/desktop/src/components/layout/Toolbar.tsx`

Add a GitFlow section after the existing action buttons (Pull/Push/Fetch/Merge):

### Layout:
```
[Pull] [Push] [Fetch] [Merge] | [Feature ▾] [Release ▾] [Hotfix ▾] | [Settings]
```

### Implementation:
1. Import `useGitFlowConfig` hook
2. Add state for dropdown visibility and GitFlowDialog mode
3. If `!config.initialized` → show single "Init GitFlow" button
4. If `config.initialized` → show 3 dropdown buttons

### Each dropdown button:
- Colored border (feature=orange, release=blue, hotfix=red)
- Dropdown items: Start..., Finish..., separator, List active
- "Start..." opens GitFlowDialog with appropriate mode
- "Finish..." opens GitFlowDialog with appropriate mode (only if active branches of that type exist)
- "List active" could be a submenu or just highlight in sidebar

### GitFlowDialog integration:
- Render `<GitFlowDialog>` at bottom of Toolbar, controlled by state
- On close → invalidate queries

---

## Task 5: Visual Indicators

### 5a: Sidebar branch color dots

**File:** `apps/desktop/src/components/features/sidebar/Sidebar.tsx`

- Import `useGitFlowConfig` and `classifyBranch` from gitflow-helpers
- In the branch list rendering, add a small colored dot before each branch name
- Color determined by `classifyBranch(branch.name, config)`
- Only show colored dot for feature/release/hotfix branches

### 5b: Commit Graph badge colors

**File:** `apps/desktop/src/components/features/graph/CommitGraph.tsx` (canvas renderer)

- In `useCanvasRenderer.ts`, when rendering ref badges, check if the ref name matches a GitFlow prefix
- Apply the appropriate color to the badge background
- Pass GitFlow config down from CommitGraph → useCanvasRenderer

**File:** `apps/desktop/src/components/features/graph/useCanvasRenderer.ts`

- Accept `gitflowConfig` in `RenderParams`
- In the badge rendering section, apply color based on branch classification
- feature/* → orange background, release/* → blue, hotfix/* → red

---

## Task 6: Wire Up Init Flow + Error Handling

### Integration points:
1. In `MainLayout.tsx` or `Toolbar.tsx`, auto-detect GitFlow on repo open
2. Pass config to Sidebar and CommitGraph via props or context
3. Handle merge conflicts during finish operations → redirect to existing ConflictResolver
4. Add error toasts for all failure cases

### Error handling in mutations:
- Branch already exists → "Branch 'feature/xyz' already exists"
- Merge conflict → set overlay dialog to ConflictResolver, store pending finish operation
- Push failure → "Failed to push: <error>" toast, operation still succeeds locally
- Tag creation failure → warning toast, don't fail the whole operation

---

## Verification Checklist

- [ ] `cargo check` passes
- [ ] `npx tsc --noEmit` passes
- [ ] GitFlow detection works on repo with `.git/config` [gitflow] section
- [ ] GitFlow detection returns defaults on repo without [gitflow] section
- [ ] Init wizard creates develop branch and writes config
- [ ] Feature start creates and checks out feature/X from develop
- [ ] Feature finish merges into develop and optionally deletes branch
- [ ] Release start creates and checks out release/X from develop
- [ ] Release finish merges into main + develop, creates tag, deletes branch
- [ ] Hotfix start creates and checks out hotfix/X from main
- [ ] Hotfix finish merges into main + develop, creates tag, deletes branch
- [ ] Merge conflicts redirect to ConflictResolver
- [ ] Toolbar shows GitFlow section with correct button colors
- [ ] Sidebar shows colored dots for GitFlow branches
- [ ] Commit graph badges are colored by GitFlow branch type
- [ ] All mutations invalidate relevant queries for UI refresh
