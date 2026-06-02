# GitFlow Workflow — Design Spec

## Overview

Implement the core GitFlow branching model as a first-class feature in GitFlow Desktop. This is the brand-defining feature that differentiates the app. GitFlow provides a structured branching strategy with dedicated branch types: **feature**, **release**, and **hotfix**, all coordinated through **main** and **develop** branches.

## Goals

1. Detect whether GitFlow is initialized for the current repo
2. Provide a GitFlow Init wizard to set up branch naming conventions
3. Implement Feature: start/finish operations
4. Implement Release: start/finish operations with auto-tagging
5. Implement Hotfix: start/finish operations with auto-tagging
6. Add a dedicated GitFlow section to the Toolbar
7. Add visual indicators on the commit graph for GitFlow branches

## Architecture

### Key Design Decision: Frontend-Composed Operations

Rather than wrapping the `git-flow` CLI tool (which may not be installed), we compose GitFlow operations from existing git primitives on the frontend:

- **Branch create** → `api.branches.create()` (already exists in Rust)
- **Branch checkout** → `api.branches.checkout()` (already exists in Rust)
- **Branch delete** → `api.branches.delete()` (already exists in Rust)
- **Merge** → `api.merge.start()` (already exists in Rust)
- **Tag create** → `api.tag.create()` (already exists in Rust)

This means we only need **2 new Rust commands**:
1. `gitflow_detect` — read `.git/config` for `[gitflow]` section and return config
2. `gitflow_init` — write GitFlow config to `.git/config`

All feature/release/hotfix start/finish operations are composed on the frontend using existing APIs, with a new `gitflow` namespace in `tauri.ts` for the detect/init commands.

### New Files

| File | Purpose |
|------|---------|
| `src-tauri/src/commands/gitflow.rs` | Rust commands: `gitflow_detect`, `gitflow_init` |
| `apps/desktop/src/queries/useGitFlow.ts` | TanStack Query hooks for GitFlow state |
| `apps/desktop/src/components/features/dialogs/GitFlowDialog.tsx` | Unified dialog for all GitFlow operations |
| `apps/desktop/src/lib/gitflow-helpers.ts` | Pure functions for GitFlow branch name generation, validation |

### Modified Files

| File | Change |
|------|--------|
| `src-tauri/src/lib.rs` | Register `gitflow_detect`, `gitflow_init` commands |
| `apps/desktop/src/api/tauri.ts` | Add `api.gitflow.detect()` and `api.gitflow.init()` wrappers |
| `apps/desktop/src/components/layout/Toolbar.tsx` | Add GitFlow section with Feature/Release/Hotfix buttons |
| `apps/desktop/src/components/features/sidebar/Sidebar.tsx` | Add GitFlow branch color indicators |
| `apps/desktop/src/components/features/graph/CommitGraph.tsx` | Color GitFlow branch badges by prefix |

## Data Model

### GitFlowConfig (Rust struct, stored in `.git/config`)

```rust
pub struct GitFlowConfig {
    pub initialized: bool,
    pub master: String,      // default: "main"
    pub develop: String,     // default: "develop"
    pub feature_prefix: String,  // default: "feature/"
    pub release_prefix: String,  // default: "release/"
    pub hotfix_prefix: String,   // default: "hotfix/"
    pub versiontag_prefix: String, // default: "v"
}
```

### GitFlow Branch Classification

```
feature/*  → orange (#f59e0b)
release/*  → blue   (#3b82f6)
hotfix/*   → red    (#ef4444)
main       → default
develop    → default
other      → default
```

## Feature Details

### 1. GitFlow Detection

**Trigger:** On repo open, automatically detect GitFlow config.

**Detection logic:**
1. Read `.git/config`
2. Check for `[gitflow]` section
3. If found, parse branch prefixes and return `GitFlowConfig` with `initialized: true`
4. If not found, return `GitFlowConfig` with `initialized: false` and default values

**Storage:** TanStack Query with key `["gitflow", repoPath]`

### 2. GitFlow Init Wizard

**Trigger:** User clicks "Init GitFlow" button (shown when not initialized).

**Dialog fields:**
- Main branch name (default: `main`, dropdown of existing branches)
- Develop branch name (default: `develop`, dropdown of existing branches)
- Feature prefix (default: `feature/`)
- Release prefix (default: `release/`)
- Hotfix prefix (default: `hotfix/`)
- Version tag prefix (default: `v`)

**Behavior:**
1. If develop branch doesn't exist → create it from main
2. Write `[gitflow]` section to `.git/config`
3. Invalidate `["gitflow", repoPath]` query
4. Show success toast

