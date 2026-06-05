# GitFlow Desktop

A fast, native desktop Git client built with [Tauri 2](https://tauri.app) and React 18. It gives you a visual commit graph, side-by-side diffs, and the everyday Git operations — staging, committing, branching, and syncing with remotes — in a lightweight cross-platform app.

## Features

- **Commit graph** — branching/merging history rendered with colored lanes and ref badges (branches, tags, remotes, HEAD)
- **Diff viewer** — syntax-highlighted, split or unified diffs powered by CodeMirror 6, for working-tree changes and any past commit
- **Staging & commits** — stage/unstage individual files or everything, then commit (with amend support)
- **Branch management** — list, create, checkout, and delete branches
- **Remotes** — pull, push, and fetch
- **Realtime refresh** — a filesystem watcher keeps the UI in sync as the repository changes on disk, no manual reload
- **Recent repositories** — quickly reopen repos you've worked on

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell | Tauri 2 (Rust) |
| Frontend | React 18, Vite, TypeScript |
| Server state | TanStack Query |
| Client/UI state | Zustand |
| Editor / diffs | CodeMirror 6 |
| Layout | react-resizable-panels |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| File watching | `notify` (Rust) |

Git operations run by invoking your system `git` binary, so behavior matches the Git you already have installed.

## Prerequisites

- **Git** — must be installed and on your `PATH` (the backend shells out to it)
- **Node.js** and **pnpm**
- **Rust** toolchain — see [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS
- **Tauri CLI** — either `cargo install tauri-cli --version "^2"` (provides `cargo tauri`, compiles from source) or install via pnpm (see below)

## Getting started

Install dependencies (from the repo root):

```bash
pnpm install
```

Run the full desktop app in development:

```bash
cd src-tauri
cargo tauri dev
```

This launches the Vite dev server and the Tauri window together. The Rust `git` commands only work inside the Tauri shell — running just the frontend in a browser won't have access to them.

### Frontend-only

To work on the UI in isolation (Tauri command calls will be no-ops):

```bash
cd apps/desktop
pnpm dev          # Vite dev server on http://localhost:1420
```

## Building

Produce a distributable bundle:

```bash
cd src-tauri
cargo tauri build
```

Or build just the frontend assets:

```bash
cd apps/desktop
pnpm build        # type-check (tsc) + Vite build → dist/
```

### macOS Gatekeeper

If macOS says `"GitFlow Desktop" is damaged and can't be opened` for a manually downloaded or unsigned build, remove the quarantine flag:

```bash
xattr -dr com.apple.quarantine "/Applications/GitFlow Desktop.app"
```

This is only a workaround for local/manual builds. Public macOS releases should be Apple code-signed and notarized.

## Testing

```bash
cd apps/desktop
pnpm test          # run once (Vitest)
pnpm test:watch    # watch mode
```

## Releasing

GitFlow Desktop uses a two-part release system:

1. **Local release script** — bumps version, commits, tags, and pushes:
   ```bash
   python3 scripts/release.py
   ```
   This updates version in `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and `apps/desktop/package.json`, then creates a git tag and pushes to origin.
   To force users to install the new version before continuing:
   ```bash
   python3 scripts/release.py --force-update
   ```
   For non-interactive releases:
   ```bash
   python3 scripts/release.py --version 1.2.3 --no-force-update
   ```

2. **GitHub Actions workflow** — builds and publishes cross-platform binaries:
   - Triggered automatically when a version tag (`v*.*.*`) is pushed
   - Builds for macOS, Windows, and Ubuntu
   - Creates a GitHub Release with platform-specific artifacts (`.dmg`, `.msi`, `.exe`, `.deb`, `.AppImage`)

See [`docs/superpowers/specs/2026-06-01-release-script-design.md`](docs/superpowers/specs/2026-06-01-release-script-design.md) for full release system design.

## Project structure

```
.
├── apps/desktop/        React + Vite frontend
│   └── src/
│       ├── api/         Typed Tauri command wrappers (the single invoke boundary)
│       ├── queries/     TanStack Query hooks
│       ├── stores/      Zustand stores (repo, ui)
│       ├── components/  Graph, diff, sidebar, detail panels
│       └── lib/         Graph layout, diff parsing
└── src-tauri/           Rust / Tauri backend
    └── src/
        ├── commands/    Git operations (log, status, branch, commit, diff, remote, ...)
        └── watcher/     Filesystem watcher → emits `repo:changed` events
```

## License

No license has been specified for this project yet.
