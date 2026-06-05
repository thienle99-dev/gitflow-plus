# GitFlow Desktop Gap Closure Plan

## Goal
Close the highest-value gaps in the desktop app so the product is safer, more consistent, and aligned with its GitFlow positioning.

## Tasks
- [ ] Wire one shared preflight gate across risky flows using [`usePreflight()`](apps/desktop/src/queries/usePreflight.ts:11) and [`preflight_check()`](src-tauri/src/commands/preflight.rs:40) → Verify: merge, rebase, cherry-pick, checkout, and push all surface blocking/advisory warnings before execution.
- [ ] Harden credential handling for AI and integrations by moving secrets out of UI storage, reviewing [`ai_http_request()`](src-tauri/src/commands/ai.rs:87), and redacting sensitive values from logs/diagnostics → Verify: no API key remains in localStorage, app logs, or diagnostic bundle output.
- [ ] Implement core GitFlow workflow commands and UI for init, feature, release, and hotfix flows → Verify: a real repo can run init/start/finish flows successfully from the app and refresh state correctly.
- [ ] Add missing operation UX for long-running tasks, including visible progress and cancel support where Git commands allow it → Verify: at least fetch/pull/push/rebase show running state and user can cancel supported operations.
- [ ] Finish secondary safety/workflow gaps: hook visibility, optional `--no-verify`, auth setup guidance, and settings connection tests → Verify: these options are discoverable in UI and exercise real command paths successfully.
- [ ] Convert release checks into an executable verification pass for app launch, repo open, graph rendering, status refresh, commit/push cycle, and watcher updates → Verify: one documented smoke test pass can be run before release without relying on memory.
- [ ] Reconcile planning docs with the actual codebase so completed items and remaining gaps are accurate → Verify: features already present such as hunk/line patch actions are marked correctly in the plan.

## Done When
- [ ] High-risk Git operations are consistently guarded by one shared safety flow.
- [ ] Credentials are stored/redacted safely enough for shipping.
- [ ] GitFlow workflow is usable as a real product feature, not just a roadmap item.
- [ ] Release readiness is backed by a repeatable verification checklist.

## Notes
- The biggest product gap is not basic Git capability; it is missing GitFlow identity and safety consistency.
- The biggest security gap is secret handling around AI/integration credentials.
- The existing plan in [`docs/superpowers/specs/2026-05-29-gitflow-desktop-plan.md`](docs/superpowers/specs/2026-05-29-gitflow-desktop-plan.md) is partially outdated versus implemented code and should not be treated as the sole source of truth.
