import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api, type Commit, type CommitFileChange, type FileChange, type Branch, type RepoInfo } from "@/api/tauri";

const PAGE_SIZE = 50;

export function useGitLog(repoPath: string | null, refName?: string | null) {
  return useInfiniteQuery<Commit[]>({
    queryKey: ["git", repoPath, "log", refName || "all"],
    queryFn: ({ pageParam }) => api.log(repoPath!, pageParam as number, PAGE_SIZE, refName),
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
    queryFn: () => api.status(repoPath!),
    enabled: !!repoPath,
    staleTime: 0,
  });
}

export function useGitBranches(repoPath: string | null) {
  return useQuery<Branch[]>({
    queryKey: ["git", repoPath, "branches"],
    queryFn: () => api.branches.list(repoPath!),
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
