import type { GitFlowConfig } from "@/api/tauri";

/** Classify a branch name into its GitFlow type based on configured prefixes. */
export function classifyBranch(
  branchName: string,
  config: GitFlowConfig,
): "feature" | "release" | "hotfix" | "main" | "develop" | "other" {
  if (branchName === config.master) return "main";
  if (branchName === config.develop) return "develop";
  if (branchName.startsWith(config.feature_prefix)) return "feature";
  if (branchName.startsWith(config.release_prefix)) return "release";
  if (branchName.startsWith(config.hotfix_prefix)) return "hotfix";
  return "other";
}

/** Return the color for a GitFlow branch type. */
export function gitflowBranchColor(type: ReturnType<typeof classifyBranch>): string {
  switch (type) {
    case "feature":
      return "#f59e0b"; // orange
    case "release":
      return "#3b82f6"; // blue
    case "hotfix":
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
}

/** Extract the short name from a GitFlow branch (e.g. "feature/auth" → "auth"). */
export function extractGitFlowName(branchName: string, prefix: string): string {
  return branchName.slice(prefix.length);
}

/** Generate a kebab-case branch name from user input. */
export function toKebabCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Validate a GitFlow branch name: non-empty, no spaces, not conflicting. */
export function validateGitFlowName(
  name: string,
  existingBranches: string[],
  prefix: string,
): string | null {
  if (!name.trim()) return "Name cannot be empty";
  if (/\s/.test(name)) return "Name cannot contain spaces";
  if (/[^a-zA-Z0-9._/-]/.test(name)) return "Name contains invalid characters";
  const fullBranchName = prefix + name;
  if (existingBranches.includes(fullBranchName)) {
    return `Branch "${fullBranchName}" already exists`;
  }
  return null;
}

/** Validate a semver version string (e.g. "1.2.3"). */
export function validateSemver(version: string): string | null {
  if (!version.trim()) return "Version cannot be empty";
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(version)) {
    return "Version must be valid semver (e.g. 1.2.3)";
  }
  return null;
}

/** Get active feature branches from a list of branch names. */
export function getActiveGitFlowBranches(
  branches: Array<{ name: string; current: boolean; remote: string | null }>,
  config: GitFlowConfig,
  type: "feature" | "release" | "hotfix",
): string[] {
  const prefix =
    type === "feature"
      ? config.feature_prefix
      : type === "release"
        ? config.release_prefix
        : config.hotfix_prefix;

  return branches
    .filter((b) => b.remote === null && b.name.startsWith(prefix))
    .map((b) => b.name);
}
