# Commit Squash & Amend Quick Actions — Design Spec

## Goal

Add quick-access commit management actions: one-click squash last N commits, and AI-powered commit message refinement (improve existing message, add body). Amend with staged changes already exists in the app (Amend toggle in CommitBox).

## What Already Exists

| Feature | Status | Location |
|---------|--------|----------|
| Amend last commit | ✅ Complete | `CommitBox.tsx` Amend toggle → `performActualCommit(msg, true)` → `git commit --amend` |
| Interactive rebase with squash | ✅ Complete | `InteractiveRebaseDialog.tsx` — drag-drop reorder, action per commit |
| AI commit message generation | ✅ Complete | `generateCommitMessageWithAI` in `lib/ai.ts` |
| AI scope analysis | ✅ Complete | `analyzeCommitScope` in `lib/ai.ts` |

## New Features

### Feature 1: Squash Last N Commits

**What:** A quick action that lets the user squash the last N commits into one, without manually configuring each commit in the rebase dialog.

**Where it lives:** CommitGraph context menu — add "Squash last N commits..." item.

**User flow:**
```
Right-click HEAD commit (or any recent commit) on graph
  → "Squash last N commits..."
    → Small inline picker appears (dropdown: 2, 3, 4, 5, 6, 7, 8, 9, 10)
      → "Squash last [3 ▾] commits"
        → Fetches the last N commits via api.rebase.todoList
        → Pre-configures: oldest = "pick", all others = "squash"
        → Opens InteractiveRebaseDialog with pre-configured todos
          → User can review/edit before clicking "Start Rebase"
```

**Implementation:**
- No new backend commands needed — reuses existing `api.rebase.todoList` and `api.rebase.start`
- Add `squashNState: { open: boolean; commitHash: string | null }` to `ui.ts` store
- Create `SquashDialog.tsx` — simple dialog with N picker that opens InteractiveRebaseDialog with pre-set todos
- Add "Squash last N commits..." to CommitGraph context menu (after "Revert commit...")
- Pass pre-configured todos to InteractiveRebaseDialog via new `initialTodos` prop

**Pre-configuration logic:**
```ts
// Get last N commits from todo list
const todos = await api.rebase.todoList(repoPath, commitHash);
// todos is already ordered oldest-first (git log --reverse)
// Set all except first to "squash"
const configured = todos.map((t, i) => ({
  ...t,
  action: i === 0 ? "pick" : "squash",
}));
```

### Feature 2: AI Message Refinement

**What:** Two new buttons in the CommitBox that enhance the existing commit message using AI:
1. **"Improve"** — Refines the current message for clarity, grammar, and conventional commit format
2. **"Add Body"** — Generates a detailed commit body from the staged diff

**Where it lives:** CommitBox toolbar, next to the existing "Generate with AI" button.

**User flow:**
```
User types a draft commit message
  → Clicks "Improve" ✨
    → AI receives the current message + staged diff + conventions
    → Returns an improved version of the same message
    → Message field updates in-place
  
  → Or clicks "Add Body" 📝
    → AI receives the commit subject + staged diff
    → Returns the subject + a detailed body with file-level breakdown
    → Message field updates with subject + body
```

**Implementation:**
- Add `improveCommitMessage` function to `lib/ai.ts`
- Add `addCommitBody` function to `lib/ai.ts`
- Add `useImproveCommitMessage` and `useAddCommitBody` hooks to `queries/useAI.ts`
- Add "Improve" and "Add Body" buttons to `CommitBox.tsx`
- Wire callbacks through `WorkingTree.tsx`

## Files to Create

| File | Purpose |
|------|---------|
| `apps/desktop/src/components/features/dialogs/SquashDialog.tsx` | Simple N-picker dialog that opens InteractiveRebaseDialog |

## Files to Modify

| File | Change |
|------|--------|
| `apps/desktop/src/stores/ui.ts` | Add `squashNState` for squash dialog |
| `apps/desktop/src/components/features/graph/CommitGraph.tsx` | Add "Squash last N commits..." context menu item |
| `apps/desktop/src/lib/ai.ts` | Add `improveCommitMessage` and `addCommitBody` functions |
| `apps/desktop/src/queries/useAI.ts` | Add `useImproveCommitMessage` and `useAddCommitBody` hooks |
| `apps/desktop/src/components/features/working-tree/CommitBox.tsx` | Add "Improve" and "Add Body" buttons |
| `apps/desktop/src/components/features/working-tree/WorkingTree.tsx` | Wire new AI callbacks |
| `apps/desktop/src/layouts/MainLayout.tsx` | Register SquashDialog in dialog map |
| `apps/desktop/src/components/features/dialogs/InteractiveRebaseDialog.tsx` | Accept `prefilledTodos` prop for pre-configured squash |
| `apps/desktop/src/components/features/dialogs/FeatureGuideDialog.tsx` | Add squash and AI refinement walkthrough |

## AI Prompt Design

### Improve Commit Message

```ts
export async function improveCommitMessage(
  repoPath: string,
  currentMessage: string,
  files: FileChange[],
): Promise<string> {
  const settings = readAISettings();
  const branchName = await getCurrentBranchName(repoPath);
  const diff = await api.diff.staged(repoPath);
  
  const prompt = `You are a commit message expert. The user has written a draft commit message. Improve it for clarity, grammar, and conventional commit format while preserving the original intent.

Rules:
- Keep the same meaning and scope
- Improve grammar and clarity
- Follow conventional commits format if the project uses it
- Keep the same detail level (don't add information not in the diff)
- Return ONLY the improved message, no explanation

Branch: ${branchName}
Current message:
${currentMessage}

Staged diff:
${diff.slice(0, 6000)}`;

  return cleanAIText(await requestAIText(prompt, settings));
}
```

### Add Commit Body

```ts
export async function addCommitBody(
  repoPath: string,
  subject: string,
  files: FileChange[],
): Promise<string> {
  const settings = readAISettings();
  const branchName = await getCurrentBranchName(repoPath);
  const diff = await api.diff.staged(repoPath);
  
  const prompt = `You are a commit message expert. Generate a detailed commit body for the following commit subject.

The body should:
- Explain WHY the change was made, not just WHAT
- Mention key files/components affected
- Note any breaking changes or migration steps
- Use bullet points for multiple changes
- Be concise but informative (3-8 lines max)

Return the subject line followed by a blank line and the body. No explanation.

Branch: ${branchName}
Subject: ${subject}

Staged diff:
${diff.slice(0, 6000)}`;

  return cleanAIText(await requestAIText(prompt, settings));
}
```

## Edge Cases

| Case | Handling |
|------|----------|
| Less than 2 commits in repo | Disable "Squash last N" context menu item |
| All commits on different branches | Show warning in SquashDialog |
| Rebase conflicts during squash | Handled by existing InteractiveRebaseDialog conflict mode |
| No staged files for AI refinement | Disable "Improve" and "Add Body" buttons |
| AI not configured | Show toast "Configure AI in settings" |
| No commit message yet | Disable "Improve" (needs existing message), enable "Add Body" |
