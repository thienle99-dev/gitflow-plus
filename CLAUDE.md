# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GitFlow Desktop — a desktop Git client built with Tauri 2 (Rust backend) and React 18 (frontend). pnpm-workspace monorepo: `apps/desktop` is the React/Vite frontend, `src-tauri` is the Rust/Tauri shell, `apps/landing` is a separate React/Vite marketing site (no Tauri). The frontend package name is `@gitflow-desktop/desktop`.

## Commands

Frontend (run from `apps/desktop/`):

- `pnpm dev` — Vite dev server on port 1420 (strictPort; the Tauri shell expects exactly this port)
- `pnpm build` — `tsc && vite build` (type-check then bundle to `dist/`)
- `pnpm test` — `vitest run` (one-shot)
- `pnpm test:watch` — Vitest watch mode
- Single test: `pnpm vitest run path/to/file.test.ts` or `pnpm vitest -t "test name"`

Full desktop app (the only way to exercise Tauri commands, since `invoke` is a no-op in a plain browser): driven by the cargo tauri CLI from `src-tauri/` (`cargo tauri dev` / `cargo tauri build`). `tauri.conf.json` runs `npm run dev` / `npm run build` as its before-hooks and serves the frontend from `../apps/desktop/dist`. Rust-only build/check: `cargo build` or `cargo check` in `src-tauri/`.

Release (from repo root):

- `python3 scripts/release.py` — bumps version in `Cargo.toml`, `tauri.conf.json`, and `apps/desktop/package.json`, commits, tags, and pushes. GitHub Actions builds cross-platform binaries on tag push.
- `python3 scripts/release.py --force-update` — marks the release as a forced update
- `python3 scripts/release.py --version 1.2.3 --no-force-update` — non-interactive

The `@` import alias maps to `apps/desktop/src` (configured in both `vite.config.ts` and `tsconfig.json`).

## Architecture

### Git operations are git-CLI subprocesses, not a library

Every backend command in `src-tauri/src/commands/*.rs` shells out to the system `git` binary via `Command::new("git").args(["--no-pager", "-C", path, ...])` (Tokio async), then parses stdout. Failures are detected with `output.status.success()` and surfaced as `Err(stderr)`. There is no libgit2 / git2 crate. Consequence: the user's installed `git` and its behavior is the source of truth, and parsing is line/delimiter-based.

`git_log` (`commands/log.rs`) is the most format-sensitive: pretty-format is `%H|%P|%an|%ae|%ai|%D|%s|%G?` (8 pipe-delimited fields — the trailing `%G?` is the GPG signature status; `splitn(8, '|')`). `%D` carries ref decorations, parsed into typed `Ref { name, ref_type }` (head/tag/remote/branch). Pagination uses `--skip` + `--max-count` with default `per_page=200` (clamped 1–500). If you change the pretty-format string, update the split count and the matching `Commit`/`Ref` TypeScript interfaces in `api/tauri.ts` together.

### Two-layer state: TanStack Query (server) + Zustand (client)

- **TanStack Query** owns all git/server state. Query keys follow the convention `["git", repoPath, <resource>, ...]` (see `queries/useGitLog.ts`). This key shape is a contract — invalidation elsewhere relies on it.
- **Zustand** owns client/UI state only: `stores/repo.ts` (current repoPath, recentRepos, theme — persisted to `localStorage`), `stores/ui.ts` (sidebar, selected commit/file, diff view mode, active dialog), `stores/operations.ts` (in-flight git operations surfaced in OperationCenter), and `stores/logs.ts` (app-level log entries). `useOperationObserver` in `MainLayout.tsx` bridges React Query mutations into the operations store automatically — new mutations don't need manual wiring unless they need custom labels.

Don't put git data in Zustand or UI selection in Query.

### Component structure

