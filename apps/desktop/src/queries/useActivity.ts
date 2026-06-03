import { useQuery } from "@tanstack/react-query";
import { api, type ActivityMap } from "@/api/tauri";

export function useActivity(repoPath: string | null, days = 365) {
  return useQuery<ActivityMap>({
    queryKey: ["git", repoPath, "activity", days],
    queryFn: () => api.activity(repoPath!, days),
    enabled: !!repoPath,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
