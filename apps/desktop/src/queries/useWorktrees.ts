import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type WorktreeInfo } from "@/api/tauri";

export function useWorktrees(repoPath: string | null) {
  return useQuery<WorktreeInfo[]>({
    queryKey: ["git", repoPath, "worktrees"],
    queryFn: () => api.worktrees.list(repoPath!),
    enabled: !!repoPath,
    staleTime: 10_000,
  });
}

export function useWorktreeAdd(repoPath: string | null) {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { targetPath: string; branch?: string; newBranch?: string }>({
    mutationFn: ({ targetPath, branch, newBranch }) =>
      api.worktrees.add(repoPath!, targetPath, branch, newBranch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "worktrees"] });
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
    },
  });
}

export function useWorktreeRemove(repoPath: string | null) {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { worktreePath: string; force?: boolean }>({
    mutationFn: ({ worktreePath, force }) =>
      api.worktrees.remove(repoPath!, worktreePath, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "worktrees"] });
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
    },
  });
}

export function useWorktreeLock(repoPath: string | null) {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: (worktreePath) => api.worktrees.lock(repoPath!, worktreePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "worktrees"] });
    },
  });
}

export function useWorktreeUnlock(repoPath: string | null) {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: (worktreePath) => api.worktrees.unlock(repoPath!, worktreePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "worktrees"] });
    },
  });
}

export function useWorktreePrune(repoPath: string | null) {
  const queryClient = useQueryClient();
  return useMutation<string, Error, void>({
    mutationFn: () => api.worktrees.prune(repoPath!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath, "worktrees"] });
    },
  });
}
