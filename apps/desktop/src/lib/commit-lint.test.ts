import { describe, it, expect } from "vitest";
import { lintCommitMessage, autoFixCommitMessage } from "./commit-lint";

describe("commit-lint", () => {
  describe("lintCommitMessage", () => {
    it("should pass valid conventional commit messages", () => {
      const valid = [
        "feat(ui): add dashboard widgets",
        "fix: resolve memory leak in client",
        "chore(deps): upgrade dependencies",
        "docs: update installation guide\n\nCloses #123",
      ];

      for (const msg of valid) {
        const results = lintCommitMessage(msg);
        expect(results).toHaveLength(0);
      }
    });

    it("should report empty messages", () => {
      const results = lintCommitMessage("   ");
      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe("no-empty-message");
      expect(results[0].severity).toBe("error");
    });

    it("should check subject length limit of 72", () => {
      const longSubject = "feat(ui): add dashboard widgets with extremely long description that exceeds seventy two characters limit";
      const results = lintCommitMessage(longSubject);
      expect(results.some((r) => r.ruleId === "subject-length")).toBe(true);
    });

    it("should validate type-enum", () => {
      const invalidType = "build-app(ui): build issues";
      const results = lintCommitMessage(invalidType);
      expect(results.some((r) => r.ruleId === "type-enum")).toBe(true);
    });

    it("should warn about non-conventional format", () => {
      const invalidFormat = "added dashboard widgets";
      const results = lintCommitMessage(invalidFormat);
      expect(results.some((r) => r.ruleId === "subject-format")).toBe(true);
    });

    it("should warn about subject starting with uppercase description", () => {
      const upperCaseSubject = "feat(ui): Add dashboard widgets";
      const results = lintCommitMessage(upperCaseSubject);
      expect(results.some((r) => r.ruleId === "subject-case")).toBe(true);
      expect(results.find((r) => r.ruleId === "subject-case")?.suggestion).toBe("feat(ui): add dashboard widgets");
    });

    it("should check for trailing period", () => {
      const trailingPeriod = "feat(ui): add dashboard widgets.";
      const results = lintCommitMessage(trailingPeriod);
      expect(results.some((r) => r.ruleId === "no-trailing-period")).toBe(true);
      expect(results.find((r) => r.ruleId === "no-trailing-period")?.suggestion).toBe("feat(ui): add dashboard widgets");
    });

    it("should require a blank line before the body", () => {
      const noBlankLine = "feat(ui): add widgets\nThis is the description body with no blank line.";
      const results = lintCommitMessage(noBlankLine);
      expect(results.some((r) => r.ruleId === "body-blank-line")).toBe(true);
    });
  });

  describe("autoFixCommitMessage", () => {
    it("should fix trailing period", () => {
      const msg = "feat: resolve bug.";
      const results = lintCommitMessage(msg);
      const fixed = autoFixCommitMessage(msg, results);
      expect(fixed).toBe("feat: resolve bug");
    });

    it("should fix casing and trailing period together", () => {
      const msg = "feat(ui): Add widgets.";
      const results = lintCommitMessage(msg);
      const fixed = autoFixCommitMessage(msg, results);
      expect(fixed).toBe("feat(ui): add widgets");
    });

    it("should fix blank line before body", () => {
      const msg = "feat: add widgets\nDescription body here";
      const results = lintCommitMessage(msg);
      const fixed = autoFixCommitMessage(msg, results);
      expect(fixed).toBe("feat: add widgets\n\nDescription body here");
    });
  });
});
