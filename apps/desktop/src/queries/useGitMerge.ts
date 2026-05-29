import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type MergeStatus, type MergeResult } from "@/api/tauri";

export function useMergeStatus(repoPath: string | null) {
  return useQuery<MergeStatus>({
    queryKey: ["git", repoPath, "merge", "status"],
    queryFn: () => api.merge.status(repoPath!),
    enabled: !!repoPath,
    staleTime: 0,
  });
}

export function useMergeBranch(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<MergeResult, Error, { branch: string; squash?: boolean; noFF?: boolean }>({
    mutationFn: ({ branch, squash, noFF }) =>
      api.merge.start(repoPath!, branch, squash, noFF),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useMergeAbort(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, void>({
    mutationFn: () => api.merge.abort(repoPath!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useMergeContinue(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { message?: string }>({
    mutationFn: ({ message }) => api.merge.continue(repoPath!, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}
