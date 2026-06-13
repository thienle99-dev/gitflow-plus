/**
 * Secure API key storage — uses OS keychain via Tauri commands.
 *
 * Profile metadata (name, model, provider, etc.) stays in localStorage.
 * Only API keys are stored in the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).
 *
 * Migration: on first run, moves existing localStorage API keys to keychain.
 */

import { api } from "@/api/tauri";

const KEYCHAIN_PREFIX = "gitflow_api_key_";
const MIGRATION_KEY = "gitflowApiKeyMigrated";

// ─── Keychain operations ────────────────────────────────────────────────────

export async function secureSetKey(profileId: string, apiKey: string): Promise<void> {
  if (!apiKey) {
    await secureDeleteKey(profileId);
    return;
  }
  await api.credentials.set(`${KEYCHAIN_PREFIX}${profileId}`, apiKey);
}

export async function secureGetKey(profileId: string): Promise<string> {
  try {
    return await api.credentials.get(`${KEYCHAIN_PREFIX}${profileId}`);
  } catch {
    return "";
  }
}

export async function secureDeleteKey(profileId: string): Promise<void> {
  try {
    await api.credentials.delete(`${KEYCHAIN_PREFIX}${profileId}`);
  } catch {
    // Key might not exist, ignore
  }
}

// ─── Migration from localStorage ────────────────────────────────────────────

export async function migrateApiKeysToKeychain(profiles: { id: string; apiKey: string }[]): Promise<boolean> {
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_KEY) === "true") return false;

  let migrated = false;

  for (const profile of profiles) {
    if (profile.apiKey) {
      try {
        await secureSetKey(profile.id, profile.apiKey);
        migrated = true;
      } catch (e) {
        console.warn(`Failed to migrate API key for profile ${profile.id}:`, e);
      }
    }
  }

  // Also check legacy single key
  const legacyKey = localStorage.getItem("gitflowAiApiKey");
  if (legacyKey && profiles.length > 0) {
    try {
      await secureSetKey(profiles[0].id, legacyKey);
      migrated = true;
    } catch (e) {
      console.warn("Failed to migrate legacy API key:", e);
    }
  }

  if (migrated) {
    localStorage.setItem(MIGRATION_KEY, "true");
  }

  return migrated;
}

/**
 * Load API key for a profile. Tries keychain first, falls back to localStorage for migration.
 */
export async function loadApiKey(profileId: string, localStorageKey?: string): Promise<string> {
  // Try keychain first
  const keychainKey = await secureGetKey(profileId);
  if (keychainKey) return keychainKey;

  // Fallback to localStorage for migration
  if (localStorageKey) {
    const lsKey = localStorage.getItem(localStorageKey);
    if (lsKey) {
      // Migrate to keychain
      await secureSetKey(profileId, lsKey);
      return lsKey;
    }
  }

  return "";
}
