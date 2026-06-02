# AI Explain Changes — Implementation Plan

## File Structure

| File | Action |
|------|--------|
| `apps/desktop/src/lib/ai.ts` | Modify — add `explainCommitWithAI()` |
| `apps/desktop/src/queries/useAI.ts` | Modify — add `useAICommitExplain` hook |
| `apps/desktop/src/components/features/commit-detail/CommitDetail.tsx` | Modify — add Explain button + explanation UI |

No Rust changes needed — existing `commit_diff` command supports full-commit diff.

---

## Task 1: Add `explainCommitWithAI()` in `ai.ts`

Add after [`reviewDiffWithAI()`](apps/desktop/src/lib/ai.ts:58) (after line 78).

```typescript
export async function explainCommitWithAI(
  repoPath: string,
  commitHash: string,
  commitMessage: string,
): Promise<string> {
  const settings = readAISettings();
  if (!hasProvider(settings)) {
    throw new Error("Configure an AI API key in settings to use AI features");
  }

  // Fetch full commit diff (no filePath = entire commit)
  const diff = await api.diff.commit(repoPath, commitHash);
  if (!diff.trim()) {
    return "This commit has no file changes to explain (e.g., an empty merge commit).";
  }

  const truncatedDiff = diff.slice(0, 12_000);
  const branchName = await getCurrentBranchName(repoPath);
  const branchContext = branchName ? `Branch: ${branchName}\n` : "";

  const prompt = `You are a senior software engineer reviewing a Git commit. Explain this commit in plain English.

${branchContext}Commit message: ${commitMessage}

Diff:
${truncatedDiff}

INSTRUCTIONS:
1. Start with a 1-2 sentence summary of WHAT this commit does.
2. Explain the MOTIVATION — why this change was likely needed.
3. List the KEY CHANGES as bullet points (max 5-6).
4. If there are potential RISKS or BREAKING CHANGES, mention them briefly.
5. Use plain English. Be concise and direct. No markdown code blocks.
6. Use English unless the commit message is in another language.`;

  const explanation = cleanAIText(await requestAIText(prompt, settings));
  if (!explanation) {
    throw new Error("Empty response from AI");
  }
  return explanation;
}
```

**Notes:**
- Reuses existing `readAISettings()`, `hasProvider()`, `requestAIText()`, `cleanAIText()`, `getCurrentBranchName()`
- Truncates diff at 12,000 chars (larger than commit message prompt's 8,000 since explanation needs more context)
- Returns early for empty diffs (merge commits)

---

## Task 2: Add `useAICommitExplain` hook in `useAI.ts`

Add after [`useAIDiffReview()`](apps/desktop/src/queries/useAI.ts:14) (after line 19).

```typescript
export function useAICommitExplain() {
  return useMutation({
    mutationFn: ({
      repoPath,
      commitHash,
      commitMessage,
    }: {
      repoPath: string;
      commitHash: string;
      commitMessage: string;
    }) => explainCommitWithAI(repoPath, commitHash, commitMessage),
  });
}
```

Also add `explainCommitWithAI` to the import from `@/lib/ai`.

---

## Task 3: Add Explain button + explanation UI in `CommitDetail.tsx`

### 3a. Add imports

Add to existing imports:
- `Sparkles, ChevronDown, ChevronRight` from `lucide-react`
- `useAICommitExplain` from `@/queries/useAI`

### 3b. Add state and hook

Inside [`CommitDetail()`](apps/desktop/src/components/features/commit-detail/CommitDetail.tsx:26), add:
```typescript
const [showExplanation, setShowExplanation] = useState(false);
const [explanation, setExplanation] = useState("");
const aiExplain = useAICommitExplain();

// Reset explanation when commit changes
useEffect(() => {
  setShowExplanation(false);
  setExplanation("");
  aiExplain.reset();
}, [selectedCommit]);
```

(Also add `useEffect` to the react import.)

### 3c. Add handler

```typescript
const handleExplain = async () => {
  if (!repoPath || !selectedCommit || !commit) return;
  if (showExplanation && explanation) {
    setShowExplanation(false);
    return;
  }
  setShowExplanation(true);
  if (explanation) return; // Already have explanation

  try {
    const result = await aiExplain.mutateAsync({
      repoPath,
      commitHash: selectedCommit,
      commitMessage: commit.message,
    });
    setExplanation(result);
  } catch {
    // Error is rendered from mutation state
  }
};
```

### 3d. Add UI

Insert after the Revert button (line 118), before the closing `</div>` of the metadata section (line 119):

```tsx
{/* AI Explain button — only show if AI is configured */}
{localStorage.getItem("gitflowAiApiKey") && (
  <button
    onClick={handleExplain}
    disabled={aiExplain.isPending}
    className="flex items-center gap-1.5 px-2 py-1 mt-1 text-2xs font-medium text-accent hover:text-accent-fg bg-accent-10 hover:bg-accent-20 border border-accent-30 rounded-mac transition-all cursor-pointer disabled:opacity-40"
    title="Explain this commit with AI"
  >
    <Sparkles size={11} className={aiExplain.isPending ? "animate-pulse" : ""} />
    {aiExplain.isPending
      ? "Analyzing..."
      : showExplanation
        ? "Hide explanation"
        : "Explain with AI"}
  </button>
)}
```

### 3e. Add collapsible explanation section

Insert after the metadata `</div>` (line 119), before the Changed Files section (line 121):

```tsx
{/* AI Explanation */}
{showExplanation && (
  <div className="px-3 py-2 border-b border-border bg-accent-5">
    <div className="flex items-center gap-1.5 mb-1.5">
      <Sparkles size={11} className="text-accent" />
      <span className="text-2xs font-semibold text-accent">AI Explanation</span>
    </div>
    {aiExplain.isPending ? (
      <div className="text-2xs text-text-muted animate-pulse">Analyzing commit changes...</div>
    ) : aiExplain.isError ? (
      <div className="text-2xs text-[#ff375f]">
        {aiExplain.error?.message || "Failed to explain commit"}
        <button
          onClick={handleExplain}
          className="ml-2 text-accent underline text-2xs"
        >
          Retry
        </button>
      </div>
    ) : explanation ? (
      <div className="text-2xs text-text-secondary leading-relaxed whitespace-pre-wrap">
        {explanation}
      </div>
    ) : null}
  </div>
)}
```

---

## Verification Checklist

- [ ] `tsc --noEmit` passes
- [ ] Select a commit → "Explain with AI" button appears (only when API key configured)
- [ ] Click button → loading state shows
- [ ] AI response renders in collapsible section below metadata
- [ ] Selecting a different commit resets the explanation
- [ ] No API key → button does not appear
- [ ] API error → error message with Retry button
- [ ] Empty diff merge commit → graceful "no changes" message
- [ ] Button toggles explanation visibility on re-click