Components live under `apps/desktop/src/components/` in three subdirectories:
- `features/` — feature-area components (`graph/`, `sidebar/`, `diff/`, `dialogs/`, `working-tree/`, etc.). New feature work goes here under the relevant area folder.
- `layout/` — app shell components (`Toolbar`, `RightPanel`, `BottomBar`, `OperationCenter`, `LogCenter`).
- `ui/` — shared primitives (`feedback/`, `form/`, `overlay/`, `shared/`, `theme/`).

### Realtime refresh loop (spans Rust → React)

This is the core reactivity mechanism and is split across two files:

1. `src-tauri/src/watcher/fs_watcher.rs` — a `notify` watcher on the repo root. macOS uses `PollWatcher` (kqueue events for FSEvents proved unreliable for `.git/`), other OSes use `RecommendedWatcher`. `classify_event` filters noise (`.git/objects`, `.git/logs`, `node_modules`, `target`, `index.lock`) and tags the rest as `worktree` / `refs` / `head`. Emits a single debounced (300ms) `repo:changed` Tauri event carrying `event_type`, and also invalidates the Rust-side status cache (`RepoCache`) directly on each qualifying event.
2. `apps/desktop/src/layouts/MainLayout.tsx` — starts/stops the watcher on repoPath change and listens for `repo:changed`, invalidating specific query keys per `event_type` (`worktree`→status, `refs`→branches+log, `head`→everything under the repo). The same layout also kicks off a parallel `prefetchQuery` warmup of log/status/branches/info/sync-status on repo open, and an interval-based background `git fetch` (configurable via `gitflowAutoFetch` and `gitflowFetchIntervalMinutes` in localStorage, defaults 10 min, clamped 5–60).

If git data isn't refreshing live, the bug is almost always in one of these two halves (event misclassification, or wrong query key in the invalidation switch).

### Adding a backend command (three coordinated edits)

1. Write the `#[tauri::command]` fn in the appropriate `src-tauri/src/commands/<area>.rs`.
2. Register it in the `invoke_handler!` list in `src-tauri/src/lib.rs`.
3. Add a typed wrapper in `apps/desktop/src/api/tauri.ts` (the single place the frontend calls `invoke`; nothing else should call `invoke` directly).

Note Tauri's arg casing: Rust snake_case params (e.g. `base_ref`) are passed as camelCase keys from JS (`baseRef`) — see existing wrappers for the pattern.

### Commit graph layout

`apps/desktop/src/lib/graph-layout.ts` (`computeGraphLayout`) turns the flat newest-first commit list into lanes/colors/coordinates for `components/graph/CommitGraph.tsx`. It keeps a commit on its first parent's lane, allocating a new lane otherwise. It's a presentation-only transform — pure function over `Commit[]`.

The computation runs off the main thread: `lib/graph-layout.worker.ts` wraps the same function as a Web Worker, invoked via `hooks/useGraphLayoutWorker.ts`. Don't call `computeGraphLayout` directly from a component — use the hook so large repos don't block the UI.

### AI integration

All AI HTTP requests go through Tauri's `ai_http_request` command (`commands/ai.rs`) rather than direct browser `fetch` — this is required to bypass CORS in the WebView. The frontend AI logic lives entirely in `lib/ai.ts`, which includes an in-memory response cache (10min TTL, 50 entries max) and a sliding-window rate limiter (10 req/min).

AI provider configuration is managed as named profiles in `lib/ai-profiles.ts`. The active profile is loaded via `loadActiveProfile()`. Legacy single-provider `localStorage` keys (`gitflowAiApiKey`, `gitflowAiModel`, etc.) still exist for backwards compatibility but profiles are the current system. Supported providers: Claude (Anthropic), OpenAI-compatible APIs, Ollama (`http://localhost:11434`), llama.cpp (`http://localhost:8080`).

AI features (commit summarization, risk scanner, lint summary, command assistant, etc.) are gated by the **`usePreflightGate`** hook + `preflight_check` Tauri command. Preflight returns conditions like `dirty_worktree`, `merge_in_progress`, `rebase_in_progress`, `cherry_pick_in_progress`, `has_conflicts`, `detached_head`, `unpushed_commits` — the hook blocks risky actions with a `ConfirmDialog` listing `ImpactItem[]` (severity: `warning` / `irreversible`) before invoking the underlying command. Treat preflight as the single chokepoint for "this git op might lose work" UX, not as a per-feature check.

