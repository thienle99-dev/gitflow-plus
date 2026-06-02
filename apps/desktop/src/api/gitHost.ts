import { api } from "./tauri";

export interface RemoteRepoInfo {
  provider: "github" | "gitlab" | null;
  owner: string;
  repo: string;
  host?: string;
}

export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  author: string;
  authorAvatar?: string;
  sourceBranch: string;
  targetBranch: string;
  state: "open" | "merged" | "closed";
  webUrl: string;
  sha?: string;
  pipelineStatus?: "success" | "failed" | "running" | "pending" | "skipped";
}

export interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
}

function normalizeGitlabHost(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).origin;
  } catch {
    return undefined;
  }
}

export function parseRemoteUrl(url: string): RemoteRepoInfo {
  if (!url) return { provider: null, owner: "", repo: "" };

  let cleaned = url.trim();
  if (cleaned.endsWith(".git")) {
    cleaned = cleaned.slice(0, -4);
  }

  // Handle SSH style: git@github.com:owner/repo or git@gitlab.com:owner/repo
  if (cleaned.startsWith("git@") || (cleaned.includes("@") && cleaned.includes(":"))) {
    const parts = cleaned.split(":");
    if (parts.length >= 2) {
      const hostPart = parts[0].substring(parts[0].indexOf("@") + 1);
      const pathPart = parts.slice(1).join(":");

      let provider: "github" | "gitlab" | null = null;
      let host: string | undefined = undefined;

      if (hostPart === "github.com") {
        provider = "github";
      } else if (hostPart === "gitlab.com") {
        provider = "gitlab";
        host = "https://gitlab.com";
      } else {
        const customHostSetting = normalizeGitlabHost(localStorage.getItem("gitflowGitlabHost") || "");
        const customHostUrl = customHostSetting ? new URL(customHostSetting).hostname : "";
        if (customHostUrl && hostPart === customHostUrl) {
          provider = "gitlab";
          host = customHostSetting;
        } else if (hostPart.toLowerCase().includes("gitlab")) {
          provider = "gitlab";
          host = `https://${hostPart}`;
        }
      }

      const slashParts = pathPart.split("/");
      const repo = slashParts.pop() || "";
      const owner = slashParts.join("/");

      return { provider, owner, repo, host };
    }
  }

  // Handle HTTPS style: https://github.com/owner/repo or https://gitlab.com/owner/repo
  try {
    const urlObj = new URL(cleaned);
    const hostPart = urlObj.hostname;
    const pathPart = urlObj.pathname.startsWith("/") ? urlObj.pathname.substring(1) : urlObj.pathname;

    let provider: "github" | "gitlab" | null = null;
    let host: string | undefined = undefined;

    if (hostPart === "github.com") {
      provider = "github";
    } else if (hostPart === "gitlab.com") {
      provider = "gitlab";
      host = "https://gitlab.com";
    } else {
      const customHostSetting = normalizeGitlabHost(localStorage.getItem("gitflowGitlabHost") || "");
      const customHostUrl = customHostSetting ? new URL(customHostSetting).hostname : "";
      if (customHostUrl && hostPart === customHostUrl) {
        provider = "gitlab";
        host = customHostSetting;
      } else if (hostPart.toLowerCase().includes("gitlab")) {
        provider = "gitlab";
        host = `https://${hostPart}`;
      }
    }

    const slashParts = pathPart.split("/");
    const repo = slashParts.pop() || "";
    const owner = slashParts.join("/");

    return {
      provider,
      owner,
      repo,
      host: provider === "gitlab" ? (host || `https://${hostPart}`) : undefined,
    };
  } catch (e) {
    return { provider: null, owner: "", repo: "" };
  }
}

