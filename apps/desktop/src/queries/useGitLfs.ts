import { useQuery } from "@tanstack/react-query";
import { api, type LfsStatus } from "@/api/tauri";

export function useGitLfsStatus(repoPath: string | null) {
  return useQuery<LfsStatus>({
    queryKey: ["git", repoPath, "lfs"],
    queryFn: () => api.lfs.status(repoPath!),
    enabled: !!repoPath,
    staleTime: 15_000,
  });
}
