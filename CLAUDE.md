# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GitFlow Desktop — a desktop Git client built with Tauri 2 (Rust backend) and React 18 (frontend). pnpm-workspace monorepo: `apps/desktop` is the React/Vite frontend, `src-tauri` is the Rust/Tauri shell.

## Commands

Frontend (run from `apps/desktop/`):

- `pnpm dev` — Vite dev server on port 1420 (strictPort; the Tauri shell expects exactly this port)
- `pnpm build` — `tsc && vite build` (type-check then bundle to `dist/`)
- `pnpm test` — `vitest run` (one-shot)
- `pnpm test:watch` — Vitest watch mode
- Single test: `pnpm vitest run path/to/file.test.ts` or `pnpm vitest -t "test name"`

Full desktop app (the only way to exercise Tauri commands, since `invoke` is a no-op in a plain browser): driven by the cargo tauri CLI from `src-tauri/` (`cargo tauri dev` / `cargo tauri build`). `tauri.conf.json` runs `npm run dev` / `npm run build` as its before-hooks and serves the frontend from `../apps/desktop/dist`. Rust-only build/check: `cargo build` in `src-tauri/`.

The `@` import alias maps to `apps/desktop/src` (configured in both `vite.config.ts` and `tsconfig.json`).

## Architecture

### Git operations are git-CLI subprocesses, not a library

Every backend command in `src-tauri/src/commands/*.rs` shells out to the system `git` binary via `Command::new("git").args(["--no-pager", "-C", path, ...])`, then parses stdout. Failures are detected with `output.status.success()` and surfaced as `Err(stderr)`. There is no libgit2 / git2 crate. Consequence: the user's installed `git` and its behavior is the source of truth, and parsing is line/delimiter-based.

`git_log` (`commands/log.rs`) is the most format-sensitive: it uses `--all --pretty=format:%H|%P|%an|%ae|%ai|%D|%s` and `splitn(7, '|')`. `%D` carries ref decorations, parsed into typed `Ref { name, ref_type }` (head/tag/remote/branch). If you change the pretty-format string, update the split count and the matching `Commit`/`Ref` TypeScript interfaces in `api/tauri.ts` together.

### Two-layer state: TanStack Query (server) + Zustand (client)

- **TanStack Query** owns all git/server state. Query keys follow the convention `["git", repoPath, <resource>, ...]` (see `queries/useGitLog.ts`). This key shape is a contract — invalidation elsewhere relies on it.
- **Zustand** owns client/UI state only: `stores/repo.ts` (current repoPath, recentRepos, theme — persisted to `localStorage`) and `stores/ui.ts` (sidebar, selected commit/file, diff view mode).

Don't put git data in Zustand or UI selection in Query.

### Realtime refresh loop (spans Rust → React)

This is the core reactivity mechanism and is split across two files:

1. `src-tauri/src/watcher/fs_watcher.rs` — a `notify` recursive watcher on the repo root. `classify_event` filters noise (`.git/objects`, `.git/logs`, `node_modules`, `target`, `index.lock`) and tags the rest as `worktree` / `refs` / `head`. Emits a single debounced (300ms) `repo:changed` Tauri event carrying `event_type`.
2. `apps/desktop/src/layouts/MainLayout.tsx` — starts/stops the watcher on repoPath change and listens for `repo:changed`, invalidating specific query keys per `event_type` (`worktree`→status, `refs`→branches+log, `head`→everything under the repo).

If git data isn't refreshing live, the bug is almost always in one of these two halves (event misclassification, or wrong query key in the invalidation switch).

### Adding a backend command (three coordinated edits)

1. Write the `#[tauri::command]` fn in the appropriate `src-tauri/src/commands/<area>.rs`.
2. Register it in the `invoke_handler!` list in `src-tauri/src/lib.rs`.
3. Add a typed wrapper in `apps/desktop/src/api/tauri.ts` (the single place the frontend calls `invoke`; nothing else should call `invoke` directly).

Note Tauri's arg casing: Rust snake_case params (e.g. `base_ref`) are passed as camelCase keys from JS (`baseRef`) — see existing wrappers for the pattern.

### Commit graph layout

`apps/desktop/src/lib/graph-layout.ts` (`computeGraphLayout`) turns the flat newest-first commit list into lanes/colors/coordinates for `components/graph/CommitGraph.tsx`. It keeps a commit on its first parent's lane, allocating a new lane otherwise. It's a presentation-only transform — pure function over `Commit[]`.

### AI integration

All AI HTTP requests go through Tauri's `ai_http_request` command (`commands/ai.rs`) rather than direct browser `fetch` — this is required to bypass CORS in the WebView. The frontend AI logic lives entirely in `lib/ai.ts`. AI settings are stored in `localStorage` under these keys: `gitflowAiApiKey`, `gitflowAiModel`, `gitflowAiApiUrl`, `gitflowAiTokenLimit`, `gitflowAiDetailLevel`, `gitflowAiCustomRules`. Supported providers: Claude (Anthropic), OpenAI-compatible APIs, Ollama (`http://localhost:11434`), llama.cpp (`http://localhost:8080`).

### Dialog system

Dialogs are rendered as overlays in `MainLayout.tsx` via a string-keyed `dialogComponents` map. To add a new dialog: (1) create the component in `components/phase2/`, (2) add it to `dialogComponents` in `MainLayout.tsx`, (3) trigger it from anywhere with `useUIStore.openDialog("key")`. The `activeDialog` field in `useUIStore` is the single source of truth. Exception: `"stash"` and `"tag"` are treated as inline sidebar panels, not overlays — they're excluded from the overlay render path.

### Theme system

Themes are CSS classes applied to both `document.documentElement` and `document.body` by `applyTheme` in `stores/repo.ts`. Available themes: `dark`, `light`, `gruvbox-dark`, `gruvbox-dark-soft`, `gruvbox-dark-hard`, `gruvbox-light`, `gruvbox-light-soft`. All dark variants also get the `dark` class (for Tailwind's `dark:` utilities). Theme is persisted to `localStorage` under key `"theme"` and initialized before React mounts — avoid setting theme classes elsewhere.
