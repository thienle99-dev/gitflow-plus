import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/tauri";

export function useHealthCheck(repoPath: string | null) {
  return useQuery({
    queryKey: ["health", repoPath],
    queryFn: () => api.health.check(repoPath!),
    enabled: !!repoPath,
    staleTime: 0,
  });
}

export function useDiagnostics(repoPath: string | null) {
  return useQuery({
    queryKey: ["diagnostics", repoPath],
    queryFn: () => api.health.diagnostics(repoPath!),
    enabled: !!repoPath,
    staleTime: 0,
  });
}
