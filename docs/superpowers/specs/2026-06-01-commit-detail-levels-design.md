# Commit Message Detail Levels: 5-Level Granular Control

**Date:** 2026-06-01  
**Status:** Design  
**Scope:** AI commit message generator + local fallback formatting

## Overview

Replace the current 3-level system (`minimal`, `medium`, `detailed`) with 5 levels that provide granular control over commit message verbosity. This gives users fine-grained options from ultra-concise to comprehensive, supporting diverse team preferences and project types.

## Current State

- **Type:** `CommitMessageDetailLevel = "minimal" | "medium" | "detailed"`
- **Storage:** `localStorage.gitflowAiDetailLevel`
- **Default:** `"medium"`
- **Usage:** Controls both AI prompt instructions and local fallback formatting

## The Five Levels

### 1. Ultra-Minimal
**Subject only, ≤50 characters**

```
feat(auth): add JWT token refresh
```

- No body, no bullet points
- Use case: Quick commits, CI/CD automation, minimal noise
- AI instruction: "Return ONLY a single line subject. No body."
- Local formatting: Subject only

### 2. Minimal
**Subject + brief context (1-2 lines)**

```
feat(auth): add JWT token refresh

Implements automatic token refresh on expiry
```

- Subject + 1-2 lines of explanation
- Use case: Small changes, straightforward commits
- AI instruction: "Return subject + 1-2 lines of brief explanation."
- Local formatting: Subject + 0 bullet points (explanation is implicit)

### 3. Medium (Current Default)
**Subject + moderate details (3-4 bullet points)**

```
feat(auth): add JWT token refresh

- Add refresh token endpoint
- Update auth middleware
- Add token expiry handling
```

- Subject + 3-4 bullet points of changed files/areas
- Use case: Standard commits with enough context
- AI instruction: "If the changes are complex, add a short body after a blank line."
- Local formatting: Subject + 3 bullet points

### 4. Detailed (Current "Detailed")
**Subject + body + comprehensive list (5-8 bullet points)**

```
feat(auth): add JWT token refresh

Implements automatic token refresh mechanism to improve user experience
and reduce re-authentication friction.

- Add POST /auth/refresh endpoint
- Update middleware to intercept 401 responses
- Add token expiry validation
- Store refresh token in secure cookie
- Add tests for refresh flow
```

- Subject + body explanation + 5-8 bullet points
- Use case: Complex changes, team collaboration
- AI instruction: "Write a detailed commit message with a body and concise bullet points."
- Local formatting: Subject + 8 bullet points

### 5. Comprehensive
**Subject + body + reasoning + breaking changes**

```
feat(auth): add JWT token refresh

Implements automatic token refresh mechanism to improve user experience
and reduce re-authentication friction. This change modernizes our auth
system to match industry standards.

Changes:
- Add POST /auth/refresh endpoint
- Update middleware to intercept 401 responses
- Add token expiry validation
- Store refresh token in secure cookie
- Add tests for refresh flow

Reasoning:
Users were experiencing frequent logouts. This refresh mechanism keeps
sessions alive without requiring re-login, improving retention.

Breaking Changes:
- Old refresh tokens are invalidated; users must re-login once
```

- Subject + detailed body + bullet points + reasoning + breaking changes
- Use case: Major features, public APIs, documentation-heavy projects
- AI instruction: "Write comprehensive message with body, 5-8 bullet points, reasoning section, and any breaking changes."
- Local formatting: Subject + 8 bullet points + reasoning section (when applicable)

## Implementation Changes

### Type Definition
**File:** `apps/desktop/src/lib/ai.ts`

```typescript
type CommitMessageDetailLevel = "ultra-minimal" | "minimal" | "medium" | "detailed" | "comprehensive";
```

### AI Prompt Instructions
Update `buildCommitPrompt()` to handle all 5 levels:

```typescript
const styleInstruction = 
  settings.detailLevel === "ultra-minimal"
    ? "3. Return ONLY a single line (the subject line). No body."
    : settings.detailLevel === "minimal"
      ? "3. Return subject + 1-2 lines of brief explanation."
      : settings.detailLevel === "medium"
        ? "3. If the changes are complex, add a short body after a blank line."
        : settings.detailLevel === "detailed"
          ? "3. Write a detailed commit message with a body and concise bullet points."
          : "3. Write comprehensive message with body, 5-8 bullet points, reasoning section, and any breaking changes.";
```

### Local Fallback Formatting
Update `formatLocalCommitMessage()` to support all 5 levels:

- `ultra-minimal`: Return subject only
- `minimal`: Return subject only (explanation is implicit in AI generation)
- `medium`: Subject + 3 bullet points
- `detailed`: Subject + 8 bullet points
- `comprehensive`: Subject + 8 bullet points + reasoning section

Update `buildLocalChangeList()` to accept dynamic limit parameter.

### localStorage Validation
Update `readCommitMessageDetailLevel()` to validate all 5 values:

```typescript
function readCommitMessageDetailLevel(): CommitMessageDetailLevel {
  const saved = localStorage.getItem("gitflowAiDetailLevel");
  if (["ultra-minimal", "minimal", "medium", "detailed", "comprehensive"].includes(saved)) {
    return saved as CommitMessageDetailLevel;
  }
  return "medium";
}
```

### UI Changes
**File:** `apps/desktop/src/components/phase2/AISettingsDialog.tsx` (or equivalent)

- Update the detail level selector to display all 5 options
- Add brief descriptions for each level (1-2 words)
- Maintain current selection logic

## Data Migration

- Existing `"minimal"` → maps to `"minimal"` (no change)
- Existing `"medium"` → maps to `"medium"` (no change)
- Existing `"detailed"` → maps to `"detailed"` (no change)
- No breaking changes; old values remain valid

## Testing Strategy

1. **Unit tests:** Verify each detail level produces correct prompt instructions
2. **Local fallback tests:** Verify formatting for each level with various file counts
3. **Integration tests:** Test AI generation with each detail level (if API available)
4. **Manual verification:** Test UI selector and localStorage persistence

## Success Criteria

- ✓ All 5 detail levels selectable in UI
- ✓ AI prompts adjust correctly per level
- ✓ Local fallback formatting matches each level's specification
- ✓ localStorage persists selection across sessions
- ✓ No breaking changes to existing configurations
- ✓ Backward compatible with existing "minimal", "medium", "detailed" values
