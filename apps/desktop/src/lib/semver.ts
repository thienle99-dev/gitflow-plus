import type { Commit } from "@/api/tauri";

export interface Semver {
  major: number;
  minor: number;
  patch: number;
  prefix: string;
}

export interface VersionOption {
  label: "Major" | "Minor" | "Patch";
  version: string;
  description: string;
}

const CONVENTIONAL_PATTERN = /^(feat|fix|chore|docs|style|refactor|perf|test|ci|build|BREAKING)(\(.+\))?(!)?:\s(.+)$/i;

export function parseSemver(tagName: string): Semver | null {
  const match = tagName.match(/^([^\d]*)(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    prefix: match[1],
    major: parseInt(match[2], 10),
    minor: parseInt(match[3], 10),
    patch: parseInt(match[4], 10),
  };
}

export function formatVersion(s: Semver): string {
  return `${s.prefix}${s.major}.${s.minor}.${s.patch}`;
}

export function suggestBumpType(commits: Commit[]): "major" | "minor" | "patch" {
  let hasBreaking = false;
  let hasFeat = false;

  for (const c of commits) {
    const match = c.message.match(CONVENTIONAL_PATTERN);
    if (!match) continue;
    const type = match[1];
    const hasBang = match[3] === "!";

    if (type === "BREAKING" || hasBang || c.message.includes("BREAKING CHANGE")) {
      hasBreaking = true;
    }
    if (type === "feat") hasFeat = true;
  }

  if (hasBreaking) return "major";
  if (hasFeat) return "minor";
  return "patch";
}

export function suggestNextVersions(latestTag: string | null, commits: Commit[]): VersionOption[] {
  const base = latestTag ? parseSemver(latestTag) : null;
  const suggestedBump = suggestBumpType(commits);

  const versions: VersionOption[] = [
    { label: "Major", version: "", description: "Breaking changes" },
    { label: "Minor", version: "", description: "New features" },
    { label: "Patch", version: "", description: "Bug fixes" },
  ];

  const mapLabel: Record<string, "major" | "minor" | "patch"> = {
    Major: "major", Minor: "minor", Patch: "patch",
  };

  for (const v of versions) {
    const bump = mapLabel[v.label];
    if (base) {
      const next = { ...base };
      if (bump === "major") { next.major += 1; next.minor = 0; next.patch = 0; }
      else if (bump === "minor") { next.minor += 1; next.patch = 0; }
      else next.patch += 1;
      v.version = formatVersion(next);
    } else {
      v.version = formatVersion({ prefix: "v", major: 0, minor: 1, patch: 0 });
    }
    if (bump === suggestedBump) v.description += " ✓ recommended";
  }

  return versions;
}

export function groupCommitsByType(commits: Commit[]): Record<string, Commit[]> {
  const groups: Record<string, Commit[]> = {};
  for (const c of commits) {
    const match = c.message.match(CONVENTIONAL_PATTERN);
    const type = match ? (match[1] === "BREAKING" ? "breaking" : match[1].toLowerCase()) : "other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(c);
  }
  return groups;
}
