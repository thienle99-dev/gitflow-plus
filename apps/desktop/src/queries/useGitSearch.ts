import { useQuery } from "@tanstack/react-query";
import { api, type Commit } from "@/api/tauri";

export interface SearchOptions {
  query?: string;
  author?: string;
  file?: string;
  since?: string;
  until?: string;
  maxCount?: number;
  branch?: string;
}

export function useGitSearch(repoPath: string | null, opts: SearchOptions) {
  const { query, author, file, since, until, maxCount, branch } = opts;
  const hasFilters = !!query || !!author || !!file || !!since || !!until || !!branch;

  return useQuery<Commit[]>({
    queryKey: ["git", repoPath, "search", { query, author, file, since, until, maxCount, branch }],
    queryFn: () =>
      api.search(repoPath!, {
        query,
        author,
        file,
        since,
        until,
        maxCount,
        branch,
      }),
    enabled: !!repoPath && hasFilters,
    staleTime: 30_000,
  });
}
