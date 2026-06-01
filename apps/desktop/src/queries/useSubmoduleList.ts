import { useQuery } from "@tanstack/react-query";
import { api, SubmoduleInfo } from "@/api/tauri";

export function useSubmoduleList(repoPath: string | null) {
  return useQuery({
    queryKey: ["git", repoPath, "submodules"],
    queryFn: () => api.submodules.list(repoPath!),
    enabled: !!repoPath,
  });
}
