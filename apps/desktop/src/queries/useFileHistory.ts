import { useQuery } from "@tanstack/react-query";
import { api, Commit } from "@/api/tauri";

export function useFileHistory(repoPath: string | null, filePath: string | null) {
  return useQuery({
    queryKey: ["git", repoPath, "file-history", filePath],
    queryFn: () => api.fileHistory(repoPath!, filePath!),
    enabled: !!repoPath && !!filePath,
  });
}