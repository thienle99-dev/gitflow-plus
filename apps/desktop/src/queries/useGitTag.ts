import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Tag } from "@/api/tauri";

export function useTagList(repoPath: string | null) {
  return useQuery<Tag[]>({
    queryKey: ["git", repoPath, "tags"],
    queryFn: () => api.tag.list(repoPath!),
    enabled: !!repoPath,
    staleTime: 30_000,
  });
}

export function useTagCreate(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { name: string; target?: string; message?: string }>({
    mutationFn: ({ name, target, message }) =>
      api.tag.create(repoPath!, name, target, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useTagDelete(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { name: string }>({
    mutationFn: ({ name }) => api.tag.delete(repoPath!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}

export function useTagPush(repoPath: string | null) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { name: string; remote?: string }>({
    mutationFn: ({ name, remote }) => api.tag.push(repoPath!, name, remote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    },
  });
}
