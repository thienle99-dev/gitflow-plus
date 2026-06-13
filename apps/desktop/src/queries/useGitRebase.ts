import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/tauri";
import type { PausedCommitInfo, RebaseResult, RebaseTodo } from "@/api/tauri";
import { trackRemoteOp } from "@/stores/operations";

/** Fetch the list of commits between `base`..HEAD for building the rebase todo list */
export function useRebaseTodoList(repoPath: string | null, base: string | null) {
  return useQuery<RebaseTodo[]>({
    queryKey: ["git", repoPath, "rebase", "todo", base],
    queryFn: () => api.rebase.todoList(repoPath!, base!),
    enabled: !!repoPath && !!base,
    staleTime: 0,
  });
}

/** Start an interactive rebase with the given todo items */
export function useRebaseStart(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<RebaseResult, Error, { base: string; todos: RebaseTodo[] }>({
    mutationKey: ["git.rebase-start"],
    mutationFn: ({ base, todos }) =>
      trackRemoteOp("Rebase", (opId) => api.rebase.start(repoPath!, base, todos, opId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

/** Continue a rebase after resolving conflicts */
export function useRebaseContinue(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, void>({
    mutationKey: ["git.rebase-continue"],
    mutationFn: () =>
      trackRemoteOp("Rebase: Continue", (opId) => api.rebase.continue(repoPath!, opId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

/** Skip the current commit during a rebase */
export function useRebaseSkip(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, void>({
    mutationKey: ["git.rebase-skip"],
    mutationFn: () =>
      trackRemoteOp("Rebase: Skip", (opId) => api.rebase.skip(repoPath!, opId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

/** Abort the current rebase */
export function useRebaseAbort(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, void>({
    mutationKey: ["git.rebase-abort"],
    mutationFn: () => api.rebase.abort(repoPath!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

/** Check whether a rebase is in progress and which files are conflicted */
export function useRebaseStatus(repoPath: string | null) {
  return useQuery<[boolean, string[]]>({
    queryKey: ["git", repoPath, "rebase", "status"],
    queryFn: () => api.rebase.status(repoPath!),
    enabled: !!repoPath,
    refetchInterval: 2000,
    staleTime: 0,
  });
}

/** Fetch info about the paused commit during an edit-pause */
export function usePausedCommitInfo(repoPath: string | null) {
  return useQuery<PausedCommitInfo>({
    queryKey: ["git", repoPath, "rebase", "paused-info"],
    queryFn: () => api.rebase.getPausedCommitInfo(repoPath!),
    enabled: !!repoPath,
    staleTime: 0,
    retry: false,
  });
}

/** Amend the current paused commit during rebase edit, then continue */
export function useAmendAndContinue(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<RebaseResult, Error, { message?: string }>({
    mutationKey: ["git.rebase-amend-continue"],
    mutationFn: ({ message }) =>
      trackRemoteOp("Amend + Rebase Continue", (opId) =>
        api.rebase.amendAndContinue(repoPath!, message, opId),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}
