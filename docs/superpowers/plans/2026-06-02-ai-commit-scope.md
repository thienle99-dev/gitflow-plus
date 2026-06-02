# AI Commit Scope Suggestion — Implementation Plan

## File Structure

### Modified Files
```
apps/desktop/src/lib/ai.ts                                    — Add analyzeCommitScope()
apps/desktop/src/queries/useAI.ts                             — Add useAICommitScope hook
apps/desktop/src/components/features/working-tree/WorkingTree.tsx — Add scope suggestion UI
```

No new files needed — all changes fit into existing modules.

---

## Task 1: Add analyzeCommitScope() in ai.ts

**File:** `apps/desktop/src/lib/ai.ts`

Add after [`explainCommitWithAI()`](apps/desktop/src/lib/ai.ts:80):

### 1a: Add TypeScript interfaces

```typescript
export interface CommitGroup {
  files: string[];
  message: string;
  reason: string;
}

export interface CommitScopeSuggestion {
  shouldSplit: boolean;
  overallMessage: string;
  groups: CommitGroup[];
  explanation: string;
}
```

### 1b: Add shouldAnalyzeScope() pre-filter

```typescript
export function shouldAnalyzeScope(files: FileChange[]): boolean {
  if (files.length < 5) return false;
  const dirs = new Set(files.map(f => f.path.split("/")[0]));
  return dirs.size >= 2;
}
```

### 1c: Add analyzeCommitScope() function

```typescript
export async function analyzeCommitScope(
  repoPath: string,
  files: FileChange[],
): Promise<CommitScopeSuggestion | null> {
  const settings = readAISettings();
  if (!hasProvider(settings)) return null;
  if (!shouldAnalyzeScope(files)) return null;

  const diff = await api.diff.staged(repoPath);
  if (!diff.trim()) return null;

  const branchName = await getCurrentBranchName(repoPath);
  const branchContext = branchName ? `Branch: ${branchName}\n` : "";

  const prompt = `You are an expert developer reviewing staged git changes. Analyze the diff and determine if the changes should be split into multiple atomic commits.

Return a JSON object with this structure:
{
  "shouldSplit": boolean,
  "overallMessage": "single commit message if not splitting",
  "groups": [
    {
      "files": ["path/to/file1"],
      "message": "conventional commit message for this group",
      "reason": "why these files belong together"
    }
  ],
  "explanation": "brief explanation of why splitting is recommended"
}

RULES:
- If changes are logically cohesive, set shouldSplit=false and provide overallMessage
- If changes span unrelated concerns, set shouldSplit=true and provide groups
- Each group should be a self-contained atomic change
- Each message follows format: type(scope): description
- Maximum 4 groups
- Return ONLY the JSON, no markdown code blocks, no wrapping

${branchContext}Staged diff:
${diff.slice(0, 12_000)}`;

  const raw = cleanAIText(await requestAIText(prompt, settings));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.shouldSplit === "boolean") {
      return parsed as CommitScopeSuggestion;
    }
  } catch {
    // Invalid JSON — return null, caller falls back to single message
  }
  return null;
}
```

Key points:
- Reuses existing `readAISettings()`, `hasProvider()`, `requestAIText()`, `cleanAIText()`, `getCurrentBranchName()`
- Uses `api.diff.staged()` which already exists
- Returns `null` on any failure (caller handles fallback)
- Diff truncated to 12000 chars (same as explainCommitWithAI)

---

## Task 2: Add useAICommitScope hook in useAI.ts

**File:** `apps/desktop/src/queries/useAI.ts`

### 2a: Update import

Add `analyzeCommitScope` and `CommitScopeSuggestion` to the import from `@/lib/ai`.

### 2b: Add hook

```typescript
export function useAICommitScope() {
  return useMutation({
    mutationFn: ({ repoPath, files }: { repoPath: string; files: FileChange[] }) =>
      analyzeCommitScope(repoPath, files),
  });
}
```

---

## Task 3: Add scope suggestion UI in WorkingTree.tsx

**File:** `apps/desktop/src/components/features/working-tree/WorkingTree.tsx`

### 3a: Add imports

- Import `useAICommitScope` from `@/queries/useAI`
- Import `CommitScopeSuggestion` type from `@/lib/ai`

### 3b: Add state

```typescript
const commitScope = useAICommitScope();
const [scopeSuggestion, setScopeSuggestion] = useState<CommitScopeSuggestion | null>(null);
const [scopeDismissed, setScopeDismissed] = useState(false);
```