### Credentials & secrets

The Rust backend uses the `keyring` crate (with `apple-native`, `sync-secret-service`, `windows-native` features) for OS-level secret storage. HTTP token testing, temporary credential injection, and SSH key detection live in `commands/remote.rs`; HTTPS tokens can be stashed via `commands/credentials.rs` and reused by later `git` invocations. AI provider API keys are stored in the OS keychain (not `localStorage`) when a named profile is saved — see `lib/ai-secure.ts`.

### Dialog system

Dialogs are rendered as overlays in `MainLayout.tsx` via a string-keyed `dialogComponents` map. To add a new dialog: (1) create the component in `components/features/dialogs/`, (2) import it with `React.lazy()` (all dialogs are lazy-loaded to keep the initial bundle small), (3) add it to the `dialogComponents` map in `MainLayout.tsx`, (4) trigger it from anywhere with `useUIStore.openDialog("key")`. The `activeDialog` field in `useUIStore` is the single source of truth. Exception: `"stash"` and `"tag"` are treated as inline sidebar panels, not overlays — they're excluded from the overlay render path.

### Theme system

Themes are CSS classes applied to both `document.documentElement` and `document.body` by `applyTheme` in `stores/repo.ts`. Available themes: `dark`, `light`, `gruvbox-dark`, `gruvbox-dark-soft`, `gruvbox-dark-hard`, `gruvbox-light`, `gruvbox-light-soft`. All dark variants also get the `dark` class (for Tailwind's `dark:` utilities). Theme is persisted to `localStorage` under key `"theme"` and initialized before React mounts — avoid setting theme classes elsewhere.

### Tauri plugins

The Rust backend initializes these plugins (see `lib.rs`):
- `tauri-plugin-dialog` — native file/folder dialogs
- `tauri-plugin-log` — file logging with rotation (5MB max, kept all)
- `tauri-plugin-process` — process exit control
- `tauri-plugin-updater` — auto-update on new releases
- `tauri-plugin-window-state` — remembers window geometry across sessions (the `tray` window is excluded via `with_filter` so the floating mini-window doesn't restore its last position)

Tauri permissions are declared in `src-tauri/capabilities/default.json` — when adding a new `invoke()` call, both the JS wrapper and any new permission scope (e.g. for a new plugin) need to land in the same change.

### In-flight operations and locking

Long-running git operations (rebase, merge, bisect, interactive rebase, clone) are tracked in `commands::running_ops::RunningOps` (a `Mutex<HashMap>` managed in `lib.rs`) so they can be cancelled via `cancel_git_op`. A separate `commands::op_lock::RepoLocks` enforces per-repo serialization — do not assume a `git` command will see a clean worktree just because it returned a successful Tauri invoke. The frontend mirrors this in `stores/operations.ts`, populated automatically by `useOperationObserver` watching TanStack mutations.

### Tray window

The app has a tray icon (top-right on macOS). Left-click shows a floating mini-window positioned below the icon. The window auto-hides when it loses focus (blur event). Main window hides to tray on close.

### Progressive disclosure for AI advanced actions

AI actions like Guardrail, Readiness, AI Review, and Lint Review should use progressive disclosure patterns. Primary actions that are used most frequently should be directly accessible, while secondary actions can be placed in dropdown menus.

Recommended patterns:
- **"AI Checks" menu**: Group advanced AI validation actions together in a dedicated menu
- **Segmented mini-toolbar**: Use a compact toolbar with dropdowns for less common actions
- **Contextual visibility**: Show/hide AI actions based on current context (e.g., only show Guardrail when working with sensitive files)

Keep the most commonly used AI action (determined by usage analytics) as the default visible button, with other actions accessible via dropdown or expansion.
