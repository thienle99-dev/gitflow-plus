import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/tauri";
import { parseRemoteUrl, fetchMergeRequests, fetchGitHubCheckRuns, type MergeRequest, type CheckRun } from "@/api/gitHost";

export interface CommitPRStatus {
  prs: MergeRequest[];
  checks: CheckRun[];
  overall: "success" | "failure" | "pending" | "unknown";
  reviewStatus: "approved" | "changes-requested" | "pending" | "unknown";
}

export function useCommitPRStatus(repoPath: string | null, commitSha: string | null) {
  return useQuery<CommitPRStatus>({
    queryKey: ["git", repoPath, "pr-status", commitSha],
    queryFn: async () => {
      if (!commitSha || !repoPath) {
        return { prs: [], checks: [], overall: "unknown", reviewStatus: "unknown" };
      }

      // Get remote URL from git
      let remoteUrl: string | null = null;
      try {
        const remotes = await api.remote.listRemotes(repoPath);
        const origin = remotes.find((r) => r.name === "origin");
        if (origin) remoteUrl = origin.url;
      } catch {
        // No remotes available
      }
      if (!remoteUrl) {
        return { prs: [], checks: [], overall: "unknown", reviewStatus: "unknown" };
      }

      const repoInfo = parseRemoteUrl(remoteUrl);
      if (!repoInfo.provider) {
        return { prs: [], checks: [], overall: "unknown", reviewStatus: "unknown" };
      }

      // Check if token is configured
      const hasToken = repoInfo.provider === "github"
        ? !!localStorage.getItem("gitflowGithubToken")
        : !!localStorage.getItem("gitflowGitlabToken");
      if (!hasToken) {
        return { prs: [], checks: [], overall: "unknown", reviewStatus: "unknown" };
      }

      // Fetch all open MRs/PRs
      const mrs = await fetchMergeRequests(remoteUrl);

      // Find ones matching this commit SHA
      const matching = mrs.filter((mr) => mr.sha === commitSha);

      // Fetch check runs (GitHub only)
      let checks: CheckRun[] = [];
      if (repoInfo.provider === "github" && commitSha) {
        try {
          checks = await fetchGitHubCheckRuns(remoteUrl, commitSha);
        } catch {
          // Check runs not available
        }
      }

      // Determine overall status
      let overall: "success" | "failure" | "pending" | "unknown" = "unknown";
      const running = checks.some((c) => c.status === "in_progress" || c.status === "queued");
      const failed = checks.some((c) => c.conclusion === "failure" || c.conclusion === "cancelled" || c.conclusion === "timed_out");
      const succeeded = checks.length > 0 && checks.every((c) => c.conclusion === "success");

      if (checks.length === 0 && matching.length > 0) {
        overall = matching.some((m) => m.pipelineStatus === "failed") ? "failure"
               : matching.some((m) => m.pipelineStatus === "running" || m.pipelineStatus === "pending") ? "pending"
               : overall;
      } else if (checks.length > 0) {
        overall = failed ? "failure" : running ? "pending" : succeeded ? "success" : "unknown";
      }

      return {
        prs: matching,
        checks,
        overall,
        reviewStatus: "unknown",
      };
    },
    enabled: !!repoPath && !!commitSha,
    staleTime: 60_000,
    retry: false,
  });
}
