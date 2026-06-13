import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/tauri";
import { trackRemoteOp } from "@/stores/operations";

export interface RebaseTodo {
  action: string;
  commit_hash: string;
  message: string;
}

export interface RebaseResult {
  success: boolean;
  message: string;
  conflicted_files: string[];
}

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
