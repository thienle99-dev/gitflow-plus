# Updater Signing Setup

GitFlow Desktop uses Tauri's built-in updater to deliver signed in-app updates from GitHub Releases.

## Prerequisites

You need a Tauri signing keypair. Generate one with the Tauri CLI:

```bash
npx tauri signer generate -w ~/.tauri/gitflow-desktop.key
```

This command will:
1. Create a private key file at `~/.tauri/gitflow-desktop.key`
2. Prompt you for a password (used to encrypt the private key)
3. Print the **public key** — copy this value

## Configuration

### 1. Set the public key in `src-tauri/tauri.conf.json`

Under `plugins.updater.pubkey`, paste the public key from the step above:

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/thienle99-dev/gitflow-plus/releases/latest/download/latest.json"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHJ..."
    }
  }
}
```

> **Important:** Only the public key is committed to the repository. The private key must never be committed.

### 2. Add GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in the GitHub repository and add:

| Secret Name | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/gitflow-desktop.key` (the entire file) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you chose when generating the key |

### 3. How It Works

- `tauri-apps/tauri-action` reads `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` environment variables during the build
- It signs the updater artifacts and generates a `latest.json` manifest
- The manifest is uploaded to the GitHub Release alongside the app bundles
- The app checks the `latest.json` endpoint, verifies the signature using the embedded public key, and only installs if the signature is valid

## Release Artifacts

After a successful release build, the GitHub Release will contain:

- `GitFlow Desktop.app.tar.gz` — updater archive (downloaded by the app)
- `GitFlow Desktop.app.tar.gz.sig` — signature file for verification
- `latest.json` — update manifest with version, download URLs, and signatures

## Rotating Keys

To rotate the signing key:

1. Generate a new keypair: `npx tauri signer generate -w ~/.tauri/gitflow-desktop-new.key`
2. Update `plugins.updater.pubkey` in `src-tauri/tauri.conf.json` with the new public key
3. Update `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in GitHub Secrets
4. Commit the `tauri.conf.json` change and create a new release

> Users on the old key will need to manually download the new version, since the old key can't verify releases signed with the new key.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Update check failed" | Endpoint URL unreachable or CORS | Verify `latest.json` URL is accessible and returns valid JSON |
| "Signature verification failed" | Public key mismatch | Ensure `pubkey` in `tauri.conf.json` matches the private key used in CI |
| No `latest.json` in release | Missing signing env vars | Check that `TAURI_SIGNING_PRIVATE_KEY` is set in GitHub Secrets |
| Updater works in release but not dev | Expected behavior | The updater only functions from packaged builds, not `tauri dev` |
