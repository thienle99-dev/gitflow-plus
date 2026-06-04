# AI Commit History Summary — Design Spec

## Goal

Add an AI-powered commit history summarizer that generates standup-ready reports from recent commit activity. Users select a time range (today, this week, this month, custom), and the AI produces a structured summary grouped by topic with statistics.

## What Already Exists

| Pattern | Location | Relevance |
|---------|----------|-----------|
| `generateRiskSummary()` | [`lib/ai.ts:714`](apps/desktop/src/lib/ai.ts:714) | Closest pattern — takes commits/files, builds prompt, calls `requestAIText()` |
| `explainCommitWithAI()` | [`lib/ai.ts:435`](apps/desktop/src/lib/ai.ts:435) | Takes commit data, generates AI text explanation |
| `Commit` interface | [`api/tauri.ts:4`](apps/desktop/src/api/tauri.ts:4) | `{ hash, parents, author, email, date, message, refs }` |
| `useGitLog()` | [`queries/useGitLog.ts:16`](apps/desktop/src/queries/useGitLog.ts:16) | Infinite query returning `Commit[]` pages |
| Dialog system | [`MainLayout.tsx:359`](apps/desktop/src/layouts/MainLayout.tsx:359) | `openDialog("name")` → renders component from `dialogComponents` map |
| UI Store | [`stores/ui.ts:73`](apps/desktop/src/stores/ui.ts:73) | `openDialog(name)` / `closeDialog()` |
| BottomBar buttons | [`BottomBar.tsx:200-216`](apps/desktop/src/components/layout/BottomBar.tsx:200) | Pattern for right-side action buttons |

## User Flow

1. User clicks **"Summary"** button in BottomBar (or uses keyboard shortcut `⌘⇧S`)
2. `CommitSummaryDialog` opens with time range selector: **Today** | **This Week** | **This Month** | **Custom**
3. Commits are fetched from the log for the selected range
4. User clicks **"Generate Summary"** (or auto-generates on open for "Today")
5. AI produces a structured standup summary
6. Summary is displayed in a readable format with **Copy** button
7. User copies to clipboard and pastes into their standup tool

## Files to Create

| # | File | Purpose |
|---|------|---------|
| 1 | `apps/desktop/src/components/features/dialogs/CommitSummaryDialog.tsx` | Dialog UI with time range selector, commit list, AI summary, copy button |

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `apps/desktop/src/lib/ai.ts` | Add `generateCommitSummary()` function |
| 2 | `apps/desktop/src/queries/useAI.ts` | Add `useAICommitSummary()` hook |
| 3 | `apps/desktop/src/layouts/MainLayout.tsx` | Register `"commit-summary"` in `dialogComponents` map |
| 4 | `apps/desktop/src/components/layout/BottomBar.tsx` | Add "Summary" button with `MessageSquareText` icon |

## Detailed Design

### 1. `generateCommitSummary()` in `lib/ai.ts`

```typescript
export interface CommitSummaryResult {
  summary: string;
  stats: {
    totalCommits: number;
    authors: string[];
    dateRange: { from: string; to: string };
  };
}

export async function generateCommitSummary(
  commits: Array<{ hash: string; message: string; date: string; author: string }>,
  timeRange: string,
): Promise<CommitSummaryResult> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("AI provider not configured");
  }

  const commitList = commits.map((c, i) =>
    `${i + 1}. [${c.date.slice(0, 10)}] ${c.message} (${c.author})`
  ).join("\n");

  const authors = [...new Set(commits.map(c => c.author))];
  const dateRange = {
    from: commits.length > 0 ? commits[commits.length - 1].date.slice(0, 10) : "",
    to: commits.length > 0 ? commits[0].date.slice(0, 10) : "",
  };

  const prompt = `You are a helpful engineering standup assistant. Summarize this git commit history for a standup meeting.

TIME RANGE: ${timeRange}
COMMITS (${commits.length} total):
${commitList}

TASK: Generate a concise standup summary. Format:

## What was done
Group commits by topic/feature/fix. Each group should have a brief description of what was accomplished.

## Key changes
List 3-5 most important changes with brief explanations.

