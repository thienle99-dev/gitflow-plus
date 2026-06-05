const LATEST_RELEASE_API = "https://api.github.com/repos/thienle99-dev/gitflow-plus/releases/latest";

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, "");
}

export function isForceUpdateReleaseBody(body: string | null | undefined): boolean {
  if (!body) return false;
  return (
    /(?:^|\n)\s*[-*]?\s*\[[xX]\]\s*force\s+update\b/i.test(body) ||
    /(?:force[-_\s]?update|forceUpdate)\s*[:=]\s*(?:true|1|yes)\b/i.test(body) ||
    /!\s*force[-_\s]?update\b/i.test(body)
  );
}

export async function fetchLatestReleaseForceUpdate(version?: string): Promise<{
  forced: boolean;
  body: string;
}> {
  const response = await fetch(LATEST_RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`GitHub release check failed: ${response.status}`);
  }

  const release = await response.json() as {
    tag_name?: string;
    name?: string;
    body?: string;
  };
  const releaseVersion = normalizeVersion(release.tag_name || release.name || "");
  const updateVersion = normalizeVersion(version || "");

  if (updateVersion && releaseVersion && releaseVersion !== updateVersion) {
    return { forced: false, body: release.body || "" };
  }

  const body = release.body || "";
  return { forced: isForceUpdateReleaseBody(body), body };
}
