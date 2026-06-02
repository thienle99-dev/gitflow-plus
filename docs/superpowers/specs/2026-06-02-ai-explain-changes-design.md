# AI Explain Changes — Design Spec

## Overview

Add an "Explain with AI" feature to the CommitDetail panel that uses a cloud LLM to generate a natural-language explanation of what a commit does, why it was made, and what the key changes are.

## Problem

Users reviewing commit history often encounter commits with terse or ambiguous messages. Understanding the full impact of a commit requires manually reading through all changed files and diffs. There is no quick way to get a high-level summary of a commit's purpose and impact.

## Current State

- [`ai.ts`](apps/desktop/src/lib/ai.ts) already has [`reviewDiffWithAI()`](apps/desktop/src/lib/ai.ts:58) for per-file code review in DiffViewer
- [`api.diff.commit(repoPath, commitHash)`](src-tauri/src/commands/diff.rs:43) with no filePath returns the **full commit diff** via `git show`
- [`CommitDetail.tsx`](apps/desktop/src/components/features/commit-detail/CommitDetail.tsx) shows commit metadata + changed files list
- AI settings (API key, model, token limit) already configured in localStorage

## Approach

### User Flow

1. User selects a commit in the graph → CommitDetail panel opens
2. Below the commit metadata (hash, author, date, parents, revert button), an **"Explain with AI"** button appears
3. User clicks the button
4. Button shows loading spinner + "Analyzing..."
5. Full commit diff is fetched via `api.diff.commit(repoPath, commitHash)`
6. Diff is sent to the configured LLM with an explanation prompt
7. AI response is rendered in an expandable section below the button
8. Explanation persists until user selects a different commit or collapses the section

### UI Design

```
┌─────────────────────────────────────┐
│ fix: resolve race condition in auth │  ← commit message
│ abc1234 · John Doe · 2 hours ago   │  ← metadata
│ → def5678                           │  ← parents
│ [RotateCcw Revert commit]           │  ← existing
│ [Sparkles Explain with AI]          │  ← NEW button
├─────────────────────────────────────┤
│ ✨ AI Explanation                   │  ← collapsible section
│                                     │
│ This commit fixes a race condition  │
│ in the authentication module where  │
│ concurrent requests could cause...  │
│                                     │
│ Key changes:                        │
│ • Added mutex lock in auth.rs       │
│ • Updated retry logic in client.ts  │
│ • Added test case for concurrency   │
├─────────────────────────────────────┤
│ Changed Files (3)                   │
│ └─ auth.rs  [modified]             │
│ └─ client.ts [modified]            │
│ └─ auth.test.ts [added]            │
└─────────────────────────────────────┘
```

### Prompt Strategy

The prompt instructs the AI to:
1. Summarize the commit purpose in 1-2 sentences
2. Explain the motivation/why behind the change
3. List key changes as bullet points
4. Note any potential risks or breaking changes
5. Use plain English, no code blocks unless essential

### Edge Cases

- **No API key configured**: Show a subtle hint "Configure an API key in settings for AI features" instead of the button
- **Empty diff**: Show "No changes to explain" (merge commits with no diff)
- **API error**: Show error message with a "Retry" button
- **Large diff**: Truncate to 12,000 chars (larger than commit message prompt since explanation needs more context)
- **No Rust changes needed**: The existing `commit_diff` command already supports full-commit diff

## Files to Modify

| File | Change |
|------|--------|
| [`ai.ts`](apps/desktop/src/lib/ai.ts) | Add `explainCommitWithAI()` function |
| [`useAI.ts`](apps/desktop/src/queries/useAI.ts) | Add `useAICommitExplain` hook |
| [`CommitDetail.tsx`](apps/desktop/src/components/features/commit-detail/CommitDetail.tsx) | Add Explain button + collapsible explanation section |

## Out of Scope

- Streaming response (future enhancement)
- Explain for individual files (already exists via DiffViewer AI review)
- Explain for stash entries
- Keychain storage for API keys