## Stats
- Total commits: N
- Contributors: name1, name2
- Date range: YYYY-MM-DD to YYYY-MM-DD

Be concise, professional, and actionable. Focus on outcomes, not implementation details. No markdown code blocks.
${buildReviewLanguageInstruction(settings.reviewLanguage)}`;

  const raw = cleanAIText(await requestAIText(prompt, settings));
  
  return {
    summary: raw,
    stats: {
      totalCommits: commits.length,
      authors,
      dateRange,
    },
  };
}
```

### 2. `useAICommitSummary()` in `queries/useAI.ts`

```typescript
export function useAICommitSummary() {
  return useMutation({
    mutationFn: ({
      commits,
      timeRange,
    }: {
      commits: Array<{ hash: string; message: string; date: string; author: string }>;
      timeRange: string;
    }) => generateCommitSummary(commits, timeRange),
  });
}
```

### 3. `CommitSummaryDialog.tsx` — UI Design

```
┌─────────────────────────────────────────────────┐
│  📊 Commit History Summary                    ✕  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Time Range: [Today] [This Week] [This Month]   │
│              [Custom: ▼ From — To]              │
│                                                 │
│  ┌─ Commits in range (12) ───────────────────┐  │
│  │ • fix: auth token refresh                  │  │
│  │ • feat: add dark mode toggle               │  │
│  │ • refactor: extract auth service           │  │
│  │ ...                                        │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  ┌────────────────────────────────────────────┐  │
│  │  🤖 AI Standup Summary                     │  │
│  │                                            │  │
│  │  ## What was done                          │  │
│  │  - **Auth refactor**: Fixed token refresh  │  │
│  │    logic, extracted auth service...        │  │
│  │  - **Dark mode**: Added toggle and theme   │  │
│  │    switching...                            │  │
│  │                                            │  │
│  │  ## Key changes                            │  │
│  │  1. Auth service extraction                │  │
│  │  2. Token refresh fix                      │  │
│  │  3. Dark mode toggle                       │  │
│  │                                            │  │
│  │  ## Stats                                  │  │
│  │  - 12 commits by 2 contributors            │  │
│  │  - 2026-06-04 to 2026-06-05                │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  [📋 Copy to Clipboard]    [Generate Summary]   │
└─────────────────────────────────────────────────┘
```

### 4. BottomBar Addition

Add a "Summary" button in the right side of BottomBar, next to the existing "Guide" button:

```tsx
import { MessageSquareText } from "lucide-react";

<button
  onClick={() => openDialogState("commit-summary")}
  className="flex items-center gap-1 text-text-muted hover:text-accent transition-all p-0.5 rounded cursor-pointer mr-0.5"
  title="AI Commit Summary (⌘⇧S)"
>
  <MessageSquareText size={11} />
  <span className="text-[9px] font-semibold">Summary</span>
</button>
```

### 5. MainLayout Registration

Add to `dialogComponents`:

```tsx
"commit-summary": <CommitSummaryDialog onClose={closeDialog} />,
```

## Time Range Logic

The dialog fetches commits from the existing `useGitLog` infinite query and filters by date:

```typescript
const filterByTimeRange = (commits: Commit[], range: string): Commit[] => {
  const now = new Date();
  let cutoff: Date;
  
  switch (range) {
    case "today":
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoff = new Date(0); // All commits
  }
  
  return commits.filter(c => new Date(c.date) >= cutoff);
};
```

## Edge Cases

1. **No commits in range** — Show "No commits found for this time range" with a suggestion to try a different range
2. **AI not configured** — Disable "Generate Summary" button with tooltip "Configure AI in Settings"
3. **Very large commit lists (>100)** — Truncate to most recent 100 commits and note "Showing last 100 of N commits"
4. **Single contributor** — Summary adapts to not repeat "by you" unnecessarily
5. **Empty repo** — Dialog shows "No commit history available"

## Verification

1. `npx tsc --noEmit` — zero errors
2. Click "Summary" in BottomBar → dialog opens with time range selector
3. Select "This Week" → commits filtered correctly
4. Click "Generate Summary" → AI generates standup-ready summary
5. Click "Copy to Clipboard" → summary copied, toast notification shown
6. Verify AI not configured state shows appropriate message
