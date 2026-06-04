import { useMutation } from "@tanstack/react-query";
import type { FileChange } from "@/api/tauri";
import type { MergeRequest, MergeRequestFileChange } from "@/api/gitHost";
import {
  type AIReviewMode,
  type ConflictExplanation,
  type MergeStrategyAdvice,
  type CommitSummaryResult,
  generateCommitMessageWithAI,
  reviewDiffWithAI,
  generateInlineReviewComments,
  explainCommitWithAI,
  explainConflictWithAI,
  reviewCommitWithAI,
  analyzeCommitScope,
  explainMergeRequestWithAI,
  reviewMergeRequestWithAI,
  improveCommitMessage,
  addCommitBody,
  adviseMergeStrategy,
  generateCommitSummary,
} from "@/lib/ai";

export function useGenerateCommitMessage(repoPath: string | null) {
  return useMutation({
    mutationKey: ["ai.generate-commit"],
    mutationFn: ({ files }: { files: FileChange[] }) => {
      if (!repoPath) throw new Error("No repository selected");
      return generateCommitMessageWithAI(repoPath, files);
    },
  });
}

export function useAIDiffReview() {
  return useMutation({
    mutationKey: ["ai.diff-review"],
    mutationFn: ({ filePath, diff, repoPath, mode }: { filePath: string; diff: string; repoPath?: string; mode?: AIReviewMode }) =>
      reviewDiffWithAI(filePath, diff, repoPath, mode),
  });
}

export function useAIInlineComments() {
  return useMutation({
    mutationKey: ["ai.inline-comments"],
    mutationFn: ({ filePath, diff, repoPath, mode }: { filePath: string; diff: string; repoPath?: string; mode?: AIReviewMode }) =>
      generateInlineReviewComments(filePath, diff, repoPath, mode),
  });
}

export function useAICommitReview() {
  return useMutation({
    mutationKey: ["ai.commit-review"],
    mutationFn: ({
      repoPath,
      commitHash,
      commitMessage,
      mode,
    }: {
      repoPath: string;
      commitHash: string;
      commitMessage: string;
      mode?: AIReviewMode;
    }) => reviewCommitWithAI(repoPath, commitHash, commitMessage, mode),
  });
}

export function useAICommitExplain() {
  return useMutation({
    mutationKey: ["ai.commit-explain"],
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
    mutationKey: ["ai.commit-scope"],
    mutationFn: ({ repoPath, files }: { repoPath: string; files: FileChange[] }) =>
      analyzeCommitScope(repoPath, files),
  });
}

export function useAIMergeRequestExplain() {
  return useMutation({
    mutationKey: ["ai.mr-explain"],
    mutationFn: ({ mergeRequest, files, repoPath }: { mergeRequest: MergeRequest; files: MergeRequestFileChange[]; repoPath?: string }) =>
      explainMergeRequestWithAI(mergeRequest, files, repoPath),
  });
}

export function useAIMergeRequestReview() {
  return useMutation({
    mutationKey: ["ai.mr-review"],
    mutationFn: ({ mergeRequest, files, repoPath, mode }: { mergeRequest: MergeRequest; files: MergeRequestFileChange[]; repoPath?: string; mode?: AIReviewMode }) =>
      reviewMergeRequestWithAI(mergeRequest, files, repoPath, mode),
  });
}

export function useAIConflictExplain() {
  return useMutation({
    mutationKey: ["ai.conflict-explain"],
    mutationFn: ({
      filePath,
      ours,
      theirs,
      contextBefore,
      contextAfter,
      repoPath,
    }: {
      filePath: string;
      ours: string[];
      theirs: string[];
      contextBefore: string[];
      contextAfter: string[];
      repoPath?: string;
    }): Promise<ConflictExplanation> =>
      explainConflictWithAI(filePath, ours, theirs, contextBefore, contextAfter, repoPath),
  });
}

export function useImproveCommitMessage(repoPath: string | null) {
  return useMutation({
    mutationKey: ["ai.improve-message"],
    mutationFn: ({
      currentMessage,
      files,
    }: {
      currentMessage: string;
      files: FileChange[];
    }) => {
      if (!repoPath) throw new Error("No repository selected");
      return improveCommitMessage(repoPath, currentMessage, files);
    },
  });
}

export function useAIMergeStrategyAdvice(repoPath: string | null) {
  return useMutation<MergeStrategyAdvice, Error, {
    currentBranch: string;
    targetBranch: string;
    ahead: number;
    behind: number;
    incomingCommits: Array<{ hash: string; message: string; author: string }>;
    changedFiles: Array<{ path: string; status: string; additions: number; deletions: number }>;
  }>({
    mutationKey: ["ai.merge-strategy-advice"],
    mutationFn: ({
      currentBranch,
      targetBranch,
      ahead,
      behind,
      incomingCommits,
      changedFiles,
    }) => {
      if (!repoPath) throw new Error("No repository selected");
      return adviseMergeStrategy(repoPath, currentBranch, targetBranch, ahead, behind, incomingCommits, changedFiles);
    },
  });
}

export function useAICommitSummary() {
  return useMutation<CommitSummaryResult, Error, {
    commits: Array<{ hash: string; message: string; date: string; author: string }>;
    timeRange: string;
  }>({
    mutationKey: ["ai.commit-summary"],
    mutationFn: ({ commits, timeRange }) => generateCommitSummary(commits, timeRange),
  });
}

export function useAddCommitBody(repoPath: string | null) {
  return useMutation({
    mutationKey: ["ai.add-body"],
    mutationFn: ({
      subject,
      files,
    }: {
      subject: string;
      files: FileChange[];
    }) => {
      if (!repoPath) throw new Error("No repository selected");
      return addCommitBody(repoPath, subject, files);
    },
  });
}
