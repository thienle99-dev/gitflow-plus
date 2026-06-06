---
name: code-review-checklist
description: Code review guidelines covering code quality, security, and best practices.
when_to_use: "When reviewing code for quality, security, and best practices. When the user says 'review my code' or 'check this PR'."
allowed-tools: Read, Glob, Grep
---

# Code Review Checklist

## Quick Review Checklist

### Correctness
- [ ] Code does what it's supposed to do
- [ ] Edge cases handled
- [ ] Error handling in place
- [ ] No obvious bugs

### Security
- [ ] Input validated and sanitized
- [ ] No SQL/NoSQL injection vulnerabilities
- [ ] No XSS or CSRF vulnerabilities
- [ ] No hardcoded secrets or sensitive credentials
- [ ] **AI-Specific:** Protection against Prompt Injection (if applicable)
- [ ] **AI-Specific:** Outputs are sanitized before being used in critical sinks

### Performance
- [ ] No N+1 queries
- [ ] No unnecessary loops
- [ ] Appropriate caching
- [ ] Bundle size impact considered

### Code Quality
- [ ] Clear naming
- [ ] DRY - no duplicate code
- [ ] SOLID principles followed
- [ ] Appropriate abstraction level

### Testing
- [ ] Unit tests for new code
- [ ] Edge cases tested
- [ ] Tests readable and maintainable

### Documentation
- [ ] Complex logic commented
- [ ] Public APIs documented
- [ ] README updated if needed

## Tauri v2 / Rust Backend

### IPC Command Security
- [ ] All `#[tauri::command]` functions validate inputs (no raw `String` trust)
- [ ] File paths validated against traversal (`../`, symlink attacks)
- [ ] Shell commands use `Command::new` with explicit args, never `format!` interpolation
- [ ] Capabilities in [`default.json`](src-tauri/capabilities/default.json) follow least-privilege
- [ ] No `shell:allow-execute` or overly broad permissions granted
- [ ] Rust `unwrap()`/`expect()` only in init code, not in command handlers
- [ ] Error types mapped to user-facing messages (no raw Rust panics leaking)

### Rust Code Quality
- [ ] No `unsafe` blocks without documented justification
- [ ] `#[tauri::command]` functions are `async` and return `Result<T, String>`
- [ ] File I/O uses `tokio::fs` (async) not `std::fs` (blocking)
- [ ] Git operations via `git2` crate with proper error propagation
- [ ] Large data serialized with `serde` derive, not manual string building

## React / TypeScript Frontend

### React Query Patterns
- [ ] Query keys are consistent arrays (e.g. `["ai.diff-review", filePath, mode]`)
- [ ] Mutations use `mutationKey` for cache invalidation
- [ ] No stale closures in `useMutation.mutationFn` — verify refs vs state
- [ ] `enabled` flag prevents queries from firing with `null` repoPath
- [ ] `refetchInterval` used sparingly; prefer event-driven invalidation via Tauri events
- [ ] Loading/error states handled in every consuming component (no silent failures)

### Zustand State Management
- [ ] Selectors extract minimal state (avoid `useStore(s => s)` full-object reads)
- [ ] Derived state computed in selectors, not duplicated in store
- [ ] Actions defined inside store, not external setters
- [ ] No circular dependencies between store slices
- [ ] Persistence layer (if any) validated for schema migration safety

### Component Patterns
- [ ] No inline object/array literals in JSX props (causes re-render)
- [ ] Expensive computations wrapped in `useMemo`/`useCallback` with correct deps
- [ ] Event handlers defined outside render or wrapped in `useCallback`
- [ ] Component files ≤ 300 lines; extract hooks/subcomponents if larger
- [ ] Named exports preferred over default exports for refactoring ease

## Tailwind CSS / Styling

### Theme Consistency
- [ ] Colors use semantic tokens (`text-text-primary`, `bg-surface-1`) not raw hex
- [ ] Border radius uses `rounded-mac` or design system tokens
- [ ] Spacing follows Tailwind scale, no arbitrary `px-13` values
- [ ] Animations use `animate-in` / Tailwind plugins, not raw CSS keyframes
- [ ] Dark mode handled via Tailwind `dark:` or CSS variables, not JS toggling

## AI Integration Review

### API Key & Credential Safety
- [ ] API keys stored via Tauri `store` plugin or OS keychain, never in localStorage
- [ ] API keys redacted in all log output and error messages
- [ ] `clearAICache()` called when user changes AI profile/settings
- [ ] Rate limiter enforced client-side (see [`waitForRateSlot()`](apps/desktop/src/lib/ai.ts:52))

