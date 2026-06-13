/**
 * AI Provider Profiles — manage multiple AI API keys/profiles.
 *
 * Storage:
 *   - Profile metadata: localStorage (gitflowAiProfiles)
 *   - API keys: OS keychain via Tauri credential commands
 *   - Active profile id: localStorage (gitflowActiveAiProfileId)
 *
 * Legacy keys that get migrated (not deleted):
 *   gitflowAiApiKey, gitflowAiApiUrl, gitflowAiModel,
 *   gitflowAiReviewModel, gitflowAiTokenLimit, gitflowAiFetchedModels
 */

import { secureSetKey, secureGetKey, secureDeleteKey, migrateApiKeysToKeychain } from "./ai-secure";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AIProviderType = "openai-compatible" | "anthropic" | "ollama" | "llamacpp" | "9router";

export const AI_PROVIDER_OPTIONS: { id: AIProviderType; label: string; description: string }[] = [
  { id: "openai-compatible", label: "OpenAI Compatible", description: "OpenAI, Azure, proxies, gateways" },
  { id: "anthropic", label: "Anthropic (Claude)", description: "Anthropic API for Claude models" },
  { id: "ollama", label: "Ollama (local)", description: "Local Ollama server (localhost:11434)" },
  { id: "llamacpp", label: "llama.cpp (local)", description: "Local llama.cpp server (localhost:8080)" },
  { id: "9router", label: "9Router", description: "AI gateway with auto-fallback across providers" },
];

export function defaultApiUrlForProvider(provider: AIProviderType): string {
  switch (provider) {
    case "ollama": return "http://localhost:11434";
    case "llamacpp": return "http://localhost:8080";
    case "anthropic": return "https://api.anthropic.com/v1";
    case "9router": return "";
    case "openai-compatible": return "";
  }
}

export function providerNeedsApiKey(provider: AIProviderType): boolean {
  return provider === "openai-compatible" || provider === "anthropic" || provider === "9router";
}

export interface AIProviderProfile {
  id: string;
  name: string;
  provider: AIProviderType;
  apiKey: string;
  apiUrl: string;
  commitModel: string;
  reviewModel: string;
  tokenLimit: number;
  fetchedModels: { id: string; label: string }[];
  createdAt: number;
  updatedAt: number;
}

// ─── Storage keys ───────────────────────────────────────────────────────────

const LS_PROFILES = "gitflowAiProfiles";
const LS_ACTIVE_ID = "gitflowActiveAiProfileId";

const LEGACY_KEYS = {
  apiKey: "gitflowAiApiKey",
  apiUrl: "gitflowAiApiUrl",
  model: "gitflowAiModel",
  reviewModel: "gitflowAiReviewModel",
  tokenLimit: "gitflowAiTokenLimit",
  fetchedModels: "gitflowAiFetchedModels",
} as const;

export const DEFAULT_COMMIT_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_TOKEN_LIMIT = 4096;

// ─── Helpers ────────────────────────────────────────────────────────────────

function now(): number {
  return Date.now();
}

function randomId(): string {
  return crypto.randomUUID();
}

