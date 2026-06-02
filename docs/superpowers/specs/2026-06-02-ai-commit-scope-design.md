# AI Commit Scope Suggestion — Design Spec

## Overview

When a user has staged a large or diverse set of changes, the AI analyzes the staged diff and suggests splitting into smaller, logically cohesive commits. This encourages atomic commit hygiene and produces a cleaner git history.

## Problem

Users often stage all changed files and write a single vague commit message like "misc updates" or "fix stuff". This makes git history hard to read, revert, and bisect. The existing AI commit message generator produces a single message for all staged changes without questioning whether the scope is appropriate.

## Goals

1. Detect when staged changes span multiple unrelated concerns
2. Suggest logical groupings of files with per-group commit messages
3. Allow the user to accept a suggestion group (auto-stage that group, unstage the rest)
4. Integrate seamlessly into the existing commit workflow
5. Be non-intrusive — suggestion, not enforcement

## Trigger Conditions

The scope suggestion is triggered **alongside** the existing "Generate commit message" action:

- When user clicks the Sparkles button to generate a commit message
- The AI prompt simultaneously checks scope and generates the message
- If the AI determines the changes should be split, the response includes both the suggested groups AND a single-message fallback

**Heuristic pre-filter (frontend):**
Before calling the AI, apply a lightweight check to avoid unnecessary API calls:
- Total staged files ≥ 5 AND
- Files span ≥ 2 distinct top-level directories (e.g., `src/` + `tests/` + `docs/`)

If the pre-filter fails, fall back to the existing single-message flow without scope analysis.

## Data Model

### CommitScopeSuggestion

```typescript
interface CommitGroup {
  files: string[];        // file paths in this group
  message: string;        // suggested commit message for this group
  reason: string;         // 1-line explanation of why these files belong together
}

interface CommitScopeSuggestion {
  shouldSplit: boolean;          // true if AI recommends splitting
  overallMessage: string;        // single commit message if NOT splitting
  groups: CommitGroup[];         // suggested groups if splitting
  explanation: string;           // overall explanation of the split recommendation
}
```

## AI Prompt Design

The prompt asks the AI to return a JSON object with structured output:

```
You are an expert developer reviewing staged git changes. Analyze the diff and determine if the changes should be split into multiple atomic commits.

Return a JSON object with this structure:
{
  "shouldSplit": boolean,
  "overallMessage": "single commit message if not splitting",
  "groups": [
    {
      "files": ["path/to/file1", "path/to/file2"],
      "message": "conventional commit message for this group",
      "reason": "why these files belong together"
    }
  ],
  "explanation": "brief explanation of why splitting is recommended"
}

RULES:
- If the changes are logically cohesive, set shouldSplit=false and provide overallMessage
- If changes span unrelated concerns, set shouldSplit=true and provide groups
- Each group should be a self-contained, atomic change
- Each group message should follow conventional commit format
- Maximum 4 groups
- Files that don't fit any group go into a "misc" group
- Return ONLY the JSON object, no markdown code blocks

Staged diff:
{diff}
```

## UI Design

### Integration Point: WorkingTree commit area

The suggestion appears **below** the commit message textarea when the AI returns `shouldSplit: true`.

### Visual Design

```
┌─────────────────────────────────────────────┐
│ [commit message textarea]         [✨]       │
├─────────────────────────────────────────────┤
│ 💡 AI suggests splitting into 3 commits     │
│ "These changes span unrelated concerns..."  │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 1. feat(auth): add login validation     │ │
│ │    src/auth/login.ts, src/auth/types.ts │ │
│ │    → Authentication logic changes       │ │
│ │    [Use this]                           │ │
│ ├─────────────────────────────────────────┤ │
│ │ 2. test: add auth unit tests            │ │
│ │    tests/auth.test.ts                   │ │
│ │    → Test coverage for auth changes     │ │
│ │    [Use this]                           │ │
│ ├─────────────────────────────────────────┤ │
│ │ 3. docs: update API documentation       │ │
│ │    docs/api.md                          │ │
│ │    → Documentation for new auth flow    │ │
│ │    [Use this]                           │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [Commit All as One]  [Dismiss]               │
└─────────────────────────────────────────────┘
```

### Interactions

1. **"Use this"** on a group:
   - Unstage all currently staged files
   - Stage only the files in this group
   - Set the commit message textarea to the group's message
   - Collapse the suggestion panel (other groups still available via expand)
   - User commits normally with Cmd+Enter
   - After commit, remaining groups are still shown for the next commit

2. **"Commit All as One"**:
   - Dismiss the suggestion
   - Use the `overallMessage` as the commit message
   - Proceed with normal commit flow

3. **"Dismiss"**:
   - Hide the suggestion panel
   - Keep the `overallMessage` in the textarea

4. **After each commit**, re-analyze remaining unstaged changes:
   - If there are still unstaged changes that match remaining groups, show a toast: "3 suggested commits remaining"

## Files Changed

| File | Change |
|------|--------|
| `apps/desktop/src/lib/ai.ts` | Add `analyzeCommitScope()` function |
| `apps/desktop/src/queries/useAI.ts` | Add `useAICommitScope` mutation hook |
| `apps/desktop/src/components/features/working-tree/WorkingTree.tsx` | Add scope suggestion UI panel |
| `apps/desktop/src/lib/gitflow-helpers.ts` | Add `shouldAnalyzeScope()` pre-filter helper |

No Rust changes needed — uses existing `api.diff.staged()`.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| AI returns invalid JSON | Fall back to single commit message, log warning |
| AI returns empty groups | Treat as shouldSplit=false |
| API key not configured | Skip scope analysis, use local fallback |
| Diff too large for context window | Truncate diff, still attempt analysis |
| Network error | Silent fallback to single message |

## Out of Scope

- Automatic staging/unstaging without user confirmation
- Persisting scope suggestions across app restarts
- Integration with interactive rebase to split existing commits
- Scope analysis for already-committed changes
