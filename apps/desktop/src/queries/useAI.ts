import { useMutation } from "@tanstack/react-query";
import type { FileChange } from "@/api/tauri";
import type { MergeRequest, MergeRequestFileChange } from "@/api/gitHost";
import {
  generateCommitMessageWithAI,
  reviewDiffWithAI,
  explainCommitWithAI,
  analyzeCommitScope,
  explainMergeRequestWithAI,
  reviewMergeRequestWithAI,
} from "@/lib/ai";

export function useGenerateCommitMessage(repoPath: string | null) {
  return useMutation({
    mutationFn: ({ files }: { files: FileChange[] }) => {
      if (!repoPath) throw new Error("No repository selected");
      return generateCommitMessageWithAI(repoPath, files);
    },
  });
}

export function useAIDiffReview() {
  return useMutation({
    mutationFn: ({ filePath, diff }: { filePath: string; diff: string }) =>
      reviewDiffWithAI(filePath, diff),
  });
}

export function useAICommitExplain() {
  return useMutation({
    mutationFn: ({
      repoPath,
      commitHash,
      commitMessage,
    }: {
      repoPath: string;
      commitHash: string;
      commitMessage: string;
    }) => explainCommitWithAI(repoPath, commitHash, commitMessage),
  });
}

export function useAICommitScope() {
  return useMutation({
    mutationFn: ({ repoPath, files }: { repoPath: string; files: FileChange[] }) =>
      analyzeCommitScope(repoPath, files),
  });
}

export function useAIMergeRequestExplain() {
  return useMutation({
    mutationFn: ({ mergeRequest, files }: { mergeRequest: MergeRequest; files: MergeRequestFileChange[] }) =>
      explainMergeRequestWithAI(mergeRequest, files),
  });
}

export function useAIMergeRequestReview() {
  return useMutation({
    mutationFn: ({ mergeRequest, files }: { mergeRequest: MergeRequest; files: MergeRequestFileChange[] }) =>
      reviewMergeRequestWithAI(mergeRequest, files),
  });
}
