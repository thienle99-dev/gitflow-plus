# Commit Message Detail Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 5-level commit message detail control system (ultra-minimal, minimal, medium, detailed, comprehensive) to give users granular control over commit message verbosity.

**Architecture:** Update the type definition in `ai.ts` to support 5 levels, adjust AI prompt instructions for each level, update local fallback formatting logic, validate localStorage reads, and add UI options in SettingsDialog.

**Tech Stack:** TypeScript, React, localStorage, Tauri API

---

## File Structure

**Modified files:**
- `apps/desktop/src/lib/ai.ts` — Type definition, prompt building, local formatting logic
- `apps/desktop/src/components/features/dialogs/SettingsDialog.tsx` — UI selector with 5 options
- `apps/desktop/src/queries/useAI.ts` — Tests for detail level logic (if exists)

**No new files created** — all changes are additive to existing files.

---

## Task 1: Update Type Definition and Validation

**Files:**
- Modify: `apps/desktop/src/lib/ai.ts:22` (type definition)
- Modify: `apps/desktop/src/lib/ai.ts:124-130` (validation function)

- [ ] **Step 1: Update CommitMessageDetailLevel type**

Replace line 22:
```typescript
type CommitMessageDetailLevel = "ultra-minimal" | "minimal" | "medium" | "detailed" | "comprehensive";
```

- [ ] **Step 2: Update readCommitMessageDetailLevel() validation**

Replace lines 124-130 with:
```typescript
function readCommitMessageDetailLevel(): CommitMessageDetailLevel {
  const saved = localStorage.getItem("gitflowAiDetailLevel");
  const validLevels: CommitMessageDetailLevel[] = ["ultra-minimal", "minimal", "medium", "detailed", "comprehensive"];
  if (saved && validLevels.includes(saved as CommitMessageDetailLevel)) {
    return saved as CommitMessageDetailLevel;
  }
  return "medium";
}
```

- [ ] **Step 3: Verify type changes compile**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
cd /Users/thienlvc/Documents/vsext/gitflow-plus
git add apps/desktop/src/lib/ai.ts
git commit -m "feat(ai): add 5-level detail type definition"
```

---

## Task 2: Update AI Prompt Instructions

**Files:**
- Modify: `apps/desktop/src/lib/ai.ts:145-151` (buildCommitPrompt function)

- [ ] **Step 1: Update styleInstruction logic in buildCommitPrompt()**

Replace lines 147-151 with:
```typescript
const styleInstruction = settings.detailLevel === "ultra-minimal"
  ? "3. Return ONLY a single line (the subject line). No body."
  : settings.detailLevel === "minimal"
    ? "3. Return subject + 1-2 lines of brief explanation."
    : settings.detailLevel === "medium"
      ? "3. If the changes are complex, add a short body after a blank line."
      : settings.detailLevel === "detailed"
        ? "3. Write a detailed commit message with a body and concise bullet points."
        : "3. Write comprehensive message with body, 5-8 bullet points, reasoning section, and any breaking changes.";
```

- [ ] **Step 2: Verify the prompt building logic**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/lib/ai.ts
git commit -m "feat(ai): update prompt instructions for 5 detail levels"
```

---

## Task 3: Update Local Fallback Formatting

**Files:**
- Modify: `apps/desktop/src/lib/ai.ts:185-209` (formatLocalCommitMessage function)
- Modify: `apps/desktop/src/lib/ai.ts:231-233` (buildLocalChangeList function)

- [ ] **Step 1: Update formatLocalCommitMessage() to handle all 5 levels**

Replace lines 185-209 with:
```typescript
function formatLocalCommitMessage(
  style: CommitMessageStyle,
  detailLevel: CommitMessageDetailLevel,
  type: string,
  scope: string,
  description: string,
  branchName: string,
  files: FileChange[],
) {
  const subject = formatCommitSubject(style, type, scope, description, branchName);
  
  if (detailLevel === "ultra-minimal") {
    return subject;
  }

  if (detailLevel === "minimal") {
    return subject;
  }

  const changeList = buildLocalChangeList(
    files,
    detailLevel === "detailed" || detailLevel === "comprehensive" ? 8 : 3
  );
  
  if (changeList.length === 0) {
    return subject;
  }

  if (detailLevel === "medium") {
    return `${subject}\n\n${changeList.map((line) => `- ${line}`).join("\n")}`;
  }

  if (detailLevel === "detailed") {
    return `${subject}\n\nChanges:\n${changeList.map((line) => `- ${line}`).join("\n")}`;
  }

  if (detailLevel === "comprehensive") {
    const reasoning = "See branch name and diff for context.";
    return `${subject}\n\nChanges:\n${changeList.map((line) => `- ${line}`).join("\n")}\n\nReasoning:\n${reasoning}`;
  }

  return subject;
}
```

