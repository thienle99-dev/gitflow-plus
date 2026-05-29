import { useQuery } from "@tanstack/react-query";
import { api, type BlameLine } from "@/api/tauri";

export function useGitBlame(repoPath: string | null, filePath: string | null) {
  return useQuery<BlameLine[]>({
    queryKey: ["git", repoPath, "blame", filePath],
    queryFn: () => {
      if (!repoPath || !filePath) throw new Error("repoPath and filePath are required");
      return api.blame(repoPath, filePath);
    },
    enabled: !!repoPath && !!filePath,
    staleTime: Infinity,
  });
}
