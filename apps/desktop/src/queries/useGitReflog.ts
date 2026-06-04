import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ReflogEntry } from "@/api/tauri";

export function useReflogList(repoPath: string | null, maxCount?: number) {
  return useQuery<ReflogEntry[]>({
    queryKey: ["git", repoPath, "reflog", { maxCount }],
    queryFn: () => api.reflog.list(repoPath!, maxCount),
    enabled: !!repoPath,
    staleTime: 30_000,
  });
}

export function useUndoLast(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, void>({
    mutationKey: ["git.reflog-undo"],
    mutationFn: () => api.reflog.undo(repoPath!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}
