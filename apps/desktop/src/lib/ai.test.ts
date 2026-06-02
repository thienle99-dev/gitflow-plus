import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readCommitMessageDetailLevel, buildCommitPrompt, formatLocalCommitMessage } from "./ai";

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

describe("buildCommitPrompt", () => {
  it("includes ultra-minimal instruction for ultra-minimal level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      reviewModel: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "ultra-minimal" as const,
      commitStyle: "conventional" as const,
      customRules: "",
      reviewLanguage: "auto" as const,
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("Return ONLY a single line");
  });

  it("includes minimal instruction for minimal level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      reviewModel: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "minimal" as const,
      commitStyle: "conventional" as const,
      customRules: "",
      reviewLanguage: "auto" as const,
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("1-2 lines of brief explanation");
  });

  it("includes medium instruction for medium level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      reviewModel: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "medium" as const,
      commitStyle: "conventional" as const,
      customRules: "",
      reviewLanguage: "auto" as const,
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("If the changes are complex");
  });

  it("includes detailed instruction for detailed level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      reviewModel: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "detailed" as const,
      commitStyle: "conventional" as const,
      customRules: "",
      reviewLanguage: "auto" as const,
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("detailed commit message with a body");
  });

  it("includes comprehensive instruction for comprehensive level", () => {
    const settings = {
      apiKey: "test",
      model: "claude-sonnet-4-20250514",
      reviewModel: "claude-sonnet-4-20250514",
      customUrl: "",
      tokenLimit: 4096,
      detailLevel: "comprehensive" as const,
      commitStyle: "conventional" as const,
      customRules: "",
      reviewLanguage: "auto" as const,
    };
    const prompt = buildCommitPrompt("diff content", settings, "main");
    expect(prompt).toContain("reasoning section");
  });
});

describe("formatLocalCommitMessage", () => {
  const mockFiles = [
    { path: "src/auth.ts", status: "modified", staged: true },
    { path: "src/api.ts", status: "modified", staged: true },
    { path: "tests/auth.test.ts", status: "added", staged: true },
  ];

  it("returns subject only for ultra-minimal level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "ultra-minimal",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toBe("feat(auth): add JWT refresh");
    expect(result).not.toContain("\n");
  });

  it("returns subject only for minimal level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "minimal",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toBe("feat(auth): add JWT refresh");
  });

  it("returns subject + 3 bullets for medium level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "medium",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toContain("feat(auth): add JWT refresh");
    expect(result).toContain("- update src/auth.ts");
    expect(result).toContain("- update src/api.ts");
    expect(result).toContain("- add tests/auth.test.ts");
  });

  it("returns subject + body + 8 bullets for detailed level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "detailed",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toContain("feat(auth): add JWT refresh");
    expect(result).toContain("Changes:");
    expect(result).toContain("- update src/auth.ts");
  });

  it("returns subject + body + bullets + reasoning for comprehensive level", () => {
    const result = formatLocalCommitMessage(
      "conventional",
      "comprehensive",
      "feat",
      "(auth)",
      "add JWT refresh",
      "main",
      mockFiles
    );
    expect(result).toContain("feat(auth): add JWT refresh");
    expect(result).toContain("Changes:");
    expect(result).toContain("Reasoning:");
  });
});