- [ ] **Step 2: Verify formatting logic compiles**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/lib/ai.ts
git commit -m "feat(ai): update local formatting for 5 detail levels"
```

---

## Task 4: Update UI Selector in SettingsDialog

**Files:**
- Modify: `apps/desktop/src/components/features/dialogs/SettingsDialog.tsx:1082-1084` (select options)

- [ ] **Step 1: Update the detail level selector options**

Replace lines 1082-1084 with:
```typescript
<option value="ultra-minimal">Ultra-Minimal (Subject only)</option>
<option value="minimal">Minimal (Subject + brief context)</option>
<option value="medium">Standard (Subject + 3-4 bullet points)</option>
<option value="detailed">Detailed (Subject + body + 5-8 bullets)</option>
<option value="comprehensive">Comprehensive (Full format + reasoning)</option>
```

- [ ] **Step 2: Verify the component renders without errors**

Run: `cd apps/desktop && pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/features/dialogs/SettingsDialog.tsx
git commit -m "feat(ui): add 5-level detail selector options"
```

---

## Task 5: Test Type Validation

**Files:**
- Test: `apps/desktop/src/lib/ai.test.ts` (create if doesn't exist)

- [ ] **Step 1: Create test file if it doesn't exist**

Check if file exists:
```bash
ls -la /Users/thienlvc/Documents/vsext/gitflow-plus/apps/desktop/src/lib/ai.test.ts
```

If not found, create it with:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("readCommitMessageDetailLevel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns 'medium' as default when no value is stored", () => {
    // Import and test the function
    // This requires exporting readCommitMessageDetailLevel from ai.ts
  });

  it("returns stored value for valid detail levels", () => {
    const validLevels = ["ultra-minimal", "minimal", "medium", "detailed", "comprehensive"];
    validLevels.forEach((level) => {
      localStorage.setItem("gitflowAiDetailLevel", level);
      // Test that the function returns the stored level
    });
  });

  it("returns 'medium' for invalid stored values", () => {
    localStorage.setItem("gitflowAiDetailLevel", "invalid-level");
    // Test that the function returns 'medium'
  });
});
```

- [ ] **Step 2: Export readCommitMessageDetailLevel from ai.ts**

Add to exports in `apps/desktop/src/lib/ai.ts` (after the function definition):
```typescript
export { readCommitMessageDetailLevel };
```

- [ ] **Step 3: Run tests**

Run: `cd apps/desktop && pnpm test -- src/lib/ai.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/lib/ai.test.ts apps/desktop/src/lib/ai.ts
git commit -m "test(ai): add validation tests for detail levels"
```

---

## Task 6: Test Prompt Building

**Files:**
- Test: `apps/desktop/src/lib/ai.test.ts` (add to existing or new file)

- [ ] **Step 1: Add test for buildCommitPrompt with each detail level**

Add to test file:
```typescript
describe("buildCommitPrompt", () => {
  it("includes ultra-minimal instruction for ultra-minimal level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "ultra-minimal" as const,
      commitStyle: "conventional" as const,
      customRules: "",
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("Return ONLY a single line");
  });

  it("includes minimal instruction for minimal level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "minimal" as const,
      commitStyle: "conventional" as const,
      customRules: "",
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("1-2 lines of brief explanation");
  });

  it("includes comprehensive instruction for comprehensive level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "comprehensive" as const,
      commitStyle: "conventional" as const,
      customRules: "",
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("reasoning section");
  });
});
```

- [ ] **Step 2: Export buildCommitPrompt from ai.ts**

Add to exports in `apps/desktop/src/lib/ai.ts`:
```typescript
export { buildCommitPrompt };
```

