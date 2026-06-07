import { useSyncExternalStore } from "react";
import {
  loadActiveProfile,
  providerNeedsApiKey,
  type AIProviderType,
} from "@/lib/ai-profiles";
import {
  subscribeToAIError,
  getAIErrorSnapshot,
} from "@/lib/ai-status-store";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AIStatusKind =
  | "ready"
  | "missing-key"
  | "local"
  | "api-failed"
  | "no-profile";

export interface AIStatus {
  kind: AIStatusKind;
  label: string;
  reason: string;
  provider: AIProviderType;
  profileName: string;
}

// ─── localStorage change listener ───────────────────────────────────────────

let storageListeners: Array<() => void> = [];

function handleStorageChange(e: StorageEvent) {
  if (
    e.key === "gitflowAiProfiles" ||
    e.key === "gitflowActiveAiProfileId" ||
    e.key === "gitflowAiApiKey"
  ) {
    for (const fn of storageListeners) fn();
  }
}

// Also listen for the custom event dispatched by settings dialogs
function handleSettingsUpdated() {
  for (const fn of storageListeners) fn();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("gitflow-settings-updated", handleSettingsUpdated as EventListener);
}

// ─── Snapshot functions (for useSyncExternalStore) ──────────────────────────

function subscribeToStorage(callback: () => void) {
  storageListeners.push(callback);
  return () => {
    storageListeners = storageListeners.filter((fn) => fn !== callback);
  };
}

function getStorageSnapshot(): string {
  // Return a string that changes when profiles change
  const profiles = localStorage.getItem("gitflowAiProfiles") || "";
  const activeId = localStorage.getItem("gitflowActiveAiProfileId") || "";
  return `${activeId}:${profiles.length}`;
}

// ─── Status computation ─────────────────────────────────────────────────────

function computeStatus(): AIStatus {
  const profile = loadActiveProfile();
  const provider = profile.provider;
  const profileName = profile.name;

  // Check if using a local provider
  const isLocal = provider === "ollama" || provider === "llamacpp";

  if (isLocal) {
    const lastError = getAIErrorSnapshot();
    if (lastError) {
      return {
        kind: "api-failed",
        label: "API Failed",
        reason: lastError,
        provider,
        profileName,
      };
    }
    return {
      kind: "local",
      label: "Local AI",
      reason: `Using ${provider === "ollama" ? "Ollama" : "llama.cpp"} — local inference`,
      provider,
      profileName,
    };
  }

  // Cloud providers need an API key
  if (providerNeedsApiKey(provider) && !profile.apiKey) {
    return {
      kind: "missing-key",
      label: "API Key Missing",
      reason: `No API key configured for ${provider === "anthropic" ? "Anthropic" : "OpenAI-compatible"} provider`,
      provider,
      profileName,
    };
  }

  // Has API key — check for recent errors
  const lastError = getAIErrorSnapshot();
  if (lastError) {
    return {
      kind: "api-failed",
      label: "API Failed",
      reason: lastError,
      provider,
      profileName,
    };
  }

  return {
    kind: "ready",
    label: "AI Ready",
    reason: `Connected to ${provider === "anthropic" ? "Anthropic" : provider === "openai-compatible" ? "OpenAI-compatible" : provider}`,
    provider,
    profileName,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Returns the current AI status based on the active profile configuration.
 * Reactively updates when the user changes AI settings or when AI requests fail/succeed.
 */
export function useAIStatus(): AIStatus {
  const storageKey = useSyncExternalStore(subscribeToStorage, getStorageSnapshot);
  const errorKey = useSyncExternalStore(subscribeToAIError, getAIErrorSnapshot);

  // Force recomputation by referencing both snapshots
  void storageKey;
  void errorKey;

  return computeStatus();
}