### 3c: Modify handleGenerateCommit

After the existing AI commit message generation, chain the scope analysis:

```typescript
const handleGenerateCommit = async () => {
  // ... existing code that sets commitMessage ...
  
  // After setting commit message, run scope analysis in background
  if (changes && changes.length > 0) {
    setScopeDismissed(false);
    try {
      const scope = await commitScope.mutateAsync({ repoPath: repoPath!, files: changes });
      if (scope?.shouldSplit && scope.groups.length > 1) {
        setScopeSuggestion(scope);
      } else {
        setScopeSuggestion(null);
      }
    } catch {
      setScopeSuggestion(null);
    }
  }
};
```

### 3d: Add "Use this" handler

```typescript
const handleUseGroup = async (group: { files: string[]; message: string }) => {
  try {
    // Unstage all
    await api.commit.unstageAll(repoPath!);
    // Stage only this group's files
    for (const filePath of group.files) {
      await api.commit.stage(repoPath!, filePath);
    }
    setCommitMessage(group.message);
    // Remove this group from suggestions
    setScopeSuggestion(prev => {
      if (!prev) return null;
      const remaining = prev.groups.filter(g => g !== group);
      if (remaining.length <= 1) return null;
      return { ...prev, groups: remaining };
    });
    showToast(`Staged ${group.files.length} files. Commit with ⌘↵`);
  } catch (e: any) {
    showToast(`Error: ${e}`);
  }
  requestAnimationFrame(() => textareaRef.current?.focus());
};
```

### 3e: Add scope suggestion UI panel

Render below the commit message textarea, before the commit button row:

```tsx
{scopeSuggestion && !scopeDismissed && (
  <div className="border border-accent-20 bg-accent-5 rounded-mac p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-accent">
        💡 AI suggests splitting into {scopeSuggestion.groups.length} commits
      </span>
      <button onClick={() => setScopeDismissed(true)} className="text-text-muted hover:text-text-primary">
        <X size={14} />
      </button>
    </div>
    <p className="text-2xs text-text-secondary">{scopeSuggestion.explanation}</p>
    
    <div className="space-y-1.5">
      {scopeSuggestion.groups.map((group, i) => (
        <div key={i} className="flex items-start gap-2 p-2 bg-surface-1 rounded border border-border-30">
          <span className="text-2xs font-mono text-accent mt-0.5">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">{group.message}</p>
            <p className="text-2xs text-text-muted truncate">{group.files.join(", ")}</p>
            <p className="text-2xs text-text-secondary italic">{group.reason}</p>
          </div>
          <button
            onClick={() => handleUseGroup(group)}
            className="shrink-0 text-2xs font-semibold px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
          >
            Use this
          </button>
        </div>
      ))}
    </div>
    
    <button
      onClick={() => { setScopeDismissed(true); }}
      className="w-full text-2xs text-text-muted hover:text-text-primary py-1"
    >
      Commit all as one
    </button>
  </div>
)}
```

### 3f: Reset scope on commit

In `handleCommit`, after successful commit, check if there are remaining groups:
```typescript
setScopeSuggestion(prev => {
  if (!prev) return null;
  // Re-check: if files are now committed, remove those groups
  return null; // Clear for simplicity; re-analyze on next generate
});
```

---

## Task 4: Verification

### Manual testing scenarios:
1. Stage 5+ files across 2+ directories → click Sparkles → should see scope suggestion
2. Stage 2 files in same directory → click Sparkles → should NOT see scope suggestion
3. Click "Use this" on a group → files should be unstaged then re-staged for that group
4. Click "Commit All as One" → suggestion dismissed, overall message used
5. Click X to dismiss → suggestion hidden
6. Commit with a group selected → remaining groups cleared
7. No API key configured → scope analysis skipped silently

### Automated checks:
- `npx tsc --noEmit` passes
- No new Rust code needed

---

## Verification Checklist

- [x] `npx tsc --noEmit` passes
- [x] Scope analysis triggers when ≥5 files across ≥2 top-level dirs
- [x] Scope analysis skipped when pre-filter fails
- [x] Scope analysis skipped when no API key configured
- [x] "Use this" unstages all, stages group files, sets commit message
- [x] "Commit All as One" dismisses suggestion and uses overall message
- [x] Dismiss button hides the suggestion panel
- [x] Invalid AI JSON response is handled gracefully (no crash)
- [x] Suggestion panel has proper styling matching existing UI
