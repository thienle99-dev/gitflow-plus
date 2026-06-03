export interface CommitLintResult {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

const ALLOWED_TYPES = [
  "feat",
  "fix",
  "chore",
  "docs",
  "style",
  "refactor",
  "test",
  "perf",
  "ci",
  "build",
];

export function lintCommitMessage(
  message: string,
  enabledRules: {
    subjectFormat?: boolean;
    subjectLength?: boolean;
    subjectCase?: boolean;
    typeEnum?: boolean;
    bodyBlankLine?: boolean;
    noTrailingPeriod?: boolean;
    noEmptyMessage?: boolean;
  } = {
    subjectFormat: true,
    subjectLength: true,
    subjectCase: true,
    typeEnum: true,
    bodyBlankLine: true,
    noTrailingPeriod: true,
    noEmptyMessage: true,
  }
): CommitLintResult[] {
  const results: CommitLintResult[] = [];
  const trimmed = message.trim();

  // Rule: no-empty-message
  if (enabledRules.noEmptyMessage && trimmed.length === 0) {
    results.push({
      ruleId: "no-empty-message",
      severity: "error",
      message: "Commit message cannot be empty.",
      autoFixable: false,
    });
    return results;
  }

  const lines = message.split(/\r?\n/);
  const subject = lines[0];

  // Rule: subject-length
  if (enabledRules.subjectLength && subject.length > 72) {
    results.push({
      ruleId: "subject-length",
      severity: "warning",
      message: `Subject line is too long (${subject.length}/72 characters).`,
      suggestion: subject.substring(0, 72),
      autoFixable: true,
    });
  }

  // Parse conventional commit pattern: type(scope)?: subject
  // We match type, optional scope inside parentheses, colon, optional spaces, and the subject text
  const ccRegex = /^([a-zA-Z0-9_-]+)(?:\(([^)]+)\))?\s*:\s*(.*)$/;
  const match = subject.match(ccRegex);

  if (match) {
    const type = match[1];
    const scope = match[2];
    const subjectText = match[3];

    // Rule: type-enum
    if (enabledRules.typeEnum && !ALLOWED_TYPES.includes(type.toLowerCase())) {
      results.push({
        ruleId: "type-enum",
        severity: "error",
        message: `Commit type "${type}" is not allowed. Use one of: ${ALLOWED_TYPES.join(", ")}.`,
        suggestion: `feat${scope ? `(${scope})` : ""}: ${subjectText}`,
        autoFixable: true,
      });
    }

    // Rule: subject-case (conventionally subject starts with lowercase)
    if (enabledRules.subjectCase && subjectText) {
      const firstChar = subjectText.trim().charAt(0);
      if (firstChar && firstChar === firstChar.toUpperCase() && /[a-zA-Z]/.test(firstChar)) {
        const lowerFirst = firstChar.toLowerCase() + subjectText.trim().substring(1);
        results.push({
          ruleId: "subject-case",
          severity: "info",
          message: "Subject description should start with a lowercase letter.",
          suggestion: `${type}${scope ? `(${scope})` : ""}: ${lowerFirst}`,
          autoFixable: true,
        });
      }
    }

    // Rule: no-trailing-period
    if (enabledRules.noTrailingPeriod && subjectText && subjectText.trim().endsWith(".")) {
      const strippedSubject = subjectText.trim().replace(/\.+$/, "");
      results.push({
        ruleId: "no-trailing-period",
        severity: "info",
        message: "Subject line should not end with a period.",
        suggestion: `${type}${scope ? `(${scope})` : ""}: ${strippedSubject}`,
        autoFixable: true,
      });
    }
  } else {
    // Rule: subject-format (not matching CC format)
    if (enabledRules.subjectFormat) {
      results.push({
        ruleId: "subject-format",
        severity: "warning",
        message: 'Subject does not match Conventional Commits format "type(scope?): description".',
        suggestion: `feat: ${subject}`,
        autoFixable: true,
      });
    }
  }

  // Rule: body-blank-line
  if (enabledRules.bodyBlankLine && lines.length > 1) {
    const secondLine = lines[1];
    if (secondLine.trim().length > 0) {
      results.push({
        ruleId: "body-blank-line",
        severity: "warning",
        message: "Subject and body must be separated by a blank line.",
        autoFixable: true,
      });
    }
  }

  return results;
}

export function autoFixCommitMessage(message: string, results: CommitLintResult[]): string {
  let fixed = message;

  // Let's run fixers step-by-step
  // 1. body-blank-line (insert a blank line after the first line)
  const hasBodyBlankLineIssue = results.some((r) => r.ruleId === "body-blank-line");
  if (hasBodyBlankLineIssue) {
    const lines = fixed.split(/\r?\n/);
    if (lines.length > 1 && lines[1].trim().length > 0) {
      lines.splice(1, 0, "");
      fixed = lines.join("\n");
    }
  }

  // Re-split lines to apply subject fixes
  const lines = fixed.split(/\r?\n/);
  let subject = lines[0];

  const ccRegex = /^([a-zA-Z0-9_-]+)(?:\(([^)]+)\))?\s*:\s*(.*)$/;
  let match = subject.match(ccRegex);

  if (!match && results.some((r) => r.ruleId === "subject-format")) {
    subject = `feat: ${subject}`;
    match = subject.match(ccRegex);
  }

  if (match) {
    let type = match[1];
    const scope = match[2];
    let subjectText = match[3];

    // Fix type-enum
    if (results.some((r) => r.ruleId === "type-enum") && !ALLOWED_TYPES.includes(type.toLowerCase())) {
      type = "feat";
    }

    // Fix no-trailing-period
    if (results.some((r) => r.ruleId === "no-trailing-period") && subjectText && subjectText.trim().endsWith(".")) {
      subjectText = subjectText.trim().replace(/\.+$/, "");
    }

    // Fix subject-case
    if (results.some((r) => r.ruleId === "subject-case") && subjectText) {
      const trimmed = subjectText.trim();
      const firstChar = trimmed.charAt(0);
      if (firstChar && firstChar === firstChar.toUpperCase() && /[a-zA-Z]/.test(firstChar)) {
        subjectText = firstChar.toLowerCase() + trimmed.substring(1);
      }
    }

    subject = `${type}${scope ? `(${scope})` : ""}: ${subjectText}`;
  }

  // Fix subject-length
  if (results.some((r) => r.ruleId === "subject-length") && subject.length > 72) {
    subject = subject.substring(0, 72);
  }

  lines[0] = subject;
  return lines.join("\n");
}
