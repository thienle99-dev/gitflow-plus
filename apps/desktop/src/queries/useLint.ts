import { useQuery } from "@tanstack/react-query";
import { api, type LintResponse } from "@/api/tauri";

export function useProjectLint(repoPath: string | null, enabled: boolean = true) {
  return useQuery<LintResponse, Error>({
    queryKey: ["git", repoPath, "project-lint"],
    queryFn: () => api.lint.run(repoPath!),
    enabled: !!repoPath && enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
