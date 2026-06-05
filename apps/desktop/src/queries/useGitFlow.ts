import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type GitFlowConfig } from "@/api/tauri";

/** Query hook to detect GitFlow configuration for the current repo. */
export function useGitFlowDetect(repoPath: string | null) {
  return useQuery({
    queryKey: ["gitflow", repoPath],
    queryFn: () => {
      if (!repoPath) throw new Error("No repository selected");
      return api.gitflow.detect(repoPath);
    },
    enabled: !!repoPath,
    staleTime: 30_000,
  });
}

/** Mutation hook to initialize GitFlow for the current repo. */
export function useGitFlowInit(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: {
      master: string;
      develop: string;
      featurePrefix: string;
      releasePrefix: string;
      hotfixPrefix: string;
      versiontagPrefix: string;
    }) => {
      if (!repoPath) throw new Error("No repository selected");
      return api.gitflow.init(
        repoPath,
        config.master,
        config.develop,
        config.featurePrefix,
        config.releasePrefix,
        config.hotfixPrefix,
        config.versiontagPrefix,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gitflow", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["branches", repoPath] });
    },
  });
}
