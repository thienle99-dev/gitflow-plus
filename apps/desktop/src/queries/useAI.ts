import { useMutation } from "@tanstack/react-query";
import type { FileChange } from "@/api/tauri";
import type { MergeRequest, MergeRequestFileChange } from "@/api/gitHost";
import {
  generateCommitMessageWithAI,
  reviewDiffWithAI,
  explainCommitWithAI,
  reviewCommitWithAI,
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
    mutationFn: ({ filePath, diff, repoPath }: { filePath: string; diff: string; repoPath?: string }) =>
      reviewDiffWithAI(filePath, diff, repoPath),
  });
}

export function useAICommitReview() {
  return useMutation({
    mutationFn: ({
      repoPath,
      commitHash,
      commitMessage,
    }: {
      repoPath: string;
      commitHash: string;
      commitMessage: string;
    }) => reviewCommitWithAI(repoPath, commitHash, commitMessage),
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
    mutationFn: ({ mergeRequest, files, repoPath }: { mergeRequest: MergeRequest; files: MergeRequestFileChange[]; repoPath?: string }) =>
      explainMergeRequestWithAI(mergeRequest, files, repoPath),
  });
}

export function useAIMergeRequestReview() {
  return useMutation({
    mutationFn: ({ mergeRequest, files, repoPath }: { mergeRequest: MergeRequest; files: MergeRequestFileChange[]; repoPath?: string }) =>
      reviewMergeRequestWithAI(mergeRequest, files, repoPath),
  });
}