export function createDefaultProfile(overrides?: Partial<AIProviderProfile>): AIProviderProfile {
  const ts = now();
  return {
    id: randomId(),
    name: "Default",
    provider: "openai-compatible",
    apiKey: "",
    apiUrl: "",
    commitModel: DEFAULT_COMMIT_MODEL,
    reviewModel: DEFAULT_COMMIT_MODEL,
    tokenLimit: DEFAULT_TOKEN_LIMIT,
    fetchedModels: [],
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

// ─── Read / Write raw storage ───────────────────────────────────────────────

function readProfilesRaw(): AIProviderProfile[] {
  try {
    const saved = localStorage.getItem(LS_PROFILES);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProfilesRaw(profiles: AIProviderProfile[]): void {
  localStorage.setItem(LS_PROFILES, JSON.stringify(profiles));
}

function readActiveProfileId(): string {
  return localStorage.getItem(LS_ACTIVE_ID) || "";
}

function writeActiveProfileId(id: string): void {
  localStorage.setItem(LS_ACTIVE_ID, id);
}

// ─── Migration from legacy keys ────────────────────────────────────────────

function hasLegacyKeys(): boolean {
  return !!(
    localStorage.getItem(LEGACY_KEYS.apiKey) ||
    localStorage.getItem(LEGACY_KEYS.apiUrl) ||
    localStorage.getItem(LEGACY_KEYS.model) ||
    localStorage.getItem(LEGACY_KEYS.reviewModel) ||
    localStorage.getItem(LEGACY_KEYS.tokenLimit)
  );
}

/**
 * Migrate legacy single-key localStorage into profiles.
 * Returns true if migration was performed.
 * Legacy values are NOT deleted — the plan explicitly requires keeping them.
 */
export function migrateLegacyToProfiles(): boolean {
  const existing = readProfilesRaw();
  if (existing.length > 0) return false; // already migrated
  if (!hasLegacyKeys()) return false;    // nothing to migrate

  const ts = now();
  const legacyProfile: AIProviderProfile = {
    id: randomId(),
    name: "Default",
    provider: "openai-compatible",
    apiKey: localStorage.getItem(LEGACY_KEYS.apiKey) || "",
    apiUrl: localStorage.getItem(LEGACY_KEYS.apiUrl) || "",
    commitModel: localStorage.getItem(LEGACY_KEYS.model) || DEFAULT_COMMIT_MODEL,
    reviewModel:
      localStorage.getItem(LEGACY_KEYS.reviewModel) ||
      localStorage.getItem(LEGACY_KEYS.model) ||
      DEFAULT_COMMIT_MODEL,
    tokenLimit: Number(localStorage.getItem(LEGACY_KEYS.tokenLimit) || String(DEFAULT_TOKEN_LIMIT)),
    fetchedModels: (() => {
      try {
        const raw = localStorage.getItem(LEGACY_KEYS.fetchedModels);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })(),
    createdAt: ts,
    updatedAt: ts,
  };

  writeProfilesRaw([legacyProfile]);
  writeActiveProfileId(legacyProfile.id);
  return true;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Load all profiles (sync, without API keys).
 * For full profiles with keys, use loadProfilesSecure().
 */
export function loadProfiles(): AIProviderProfile[] {
  let profiles = readProfilesRaw() as AIProviderProfile[];

  // Run migration if no profiles exist but legacy keys do
  if (profiles.length === 0) {
    migrateLegacyToProfiles();
    profiles = readProfilesRaw() as AIProviderProfile[];
  }

  // Ensure at least one profile exists
  if (profiles.length === 0) {
    const def = createDefaultProfile();
    writeProfilesRaw([def]);
    writeActiveProfileId(def.id);
    return [def];
  }

  return profiles;
}

/**
 * Load all profiles with API keys restored from keychain.
 * Also runs keychain migration on first call.
 */
export async function loadProfilesSecure(): Promise<AIProviderProfile[]> {
  let profiles = readProfilesRaw();

  // Run migration if no profiles exist but legacy keys do
  if (profiles.length === 0) {
    migrateLegacyToProfiles();
    profiles = readProfilesRaw();
  }

  // Ensure at least one profile exists
  if (profiles.length === 0) {
    const def = createDefaultProfile();
    writeProfilesRaw([def]);
    writeActiveProfileId(def.id);
    return [def];
  }

  // Run keychain migration if needed
  await migrateApiKeysToKeychain(profiles);

  // Restore API keys from keychain (override any localStorage values)
  const restored: AIProviderProfile[] = [];
  for (const profile of profiles) {
    const key = await secureGetKey(profile.id);
    restored.push({ ...profile, apiKey: key || profile.apiKey || "" });
  }
  return restored;
}

/**
 * Load the active profile (sync, without API key).
 */
export function loadActiveProfile(): AIProviderProfile {
  const profiles = loadProfiles();
  const activeId = readActiveProfileId();
  return profiles.find((p) => p.id === activeId) || profiles[0];
}

/**
 * Load the active profile with API key from keychain.
 */
export async function loadActiveProfileSecure(): Promise<AIProviderProfile> {
  const profiles = await loadProfilesSecure();
  const activeId = readActiveProfileId();
  return profiles.find((p) => p.id === activeId) || profiles[0];
}

/**
 * Get the active profile id.
 */
export function getActiveProfileId(): string {
  const profiles = loadProfiles();
  const activeId = readActiveProfileId();
  if (profiles.some((p) => p.id === activeId)) return activeId;
  return profiles[0].id;
}

/**
 * Set the active profile id. Caller is responsible for saving/dispatching events.
 */
export function setActiveProfileId(id: string): void {
  writeActiveProfileId(id);
}

/**
 * Save all profiles and the active profile id (sync).
 * API keys in profiles are saved to keychain, metadata to localStorage.
 */
export function saveProfiles(profiles: AIProviderProfile[], activeId: string): void {
  // Save API keys to keychain (fire and forget for sync version)
  for (const profile of profiles) {
    if (profile.apiKey !== undefined) {
      secureSetKey(profile.id, profile.apiKey).catch(console.warn);
    }
  }
  writeProfilesRaw(profiles);
  writeActiveProfileId(activeId);
}

/**
 * Save all profiles and the active profile id (async, secure).
 * API keys are saved to OS keychain AND localStorage (for backward compat).
 */
export async function saveProfilesSecure(profiles: AIProviderProfile[], activeId: string): Promise<void> {
  // Save API keys to keychain
  const keyPromises = profiles.map((profile) =>
    profile.apiKey
      ? secureSetKey(profile.id, profile.apiKey)
      : secureDeleteKey(profile.id)
  );
  await Promise.allSettled(keyPromises);

  // Save to localStorage (including API keys for backward compat)
  writeProfilesRaw(profiles);
  writeActiveProfileId(activeId);
}

/**
 * Add a new profile. Returns the updated array and the new profile's id.
 */
export function addProfile(
  profiles: AIProviderProfile[],
  name: string,
): { profiles: AIProviderProfile[]; id: string } {
  const newProfile = createDefaultProfile({ name });
  const updated = [...profiles, newProfile];
  return { profiles: updated, id: newProfile.id };
}

/**
 * Duplicate an existing profile. Returns the updated array and the new profile's id.
 */
export function duplicateProfile(
  profiles: AIProviderProfile[],
  sourceId: string,
): { profiles: AIProviderProfile[]; id: string } {
  const source = profiles.find((p) => p.id === sourceId);
  if (!source) return { profiles, id: "" };
  const ts = now();
  const dup: AIProviderProfile = {
    ...source,
    id: randomId(),
    name: `${source.name} (copy)`,
    createdAt: ts,
    updatedAt: ts,
  };
  return { profiles: [...profiles, dup], id: dup.id };
}

/**
 * Delete a profile. Returns the updated array and the next active profile id.
 */
export function deleteProfile(
  profiles: AIProviderProfile[],
  deleteId: string,
  currentActiveId: string,
): { profiles: AIProviderProfile[]; activeId: string } {
  const remaining = profiles.filter((p) => p.id !== deleteId);
  if (remaining.length === 0) {
    const def = createDefaultProfile();
    return { profiles: [def], activeId: def.id };
  }
  let nextActive = currentActiveId;
  if (currentActiveId === deleteId) {
    nextActive = remaining[0].id;
  }
  return { profiles: remaining, activeId: nextActive };
}

/**
 * Delete a profile and remove its API key from keychain.
 */
export async function deleteProfileSecure(
  profiles: AIProviderProfile[],
  deleteId: string,
  currentActiveId: string,
): Promise<{ profiles: AIProviderProfile[]; activeId: string }> {
  // Delete API key from keychain
  await secureDeleteKey(deleteId).catch(console.warn);

  return deleteProfile(profiles, deleteId, currentActiveId);
}

/**
 * Update a single profile in the array. Returns the updated array.
 */
export function updateProfile(
  profiles: AIProviderProfile[],
  updatedProfile: AIProviderProfile,
): AIProviderProfile[] {
  return profiles.map((p) =>
    p.id === updatedProfile.id
      ? { ...updatedProfile, updatedAt: now() }
      : p,
  );
}

/**
 * Update a single profile and save API key to keychain.
 */
export async function updateProfileSecure(
  profiles: AIProviderProfile[],
  updatedProfile: AIProviderProfile,
): Promise<AIProviderProfile[]> {
  const updated = profiles.map((p) =>
    p.id === updatedProfile.id
      ? { ...updatedProfile, updatedAt: now() }
      : p,
  );

  // Save API key to keychain
  if (updatedProfile.apiKey !== undefined) {
    await secureSetKey(updatedProfile.id, updatedProfile.apiKey).catch(console.warn);
  }

  return updated;
}

/**
 * Rename a profile. Returns the updated array.
 */
export function renameProfile(
  profiles: AIProviderProfile[],
  id: string,
  newName: string,
): AIProviderProfile[] {
  return profiles.map((p) =>
    p.id === id ? { ...p, name: newName, updatedAt: now() } : p,
  );
}
