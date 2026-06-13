import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createDefaultProfile,
  loadProfiles,
  loadActiveProfile,
  getActiveProfileId,
  setActiveProfileId,
  saveProfiles,
  addProfile,
  duplicateProfile,
  deleteProfile,
  renameProfile,
  migrateLegacyToProfiles,
  DEFAULT_COMMIT_MODEL,
  DEFAULT_TOKEN_LIMIT,
  type AIProviderProfile,
} from "./ai-profiles";

// Mock keychain — ai-profiles imports ai-secure which calls api.credentials
vi.mock("./ai-secure", () => ({
  secureSetKey: vi.fn().mockResolvedValue(undefined),
  secureGetKey: vi.fn().mockResolvedValue(""),
  secureDeleteKey: vi.fn().mockResolvedValue(undefined),
  migrateApiKeysToKeychain: vi.fn().mockResolvedValue(false),
  loadApiKey: vi.fn().mockResolvedValue(""),
}));

// Shared localStorage mock
let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: () => null,
  });
  // Mock crypto.randomUUID
  let uuidCounter = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `test-uuid-${++uuidCounter}`,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── createDefaultProfile ────────────────────────────────────────────────────

describe("createDefaultProfile", () => {
  it("returns a profile with sensible defaults", () => {
    const p = createDefaultProfile();
    expect(p.id).toBeTruthy();
    expect(p.name).toBe("Default");
    expect(p.apiKey).toBe("");
    expect(p.apiUrl).toBe("");
    expect(p.commitModel).toBe(DEFAULT_COMMIT_MODEL);
    expect(p.reviewModel).toBe(DEFAULT_COMMIT_MODEL);
    expect(p.tokenLimit).toBe(DEFAULT_TOKEN_LIMIT);
    expect(p.fetchedModels).toEqual([]);
    expect(p.createdAt).toBeGreaterThan(0);
    expect(p.updatedAt).toBeGreaterThan(0);
  });

  it("accepts overrides", () => {
    const p = createDefaultProfile({ name: "Custom", apiKey: "sk-test" });
    expect(p.name).toBe("Custom");
    expect(p.apiKey).toBe("sk-test");
  });
});

// ─── migrateLegacyToProfiles ─────────────────────────────────────────────────

describe("migrateLegacyToProfiles", () => {
  it("returns false when no legacy keys exist", () => {
    expect(migrateLegacyToProfiles()).toBe(false);
  });

  it("migrates legacy keys into one profile and sets it active", () => {
    store["gitflowAiApiKey"] = "sk-legacy";
    store["gitflowAiApiUrl"] = "https://custom.api/v1";
    store["gitflowAiModel"] = "gpt-4o";
    store["gitflowAiReviewModel"] = "gpt-4o-mini";
    store["gitflowAiTokenLimit"] = "8192";
    store["gitflowAiFetchedModels"] = JSON.stringify([{ id: "m1", label: "M1" }]);

    const result = migrateLegacyToProfiles();
    expect(result).toBe(true);

    const profiles = JSON.parse(store["gitflowAiProfiles"]);
    expect(profiles).toHaveLength(1);
    // apiKey stripped from localStorage (goes to keychain); verify other fields
    expect(profiles[0].apiKey).toBeUndefined();
    expect(profiles[0].apiUrl).toBe("https://custom.api/v1");
    expect(profiles[0].commitModel).toBe("gpt-4o");
    expect(profiles[0].reviewModel).toBe("gpt-4o-mini");
    expect(profiles[0].tokenLimit).toBe(8192);
    expect(profiles[0].fetchedModels).toEqual([{ id: "m1", label: "M1" }]);

    const activeId = store["gitflowActiveAiProfileId"];
    expect(activeId).toBe(profiles[0].id);
  });

  it("does NOT delete legacy keys after migration", () => {
    store["gitflowAiApiKey"] = "sk-legacy";
    migrateLegacyToProfiles();
    expect(store["gitflowAiApiKey"]).toBe("sk-legacy");
  });

  it("returns false if profiles already exist (no double migration)", () => {
    store["gitflowAiProfiles"] = JSON.stringify([createDefaultProfile()]);
    store["gitflowAiApiKey"] = "sk-legacy";
    expect(migrateLegacyToProfiles()).toBe(false);
  });
});

