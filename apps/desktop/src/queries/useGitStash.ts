import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type StashEntry } from "@/api/tauri";

export function useStashList(repoPath: string | null) {
  return useQuery<StashEntry[]>({
    queryKey: ["git", repoPath, "stash"],
    queryFn: () => api.stash.list(repoPath!),
    enabled: !!repoPath,
    staleTime: 15_000,
  });
}

export function useStashPush(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { message?: string; includeUntracked?: boolean }>({
    mutationKey: ["git.stash-push"],
    mutationFn: ({ message, includeUntracked }) =>
      api.stash.push(repoPath!, message, includeUntracked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useStashPop(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { index?: number }>({
    mutationKey: ["git.stash-pop"],
    mutationFn: ({ index }) => api.stash.pop(repoPath!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useStashApply(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { index?: number }>({
    mutationKey: ["git.stash-apply"],
    mutationFn: ({ index }) => api.stash.apply(repoPath!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useStashDrop(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { index?: number }>({
    mutationKey: ["git.stash-drop"],
    mutationFn: ({ index }) => api.stash.drop(repoPath!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}
