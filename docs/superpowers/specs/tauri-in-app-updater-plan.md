# Tauri In-App Updater

## Goal
Add signed in-app update support so GitFlow Desktop can check GitHub Releases, download an update, install it, and restart safely.

## Tasks
- [ ] Add updater dependencies: install `@tauri-apps/plugin-updater` and add `tauri-plugin-updater = "2"` in `src-tauri/Cargo.toml` → Verify: lockfiles update and `cargo check` resolves the plugin.
- [ ] Generate updater signing key with Tauri CLI and store only the public key in config → Verify: public key exists in `src-tauri/tauri.conf.json`; private key/password are not committed.
- [ ] Configure `src-tauri/tauri.conf.json` with `bundle.createUpdaterArtifacts: true` and `plugins.updater.endpoints` pointing to the release `latest.json` URL → Verify: `tauri build` emits updater artifacts and `latest.json`.
- [ ] Register `tauri_plugin_updater::Builder::new().pubkey(...).build()` in `src-tauri/src/lib.rs` → Verify: app launches and updater plugin is available.
- [ ] Add frontend updater wrapper/hook, e.g. `useAppUpdater`, using `check()`, `downloadAndInstall()`, progress state, errors, and restart handling → Verify: hook compiles and handles no-update/update/error states.
- [ ] Add UI entry in Settings/About or Toolbar menu: “Check for Updates” with progress and install/restart action → Verify: user can manually check without blocking normal app usage.
- [ ] Update `.github/workflows/release.yml` to pass `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, then upload updater artifacts to GitHub Release → Verify: release assets include app bundle, updater archive, signature, and `latest.json`.
- [ ] Add release documentation for setting GitHub secrets and rotating updater keys → Verify: docs explain exactly which secrets are required and where the public key lives.

## Done When
- [ ] A packaged old version detects a newer GitHub Release, downloads it, installs it, and restarts into the new version.
- [ ] Unsigned or tampered artifacts are rejected.
- [ ] No private updater key material is committed.
- [ ] `pnpm --dir apps/desktop build` and `cargo check` pass.

## Notes
- The updater only works from packaged apps, not normal Vite dev mode.
- Current workflow builds macOS only; Windows/Linux updater verification should wait until those matrix jobs are enabled.
- GitHub Release must publish the updater metadata endpoint consistently, otherwise the app should show a clear “No update found” or “Update check failed” state.
