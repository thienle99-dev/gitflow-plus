import { useQuery } from "@tanstack/react-query";
import { api, type Commit, type FileChange, type Branch, type RepoInfo } from "@/api/tauri";

export function useGitLog(repoPath: string | null, page: number = 0) {
  return useQuery<Commit[]>({
    queryKey: ["git", repoPath, "log", page],
    queryFn: () => api.log(repoPath!, page),
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
    refetchInterval: 5_000,
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

export function useGitDiff(repoPath: string | null, filePath: string | null, commitHash?: string | null) {
  return useQuery<string>({
    queryKey: ["git", repoPath, "diff", commitHash || "working", filePath],
    queryFn: () => {
      if (!repoPath || !filePath) return "";
      if (commitHash) {
        return api.diff.commit(repoPath, commitHash, filePath);
      }
      return api.diff.file(repoPath, filePath);
    },
    enabled: !!repoPath && !!filePath,
    staleTime: 15_000,
  });
}

export function useRepoInfo(repoPath: string | null) {
  return useQuery<RepoInfo>({
    queryKey: ["git", repoPath, "info"],
    queryFn: () => api.repo.info(repoPath!),
    enabled: !!repoPath,
  });
}