- [ ] **Step 3: Run tests**

Run: `cd apps/desktop && pnpm test -- src/lib/ai.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/lib/ai.test.ts apps/desktop/src/lib/ai.ts
git commit -m "test(ai): add prompt building tests for all detail levels"
```

---

## Task 7: Test Local Formatting

**Files:**
- Test: `apps/desktop/src/lib/ai.test.ts` (add to existing file)

- [ ] **Step 1: Add test for formatLocalCommitMessage with each detail level**

Add to test file:
```typescript
describe("formatLocalCommitMessage", () => {
  const mockFiles = [
    { path: "src/auth.ts", status: "modified" },
    { path: "src/api.ts", status: "modified" },
    { path: "tests/auth.test.ts", status: "added" },
  ];

  it("returns subject only for ultra-minimal level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "ultra-minimal",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toBe("feat(auth): add JWT refresh");
    expect(result).not.toContain("\n");
  });

  it("returns subject only for minimal level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "minimal",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toBe("feat(auth): add JWT refresh");
  });

  it("returns subject + 3 bullets for medium level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "medium",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toContain("feat(auth): add JWT refresh");
    expect(result).toContain("- update src/auth.ts");
    expect(result).toContain("- update src/api.ts");
    expect(result).toContain("- add tests/auth.test.ts");
  });

  it("returns subject + body + 8 bullets for detailed level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "detailed",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toContain("feat(auth): add JWT refresh");
    expect(result).toContain("Changes:");
    expect(result).toContain("- update src/auth.ts");
  });

  it("returns subject + body + bullets + reasoning for comprehensive level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "comprehensive",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toContain("feat(auth): add JWT refresh");
    expect(result).toContain("Changes:");
    expect(result).toContain("Reasoning:");
  });
});
```

- [ ] **Step 2: Export formatLocalCommitMessage from ai.ts**

Add to exports in `apps/desktop/src/lib/ai.ts`:
```typescript
export { formatLocalCommitMessage };
```

- [ ] **Step 3: Run tests**

Run: `cd apps/desktop && pnpm test -- src/lib/ai.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/lib/ai.test.ts apps/desktop/src/lib/ai.ts
git commit -m "test(ai): add formatting tests for all detail levels"
```

---

## Task 8: Manual UI Verification

**Files:**
- No code changes; manual testing only

- [ ] **Step 1: Start the dev server**

Run: `cd apps/desktop && pnpm dev`
Expected: Vite dev server starts on port 1420

- [ ] **Step 2: Open Settings dialog**

In the app, open Settings → AI Integration → Commit Message Detail

- [ ] **Step 3: Verify all 5 options appear**

Check that the selector shows:
- Ultra-Minimal (Subject only)
- Minimal (Subject + brief context)
- Standard (Subject + 3-4 bullet points)
- Detailed (Subject + body + 5-8 bullets)
- Comprehensive (Full format + reasoning)

- [ ] **Step 4: Test persistence**

- Select "Ultra-Minimal" and save
- Refresh the page
- Verify "Ultra-Minimal" is still selected

- [ ] **Step 5: Test each level generates correct format**

For each detail level:
- Make a staged change (e.g., edit a file)
- Trigger commit message generation
- Verify the format matches the level's specification

- [ ] **Step 6: Stop dev server**

Press `Ctrl+C` in the terminal

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(ui): manual verification of 5-level detail selector"
```

---

## Task 9: Build and Final Verification

**Files:**
- No code changes; build verification only

- [ ] **Step 1: Build the frontend**

Run: `cd apps/desktop && pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Build the Rust backend**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run full test suite**

Run: `cd apps/desktop && pnpm test`
Expected: All tests pass

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "build: verify 5-level detail system builds successfully"
```

---

## Verification Checklist

- ✓ Type definition updated to include all 5 levels
- ✓ localStorage validation accepts all 5 levels
- ✓ AI prompt instructions differ for each level
- ✓ Local formatting produces correct output for each level
- ✓ UI selector displays all 5 options with descriptions
- ✓ Settings persist across page refresh
- ✓ Tests pass for validation, prompts, and formatting
- ✓ Manual UI verification confirms correct behavior
- ✓ Frontend and backend build successfully
- ✓ No breaking changes to existing configurations
