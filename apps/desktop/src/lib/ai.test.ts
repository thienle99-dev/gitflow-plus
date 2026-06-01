import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readCommitMessageDetailLevel } from "./ai";

describe("readCommitMessageDetailLevel", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      length: 0,
      key: () => null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 'medium' as default when no value is stored", () => {
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("medium");
  });

  it("returns stored value for 'ultra-minimal'", () => {
    store["gitflowAiDetailLevel"] = "ultra-minimal";
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("ultra-minimal");
  });

  it("returns stored value for 'minimal'", () => {
    store["gitflowAiDetailLevel"] = "minimal";
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("minimal");
  });

  it("returns stored value for 'medium'", () => {
    store["gitflowAiDetailLevel"] = "medium";
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("medium");
  });

  it("returns stored value for 'detailed'", () => {
    store["gitflowAiDetailLevel"] = "detailed";
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("detailed");
  });

  it("returns stored value for 'comprehensive'", () => {
    store["gitflowAiDetailLevel"] = "comprehensive";
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("comprehensive");
  });

  it("returns 'medium' for invalid stored values", () => {
    store["gitflowAiDetailLevel"] = "invalid-level";
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("medium");
  });

  it("returns 'medium' for empty string", () => {
    store["gitflowAiDetailLevel"] = "";
    const result = readCommitMessageDetailLevel();
    expect(result).toBe("medium");
  });
});