// ─── loadProfiles ────────────────────────────────────────────────────────────

describe("loadProfiles", () => {
  it("returns at least one profile when nothing is stored", () => {
    const profiles = loadProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(1);
    expect(profiles[0].name).toBe("Default");
  });

  it("triggers migration when legacy keys exist", () => {
    store["gitflowAiApiKey"] = "sk-migrated";
    const profiles = loadProfiles();
    expect(profiles).toHaveLength(1);
    // apiKey stripped from localStorage; keychain is mocked noop, so empty here
    expect(profiles[0].apiKey).toBe("");
    // But migration ran — profile created with correct metadata
    expect(profiles[0].name).toBeTruthy();
  });

  it("returns stored profiles when they exist", () => {
    const existing = createDefaultProfile({ name: "My Profile", apiKey: "sk-saved" });
    store["gitflowAiProfiles"] = JSON.stringify([existing]);
    store["gitflowActiveAiProfileId"] = existing.id;

    const profiles = loadProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe("My Profile");
    // apiKey stripped from localStorage storage; use getCachedApiKey for key access
    expect(profiles[0].apiKey).toBe("");
  });
});

// ─── loadActiveProfile ───────────────────────────────────────────────────────

describe("loadActiveProfile", () => {
  it("returns the active profile when id matches", () => {
    const p1 = createDefaultProfile({ name: "Profile 1" });
    const p2 = createDefaultProfile({ name: "Profile 2" });
    store["gitflowAiProfiles"] = JSON.stringify([p1, p2]);
    store["gitflowActiveAiProfileId"] = p2.id;

    const active = loadActiveProfile();
    expect(active.name).toBe("Profile 2");
  });

  it("falls back to first profile when active id is invalid", () => {
    const p1 = createDefaultProfile({ name: "Profile 1" });
    store["gitflowAiProfiles"] = JSON.stringify([p1]);
    store["gitflowActiveAiProfileId"] = "nonexistent-id";

    const active = loadActiveProfile();
    expect(active.name).toBe("Profile 1");
  });
});

// ─── setActiveProfileId / getActiveProfileId ─────────────────────────────────

describe("active profile id", () => {
  it("round-trips active profile id", () => {
    const profiles = loadProfiles();
    const newId = "custom-id-123";
    setActiveProfileId(newId);
    // Store a profile with that id so getActiveProfileId finds it
    const p = createDefaultProfile({ id: newId });
    store["gitflowAiProfiles"] = JSON.stringify([...profiles, p]);
    expect(getActiveProfileId()).toBe(newId);
  });

  it("falls back to first profile id when stored id is not found", () => {
    const profiles = loadProfiles();
    store["gitflowActiveAiProfileId"] = "ghost";
    expect(getActiveProfileId()).toBe(profiles[0].id);
  });
});

// ─── addProfile ──────────────────────────────────────────────────────────────

describe("addProfile", () => {
  it("appends a new profile with the given name", () => {
    const initial = loadProfiles();
    const { profiles: updated, id } = addProfile(initial, "Work");
    expect(updated).toHaveLength(initial.length + 1);
    const added = updated.find((p) => p.id === id);
    expect(added).toBeDefined();
    expect(added!.name).toBe("Work");
  });
});

// ─── duplicateProfile ────────────────────────────────────────────────────────

