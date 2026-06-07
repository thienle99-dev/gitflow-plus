import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type BisectStatus } from "@/api/tauri";

export function useBisectStatus(repoPath: string | null) {
  return useQuery<BisectStatus>({
    queryKey: ["git", repoPath, "bisect", "status"],
    queryFn: () => api.bisect.status(repoPath!),
    enabled: !!repoPath,
    refetchInterval: (query) => query.state.data?.running ? 2000 : false,
  });
}

export function useBisectStart(repoPath: string | null) {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { bad: string; good?: string }>({
    mutationKey: ["git.bisect-start"],
    mutationFn: ({ bad, good }) => api.bisect.start(repoPath!, bad, good),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["git", repoPath] }); },
  });
}

export function useBisectStep(repoPath: string | null, step: "good" | "bad" | "skip") {
  const queryClient = useQueryClient();
  const fn = step === "good" ? api.bisect.good : step === "bad" ? api.bisect.bad : api.bisect.skip;
  return useMutation<BisectStatus, Error, void>({
    mutationKey: ["git.bisect-step", step],
    mutationFn: () => fn(repoPath!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      queryClient.setQueryData(["git", repoPath, "bisect", "status"], data);
    },
  });
}

export function useBisectReset(repoPath: string | null) {
  const queryClient = useQueryClient();
  return useMutation<string, Error, void>({
    mutationKey: ["git.bisect-reset"],
    mutationFn: () => api.bisect.reset(repoPath!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["git", repoPath] }); },
  });
}
