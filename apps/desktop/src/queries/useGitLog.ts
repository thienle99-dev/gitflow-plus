import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api, type Commit, type CommitFileChange, type FileChange, type Branch, type RepoInfo, type SyncStatus } from "@/api/tauri";
import { markRepoOpenMilestone, measureAsync, repoName } from "@/lib/performance";

const PAGE_SIZE = 200;

function getSyncStatusInterval() {
  if (localStorage.getItem("gitflowAutoFetch") === "false") return false;
  const minutes = Number(localStorage.getItem("gitflowFetchIntervalMinutes") || "10");
  const safeMinutes = Number.isFinite(minutes) ? Math.min(60, Math.max(5, minutes)) : 10;
  return safeMinutes * 60_000;
}

export function useGitLog(repoPath: string | null, refName?: string | null) {
  return useInfiniteQuery<Commit[]>({
    queryKey: ["git", repoPath, "log", refName || "all"],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const commits = await measureAsync(
        "git_log",
        () => api.log(repoPath!, page, PAGE_SIZE, refName),
        { repo: repoName(repoPath), page, ref: refName || "all" },
      );
      if (page === 0 && !refName) {
        markRepoOpenMilestone(repoPath!, "log");
      }
      return commits;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!repoPath,
    staleTime: 30_000,
  });
}

export function useGitStatus(repoPath: string | null) {
  return useQuery<FileChange[]>({
    queryKey: ["git", repoPath, "status"],
    queryFn: async () => {
      const changes = await measureAsync(
        "git_status",
        () => api.status(repoPath!),
        { repo: repoName(repoPath) },
      );
      markRepoOpenMilestone(repoPath!, "status");
      return changes;
    },
    enabled: !!repoPath,
    staleTime: 0,
  });
}

export function useGitBranches(repoPath: string | null) {
  return useQuery<Branch[]>({
    queryKey: ["git", repoPath, "branches"],
    queryFn: async () => {
      const branches = await measureAsync(
        "git_branches",
        () => api.branches.list(repoPath!),
        { repo: repoName(repoPath) },
      );
      markRepoOpenMilestone(repoPath!, "branches");
      return branches;
    },
    enabled: !!repoPath,
    staleTime: 15_000,
  });
}

export function useGitDiff(
  repoPath: string | null,
  filePath: string | null,
  commitHash?: string | null,
  staged?: boolean,
  context?: number,
) {
  return useQuery<string>({
    queryKey: ["git", repoPath, "diff", commitHash || (staged ? "staged" : "working"), filePath, context],
    queryFn: () => {
      if (!repoPath || !filePath) return "";
      if (commitHash) {
        return api.diff.commit(repoPath, commitHash, filePath, context);
      }
      if (staged) {
        return api.diff.staged(repoPath, filePath, context);
      }
      return api.diff.file(repoPath, filePath, context);
    },
    enabled: !!repoPath && !!filePath,
    staleTime: 15_000,
  });
}

export function useCommitChangedFiles(repoPath: string | null, commitHash: string | null) {
  return useQuery<CommitFileChange[]>({
    queryKey: ["git", repoPath, "commit-files", commitHash],
    queryFn: () => api.diff.commitFiles(repoPath!, commitHash!),
    enabled: !!repoPath && !!commitHash,
    staleTime: 30_000,
  });
}

export function useRepoInfo(repoPath: string | null) {
  return useQuery<RepoInfo>({
    queryKey: ["git", repoPath, "info"],
    queryFn: () => api.repo.info(repoPath!),
    enabled: !!repoPath,
  });
}

export function useGitSyncStatus(repoPath: string | null) {
  return useQuery<SyncStatus>({
    queryKey: ["git", repoPath, "sync-status"],
    queryFn: () => api.remote.getSyncStatus(repoPath!),
    enabled: !!repoPath,
    staleTime: 5000,
    refetchInterval: getSyncStatusInterval(),
  });
}