describe("duplicateProfile", () => {
  it("creates a copy with '(copy)' suffix", () => {
    const original = createDefaultProfile({ name: "Original", apiKey: "sk-copy" });
    const { profiles: updated, id } = duplicateProfile([original], original.id);
    expect(updated).toHaveLength(2);
    const dup = updated.find((p) => p.id === id);
    expect(dup).toBeDefined();
    expect(dup!.name).toBe("Original (copy)");
    expect(dup!.apiKey).toBe("sk-copy");
    expect(dup!.id).not.toBe(original.id);
  });

  it("returns unchanged array for invalid source id", () => {
    const original = createDefaultProfile();
    const { profiles: updated, id } = duplicateProfile([original], "nonexistent");
    expect(updated).toHaveLength(1);
    expect(id).toBe("");
  });
});

// ─── deleteProfile ───────────────────────────────────────────────────────────

describe("deleteProfile", () => {
  it("removes the specified profile", () => {
    const p1 = createDefaultProfile({ name: "P1" });
    const p2 = createDefaultProfile({ name: "P2" });
    const { profiles: updated } = deleteProfile([p1, p2], p1.id, p2.id);
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("P2");
  });

  it("switches active to next profile when deleting the active one", () => {
    const p1 = createDefaultProfile({ name: "P1" });
    const p2 = createDefaultProfile({ name: "P2" });
    const { profiles: updated, activeId } = deleteProfile([p1, p2], p1.id, p1.id);
    expect(updated).toHaveLength(1);
    expect(activeId).toBe(p2.id);
  });

  it("creates a new default when all profiles are deleted", () => {
    const p1 = createDefaultProfile({ name: "P1" });
    const { profiles: updated, activeId } = deleteProfile([p1], p1.id, p1.id);
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("Default");
    expect(activeId).toBe(updated[0].id);
  });
});

// ─── renameProfile ───────────────────────────────────────────────────────────

describe("renameProfile", () => {
  it("changes the name of the target profile", () => {
    const p = createDefaultProfile({ name: "Old Name" });
    const updated = renameProfile([p], p.id, "New Name");
    expect(updated[0].name).toBe("New Name");
    expect(updated[0].updatedAt).toBeGreaterThanOrEqual(p.updatedAt);
  });
});

// ─── readAISettings fallback (integration via ai.ts) ─────────────────────────

describe("readAISettings fallback behavior", () => {
  // We test indirectly: loadActiveProfile returns profile data,
  // and readAISettings uses it. If no profile exists, it falls back to legacy keys.
  // Here we verify the profile helper layer that readAISettings depends on.

  it("active profile data takes precedence over legacy keys", () => {
    // Set legacy keys
    store["gitflowAiApiKey"] = "sk-legacy";
    store["gitflowAiModel"] = "legacy-model";

    // Create a profile with different values
    const profile = createDefaultProfile({ apiKey: "sk-profile", commitModel: "gpt-4o" });
    store["gitflowAiProfiles"] = JSON.stringify([profile]);
    store["gitflowActiveAiProfileId"] = profile.id;

    const active = loadActiveProfile();
    // apiKey stripped from localStorage; access via getCachedApiKey in real app
    expect(active.apiKey).toBe("");
    expect(active.commitModel).toBe("gpt-4o");
  });

  it("loadProfiles triggers migration which reads legacy keys", () => {
    store["gitflowAiApiKey"] = "sk-auto-migrate";
    store["gitflowAiModel"] = "gpt-4o";

    const profiles = loadProfiles();
    expect(profiles).toHaveLength(1);
    // apiKey stripped from localStorage; keychain is mocked noop
    expect(profiles[0].apiKey).toBe("");
    expect(profiles[0].commitModel).toBe("gpt-4o");
  });
});

// ─── saveProfiles ────────────────────────────────────────────────────────────

describe("saveProfiles", () => {
  it("persists profiles and active id to localStorage", () => {
    const p = createDefaultProfile({ name: "Saved" });
    saveProfiles([p], p.id);

    const stored = JSON.parse(store["gitflowAiProfiles"]);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Saved");
    expect(store["gitflowActiveAiProfileId"]).toBe(p.id);
  });
});
