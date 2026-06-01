import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/tauri";

export function useStashDiff(repoPath: string | null, stashIndex: number | null) {
  return useQuery({
    queryKey: ["git", repoPath, "stash", stashIndex],
    queryFn: () => api.stash.diff(repoPath!, stashIndex!),
    enabled: !!repoPath && stashIndex !== null,
  });
}