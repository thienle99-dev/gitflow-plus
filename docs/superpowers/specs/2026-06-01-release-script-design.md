# Release Script Design

**Date:** 2026-06-01  
**Project:** GitFlow Desktop (Tauri 2 + React 18)  
**Scope:** Local release script + GitHub Actions CI/CD for cross-platform builds

---

## Overview

Two-part release system:

1. **`scripts/release.py`** — local interactive script that bumps version, commits, tags, and pushes
2. **`.github/workflows/release.yml`** — GitHub Actions workflow that builds and publishes a GitHub Release for macOS, Windows, and Linux

---

## Part 1: Local Release Script (`scripts/release.py`)

### Purpose

Automate the version bump + git tag + push sequence so all three version files stay in sync and the CI workflow is triggered consistently.

### Flow

1. Check working tree is clean (no uncommitted changes) — abort if dirty
2. Check current branch is `main` — warn and ask confirmation if not
3. Read current version from `src-tauri/Cargo.toml`
4. Prompt user for new version (validate semver: `MAJOR.MINOR.PATCH`, must be greater than current)
5. Check tag `v{version}` does not already exist — abort if it does
6. Update version in three files:
   - `src-tauri/Cargo.toml` — `version = "..."` under `[package]`
   - `src-tauri/tauri.conf.json` — `"version"` field
   - `apps/desktop/package.json` — `"version"` field
7. `git add` the three files
8. `git commit -m "chore(release): v{version}"`
9. `git tag v{version}` (annotated)
10. `git push origin main --tags`

### Dependencies

Standard library only: `re`, `json`, `subprocess`, `sys`. No pip installs required.

### Error Handling

| Condition | Behavior |
|-----------|----------|
| Uncommitted changes | Abort with message listing dirty files |
| Not on `main` | Warn, prompt `y/N` to continue |
| Tag already exists | Abort |
| New version ≤ current | Abort |
| `git push` fails | Print stderr, exit non-zero; no automatic rollback |

---

## Part 2: GitHub Actions Workflow (`.github/workflows/release.yml`)

### Trigger

```yaml
on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'
```

### Jobs

Single job `build` with matrix strategy across three runners:

| Runner | Artifacts |
|--------|-----------|
| `macos-latest` | `.dmg`, `.app.tar.gz` |
| `windows-latest` | `.msi`, `.exe` |
| `ubuntu-22.04` | `.deb`, `.AppImage` |

### Steps per job

1. `actions/checkout@v4`
2. `pnpm/action-setup@v4` (version from `packageManager` field)
3. `actions/setup-node@v4` (Node 20)
4. `pnpm install` (frontend deps)
5. `dtolnay/rust-toolchain@stable`
6. **Ubuntu only:** install system deps:
   ```
   libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
   ```
7. `tauri-apps/tauri-action@v0`:
   - `tagName: ${{ github.ref_name }}`
   - `releaseName: "GitFlow Desktop ${{ github.ref_name }}"`
   - `releaseDraft: false`
   - `prerelease: false`

### Secrets

- `GITHUB_TOKEN` — provided automatically by GitHub, no configuration needed
- Code signing keys — out of scope for this release; can be added later

### Behavior on failure

- Each platform job is independent; a failure on one does not cancel others
- `continue-on-error: false` (default) — GitHub Release is not published if any job fails
- Re-pushing an existing tag causes `tauri-action` to update the existing release rather than create a duplicate

---

## Out of Scope

- macOS notarization / Windows Authenticode code signing
- Automatic CHANGELOG generation
- Pre-release / beta channel support
- Caching Rust build artifacts (can be added later with `Swatinem/rust-cache`)
