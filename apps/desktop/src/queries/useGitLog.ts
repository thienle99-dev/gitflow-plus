import { useQuery, useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { api, type Commit, type CommitFileChange, type FileChange, type Branch, type RepoInfo, type SyncStatus, type RemoteInfo } from "@/api/tauri";
import { markRepoOpenMilestone, measureAsync, repoName } from "@/lib/performance";

const PAGE_SIZE = 200;
const DIFF_CACHE_TIME = 10 * 60_000;
const LOG_CACHE_TIME = 10 * 60_000;

function getSyncStatusInterval() {
  if (localStorage.getItem("gitflowAutoFetch") === "false") return false;
  const minutes = Number(localStorage.getItem("gitflowFetchIntervalMinutes") || "10");
  const safeMinutes = Number.isFinite(minutes) ? Math.min(60, Math.max(5, minutes)) : 10;
  return safeMinutes * 60_000;
}

export function useGitLog(repoPath: string | null, refName?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["git", repoPath, "log", refName || "all"];

  return useInfiniteQuery<Commit[]>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const cached = queryClient.getQueryData<InfiniteData<Commit[]>>(queryKey);
      const cachedFirstPage = cached?.pages[0] ?? [];
      const knownHead = cachedFirstPage[0]?.hash;

      if (page === 0 && knownHead) {
        try {
          const newerCommits = await measureAsync(
            "git_log_incremental",
            () => api.logSince(repoPath!, knownHead, PAGE_SIZE, refName),
            { repo: repoName(repoPath), knownHead: knownHead.slice(0, 7), ref: refName || "HEAD" },
          );

          if (newerCommits.length < PAGE_SIZE) {
            const seen = new Set<string>();
            const merged = [...newerCommits, ...cachedFirstPage].filter((commit) => {
              if (seen.has(commit.hash)) return false;
              seen.add(commit.hash);
              return true;
            });
            if (!refName) {
              markRepoOpenMilestone(repoPath!, "log");
            }
            return merged.slice(0, PAGE_SIZE);
          }
        } catch (error) {
          console.debug("[perf] git_log_incremental fallback", error);
        }
      }

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
    gcTime: LOG_CACHE_TIME,
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
    staleTime: 30_000,
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

export function useGitRemotes(repoPath: string | null) {
  return useQuery<RemoteInfo[]>({
    queryKey: ["git", repoPath, "remotes"],
    queryFn: () => api.remote.listRemotes(repoPath!),
    enabled: !!repoPath,
    staleTime: 30_000,
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
        return measureAsync("git_diff", () => api.diff.commit(repoPath, commitHash, filePath, context), {
          repo: repoName(repoPath),
          source: "commit",
          file: filePath,
        });
      }
      if (staged) {
        return measureAsync("git_diff", () => api.diff.staged(repoPath, filePath, context), {
          repo: repoName(repoPath),
          source: "staged",
          file: filePath,
        });
      }
      return measureAsync("git_diff", () => api.diff.file(repoPath, filePath, context), {
        repo: repoName(repoPath),
        source: "working",
        file: filePath,
      });
    },
    enabled: !!repoPath && !!filePath,
    staleTime: DIFF_CACHE_TIME,
    gcTime: DIFF_CACHE_TIME,
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