### 3. Feature Start/Finish

**Start dialog:**
- Feature name input (auto-convert to kebab-case)
- Base branch dropdown (default: develop)
- "Push to remote" checkbox (default: unchecked)

**Start flow:**
1. Validate name (non-empty, no spaces, not conflicting)
2. `api.branches.create(repoPath, "feature/<name>", develop)`
3. `api.branches.checkout(repoPath, "feature/<name>")`
4. If "push to remote" → `api.remote.push(repoPath, "origin", "feature/<name>")`
5. Invalidate queries → toast

**Finish dialog:**
- Merge strategy: Regular merge (default) / Squash / Rebase
- "Delete branch after finish" checkbox (default: checked)
- Summary: show commit count on feature branch

**Finish flow:**
1. `api.branches.checkout(repoPath, develop)`
2. `api.merge.start(repoPath, "feature/<name>", squash)` — if conflicts → redirect to ConflictResolver
3. If delete → `api.branches.delete(repoPath, "feature/<name>")`
4. Invalidate queries → toast

### 4. Release Start/Finish

**Start dialog:**
- Version input (e.g., `1.2.3`, validated as semver)
- Base branch dropdown (default: develop)

**Start flow:**
1. `api.branches.create(repoPath, "release/<version>", develop)`
2. `api.branches.checkout(repoPath, "release/<version>")`
3. Invalidate queries → toast

**Finish dialog:**
- Merge strategy: Regular merge (default) / Squash
- "Create tag" checkbox (default: checked)
- Tag message input (optional)

**Finish flow:**
1. `api.branches.checkout(repoPath, main)`
2. `api.merge.start(repoPath, "release/<version>", squash)` — if conflicts → redirect to ConflictResolver
3. `api.branches.checkout(repoPath, develop)`
4. `api.merge.start(repoPath, "release/<version>", squash)` — merge back to develop
5. If create tag → `api.tag.create(repoPath, "v<version>", main, message)`
6. `api.branches.delete(repoPath, "release/<version>")`
7. Invalidate queries → toast

### 5. Hotfix Start/Finish

**Start dialog:**
- Hotfix name / version (e.g., `1.2.4`)
- Warning: "Creating from main, not develop"

**Start flow:**
1. `api.branches.create(repoPath, "hotfix/<version>", main)`
2. `api.branches.checkout(repoPath, "hotfix/<version>")`
3. Invalidate queries → toast

**Finish dialog:**
- Merge strategy: Regular merge (default) / Squash
- "Create tag" checkbox (default: checked)

**Finish flow:**
1. `api.branches.checkout(repoPath, main)`
2. `api.merge.start(repoPath, "hotfix/<version>", squash)` — if conflicts → redirect to ConflictResolver
3. `api.branches.checkout(repoPath, develop)`
4. `api.merge.start(repoPath, "hotfix/<version>", squash)` — merge back to develop
5. If create tag → `api.tag.create(repoPath, "v<version>", main)`
6. `api.branches.delete(repoPath, "hotfix/<version>")`
7. Invalidate queries → toast

### 6. Toolbar GitFlow Section

Add a dedicated section in the Toolbar between the existing action buttons and the settings area:

```
[Pull] [Push] [Fetch] [Merge] | [Feature ▾] [Release ▾] [Hotfix ▾] | [Settings]
```

Each dropdown button shows:
- **Feature ▾**: Start new feature... / Finish feature... / List active features
- **Release ▾**: Start new release... / Finish release... / List active releases
- **Hotfix ▾**: Start new hotfix... / Finish hotfix... / List active hotfixes

When GitFlow is not initialized:
- All buttons disabled with tooltip "Initialize GitFlow first"
- Show "Init GitFlow" button instead

Button colors: Feature = orange border, Release = blue border, Hotfix = red border

### 7. Visual Indicators

**Sidebar:** Branch names prefixed with color dot based on type:
- `feature/*` → orange dot
- `release/*` → blue dot
- `hotfix/*` → red dot

**Commit Graph:** Branch badges (ref labels) use the same color coding for GitFlow branches.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Merge conflict during finish | Redirect to existing ConflictResolver dialog |
| Branch already exists on start | Show error toast with branch name |
| No develop branch on init | Auto-create from main |
| Invalid version format | Inline validation error in dialog |
| Remote push fails | Show error toast, don't abort the flow |

## Out of Scope

- Support branch type (not commonly used)
- Version bump automation in release finish
- Git hooks integration
- Multi-remote support for GitFlow
