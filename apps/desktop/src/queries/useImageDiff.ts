import { useQuery } from "@tanstack/react-query";
import { api, type ImageContent } from "@/api/tauri";

export interface ImageDiffResult {
  oldImage: ImageContent | null;
  newImage: ImageContent | null;
  loading: boolean;
  error: string | null;
}

/** Given rev strings, fetch both sides of an image diff. */
async function fetchImagePair(
  repoPath: string,
  filePath: string,
  oldRev: string | null,
  newRev: string | null,
): Promise<{ oldImage: ImageContent | null; newImage: ImageContent | null }> {
  const [oldResult, newResult] = await Promise.all([
    oldRev
      ? api.diff.readGitObjectBase64(repoPath, oldRev, filePath)
      : Promise.resolve(null),
    newRev
      ? api.diff.readGitObjectBase64(repoPath, newRev, filePath)
      : Promise.resolve(null),
  ]);
  return { oldImage: oldResult ?? null, newImage: newResult ?? null };
}

export function useImageDiff(
  repoPath: string | null,
  filePath: string | null,
  source: "working" | "staged" | "commit",
  commitHash?: string | null,
) {
  return useQuery<ImageDiffResult>({
    queryKey: ["git", repoPath, "image-diff", source, commitHash || "working", filePath],
    queryFn: async (): Promise<ImageDiffResult> => {
      if (!repoPath || !filePath) return { oldImage: null, newImage: null, loading: false, error: "No file" };

      try {
        let oldRev: string | null = null;
        let newRev: string | null = null;

        switch (source) {
          case "working": {
            // Old = HEAD, new = working tree
            oldRev = "HEAD";
            // Read working tree directly
            const newImg = await api.diff.readWorkingFileBase64(repoPath, filePath);
            let oldImg: ImageContent | null = null;
            try {
              oldImg = await api.diff.readGitObjectBase64(repoPath, "HEAD", filePath);
            } catch { /* file may not exist in HEAD */ }
            return { oldImage: oldImg, newImage: newImg, loading: false, error: null };
          }
          case "staged": {
            // Old = HEAD, new = staged (index)
            oldRev = "HEAD";
            newRev = `:${filePath}`;
            break;
          }
          case "commit": {
            if (!commitHash) return { oldImage: null, newImage: null, loading: false, error: "No commit hash" };
            // Old = parent, new = commit
            oldRev = `${commitHash}^`;
            newRev = commitHash;
            break;
          }
        }

        const result = await fetchImagePair(repoPath, filePath, oldRev, newRev);
        return { ...result, loading: false, error: null };
      } catch (err) {
        return { oldImage: null, newImage: null, loading: false, error: String(err) };
      }
    },
    enabled: !!repoPath && !!filePath,
    staleTime: 60_000,
    gcTime: 60_000,
  });
}