export async function fetchMergeRequests(remoteUrl: string): Promise<MergeRequest[]> {
  const { provider, owner, repo, host } = parseRemoteUrl(remoteUrl);
  if (!provider) {
    throw new Error("Unable to identify Git hosting provider (GitHub/GitLab) from remote URL.");
  }

  if (provider === "github") {
    const token = localStorage.getItem("gitflowGithubToken") || "";
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=30`;
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "GitFlow-Desktop",
    };
    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    const response = await api.ai.request(url, "GET", headers);
    if (response.status !== 200) {
      let errDetail = "";
      try {
        errDetail = JSON.parse(response.body).message;
      } catch {
        errDetail = response.body;
      }
      throw new Error(`GitHub API Error (${response.status}): ${errDetail}`);
    }

    const prs = JSON.parse(response.body);
    return prs.map((pr: any) => {
      let state: "open" | "merged" | "closed" = "open";
      if (pr.state === "closed") {
        state = pr.merged_at ? "merged" : "closed";
      }

      return {
        id: pr.id,
        iid: pr.number,
        title: pr.title,
        description: pr.body || "",
        author: pr.user?.login || "unknown",
        authorAvatar: pr.user?.avatar_url,
        sourceBranch: pr.head?.ref || "",
        targetBranch: pr.base?.ref || "",
        state,
        webUrl: pr.html_url,
        sha: pr.head?.sha,
      };
    });
  } else {
    const token = localStorage.getItem("gitflowGitlabToken") || "";
    const gitlabHost = host || localStorage.getItem("gitflowGitlabHost") || "https://gitlab.com";
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const url = `${gitlabHost}/api/v4/projects/${projectId}/merge_requests?state=all&per_page=30`;
    const headers: Record<string, string> = {
      "User-Agent": "GitFlow-Desktop",
    };
    if (token) {
      headers["PRIVATE-TOKEN"] = token;
    }

    const response = await api.ai.request(url, "GET", headers);
    if (response.status !== 200) {
      let errDetail = "";
      try {
        errDetail = JSON.parse(response.body).message || JSON.parse(response.body).error;
      } catch {
        errDetail = response.body;
      }
      throw new Error(`GitLab API Error (${response.status}): ${errDetail}`);
    }

    const mrs = JSON.parse(response.body);
    return mrs.map((mr: any) => {
      let state: "open" | "merged" | "closed" = "open";
      if (mr.state === "merged") state = "merged";
      else if (mr.state === "closed") state = "closed";

      let pipelineStatus: MergeRequest["pipelineStatus"] = undefined;
      const statusStr = mr.head_pipeline?.status;
      if (statusStr === "success") pipelineStatus = "success";
      else if (statusStr === "failed") pipelineStatus = "failed";
      else if (["running", "running_with_warnings", "pending", "preparing", "waiting_for_resource"].includes(statusStr)) {
        pipelineStatus = "running";
      } else if (statusStr === "skipped") {
        pipelineStatus = "skipped";
      }

      return {
        id: mr.id,
        iid: mr.iid,
        title: mr.title,
        description: mr.description || "",
        author: mr.author?.username || "unknown",
        authorAvatar: mr.author?.avatar_url,
        sourceBranch: mr.source_branch || "",
        targetBranch: mr.target_branch || "",
        state,
        webUrl: mr.web_url,
        sha: mr.sha,
        pipelineStatus,
      };
    });
  }
}

export async function fetchGitHubCheckRuns(remoteUrl: string, sha: string): Promise<CheckRun[]> {
  const { provider, owner, repo } = parseRemoteUrl(remoteUrl);
  if (provider !== "github") return [];

  const token = localStorage.getItem("gitflowGithubToken") || "";
  if (!token) return [];

  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`;
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "GitFlow-Desktop",
    "Authorization": `token ${token}`,
  };

  try {
    const response = await api.ai.request(url, "GET", headers);
    if (response.status === 200) {
      const data = JSON.parse(response.body);
      return (data.check_runs || []).map((run: any) => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        htmlUrl: run.html_url,
      }));
    }
  } catch (e) {
    console.error("Failed to fetch check runs:", e);
  }
  return [];
}
