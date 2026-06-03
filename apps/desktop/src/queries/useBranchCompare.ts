import { useQuery } from "@tanstack/react-query";
import { api, type BranchComparison } from "@/api/tauri";

export function useBranchCompare(
  repoPath: string | null,
  base: string | null,
  target: string | null,
) {
  return useQuery<BranchComparison>({
    queryKey: ["git", repoPath, "branch-compare", base, target],
    queryFn: () => api.branches.compare(repoPath!, base!, target!),
    enabled: !!repoPath && !!base && !!target,
    staleTime: 30_000,
  });
}

export function useBranchFileDiff(
  repoPath: string | null,
  base: string | null,
  target: string | null,
  filePath: string | null,
) {
  return useQuery<string>({
    queryKey: ["git", repoPath, "branch-file-diff", base, target, filePath],
    queryFn: () => api.branches.fileDiff(repoPath!, base!, target!, filePath!),
    enabled: !!repoPath && !!base && !!target && !!filePath,
    staleTime: 30_000,
  });
}
