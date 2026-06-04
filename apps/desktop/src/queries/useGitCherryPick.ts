import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CherryPickResult } from "@/api/tauri";

export function useCherryPick(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<CherryPickResult, Error, { hash: string; noCommit?: boolean }>({
    mutationKey: ["git.cherry-pick"],
    mutationFn: ({ hash, noCommit }) =>
      api.cherryPick.pick(repoPath!, hash, noCommit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useCherryPickAbort(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, void>({
    mutationKey: ["git.cherry-pick-abort"],
    mutationFn: () => api.cherryPick.abort(repoPath!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}