### Prompt Injection Prevention
- [ ] User-supplied file content never injected raw into system prompts
- [ ] AI responses rendered as markdown via [`AIMarkdown`](apps/desktop/src/components/ui/feedback/AIMarkdown.tsx), not `dangerouslySetInnerHTML`
- [ ] Inline review comments validated before display (no `<script>` or event handlers)
- [ ] AI output schema validated with Zod or runtime type check before use

### AI Feature Quality
- [ ] Fallback behavior when AI is unavailable (offline mode, manual entry)
- [ ] Token limit respected; truncation handled gracefully
- [ ] AI review mode selection (`quick` vs `deep`) impacts actual prompt depth
- [ ] Streaming responses (if any) handle partial/failed chunks

## Git Operations Safety

### Destructive Operation Guards
- [ ] `git reset --hard`, `git clean`, `git push --force` require explicit confirmation dialog
- [ ] Branch deletion checks for unmerged commits
- [ ] Rebase/squash operations show preview before execution
- [ ] Undo button available after destructive operations (reflog-based)
- [ ] Cherry-pick/merge conflicts presented with resolution UI, not auto-resolved

### Working Tree Integrity
- [ ] Staged vs unstaged file state tracked correctly in [`CommitBox`](apps/desktop/src/components/features/working-tree/CommitBox.tsx)
- [ ] Concurrent file modifications handled (file watcher events)
- [ ] Lint checks run on staged files only, not full working tree
- [ ] Commit lint rules enforced before allowing commit

## Desktop App Patterns

### Performance for Large Repos
- [ ] Commit graph uses Canvas renderer (not SVG) for >200 commits — see [`useCanvasRenderer`](apps/desktop/src/components/features/graph/useCanvasRenderer.ts)
- [ ] Virtual scrolling via `@tanstack/react-virtual` for large file lists
- [ ] Heavy computations offloaded to Web Workers (see [`graph-layout.worker.ts`](apps/desktop/src/lib/graph-layout.worker.ts))
- [ ] Diff parsing lazy-loaded, not in initial bundle
- [ ] CodeMirror editors use `LazyDiffViewer` for deferred initialization

### Window & Dialog Management
- [ ] Dialogs use consistent [`Dialog`](apps/desktop/src/components/ui/overlay/Dialog.tsx) component
- [ ] Modal focus trapped; `Escape` key closes dialogs
- [ ] Window state persistence via `@tauri-apps/plugin-window-state`
- [ ] Force update gate blocks interaction until acknowledged

### Platform Compatibility
- [ ] Tested on macOS (primary), Windows, Linux
- [ ] File path separators handled (not hardcoded `/`)
- [ ] Native menu/keyboard shortcuts don't conflict with OS bindings
- [ ] Tray behavior platform-appropriate (macOS hide vs Windows minimize)

## AI & LLM Review Patterns

### Logic & Hallucinations
- [ ] **Chain of Thought:** Does the logic follow a verifiable path?
- [ ] **Edge Cases:** Did the AI account for empty states, timeouts, and partial failures?
- [ ] **External State:** Is the code making safe assumptions about file systems or networks?

### Prompt Engineering Review
```markdown
// ❌ Vague prompt in code
const response = await ai.generate(userInput);

// ✅ Structured & Safe prompt
const response = await ai.generate({
  system: "You are a specialized parser...",
  input: sanitize(userInput),
  schema: ResponseSchema
});
```

## Anti-Patterns to Flag

```typescript
// ❌ Magic numbers
if (status === 3) { ... }

// ✅ Named constants
if (status === Status.ACTIVE) { ... }

// ❌ Deep nesting
if (a) { if (b) { if (c) { ... } } }

// ✅ Early returns
if (!a) return;
if (!b) return;
if (!c) return;
// do work

// ❌ Long functions (100+ lines)
// ✅ Small, focused functions

// ❌ any type
const data: any = ...

// ✅ Proper types
const data: UserData = ...
```

## Review Comments Guide

```
// Blocking issues use 🔴
🔴 BLOCKING: SQL injection vulnerability here

// Important suggestions use 🟡
🟡 SUGGESTION: Consider using useMemo for performance

// Minor nits use 🟢
🟢 NIT: Prefer const over let for immutable variable

// Questions use ❓
❓ QUESTION: What happens if user is null here?
```
