import { useMutation } from "@tanstack/react-query";
import type { Commit, FileChange, LintDiagnostic } from "@/api/tauri";
import type { MergeRequest, MergeRequestFileChange } from "@/api/gitHost";
import {
  type AIReviewMode,
  type BranchNameSuggestion,
  type ConflictExplanation,
  type MergeStrategyAdvice,
  type CommitSummaryResult,
  type CommitGuardrailResult,
  type CommitReadinessResult,
  type FixPlanResult,
  type GeneratedTagDescription,
  type GuardrailFinding,
  reviewLintIssuesWithAI,
  generateCommitMessageWithAI,
  generateTagDescriptionWithAI,
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
  runCommitGuardrail,
  checkCommitReadiness,
  suggestBranchName,
  generateFixPlan,
} from "@/lib/ai";
import type { CommitLintResult } from "@/lib/commit-lint";

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

export function useGenerateTagDescription(repoPath: string | null) {
  return useMutation<GeneratedTagDescription, Error, {
    tagName: string;
    previousTag?: string;
    targetRef?: string;
    commits: Commit[];
  }>({
    mutationKey: ["ai.generate-tag-description"],
    mutationFn: ({ tagName, previousTag, targetRef, commits }) => {
      if (!repoPath) throw new Error("No repository selected");
      return generateTagDescriptionWithAI({ repoPath, tagName, previousTag, targetRef, commits });
    },
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

export function useAICommitGuardrail(repoPath: string | null) {
  return useMutation<CommitGuardrailResult, Error, {
    files: FileChange[];
    commitMessage: string;
  }>({
    mutationKey: ["ai.commit-guardrail"],
    mutationFn: ({ files, commitMessage }) => {
      if (!repoPath) throw new Error("No repository selected");
      return runCommitGuardrail(repoPath, files, commitMessage);
    },
  });
}

export function useAICommitReadiness(repoPath: string | null) {
  return useMutation<CommitReadinessResult, Error, {
    staged: FileChange[];
    unstaged: FileChange[];
    commitMessage: string;
  }>({
    mutationKey: ["ai.commit-readiness"],
    mutationFn: ({ staged, unstaged, commitMessage }) => {
      if (!repoPath) throw new Error("No repository selected");
      return checkCommitReadiness(repoPath, staged, unstaged, commitMessage);
    },
  });
}

export function useAIBranchSuggestion(repoPath: string | null) {
  return useMutation<BranchNameSuggestion[], Error, {
    files: FileChange[];
  }>({
    mutationKey: ["ai.branch-suggestion"],
    mutationFn: ({ files }) => {
      if (!repoPath) throw new Error("No repository selected");
      return suggestBranchName(repoPath, files);
    },
  });
}

export function useAILintReview(repoPath: string | null) {
  return useMutation<string, Error, {
    commitMessage: string;
    commitIssues: CommitLintResult[];
    codeDiagnostics: LintDiagnostic[];
  }>({
    mutationKey: ["ai.lint-review"],
    mutationFn: (input) => {
      if (!repoPath) throw new Error("No repository selected");
      return reviewLintIssuesWithAI(repoPath, input);
    },
  });
}

export function useAIFixPlan(repoPath: string | null) {
  return useMutation<FixPlanResult, Error, {
    files: FileChange[];
    commitMessage: string;
    findings: GuardrailFinding[];
  }>({
    mutationKey: ["ai.fix-plan"],
    mutationFn: ({ files, commitMessage, findings }) => {
      if (!repoPath) throw new Error("No repository selected");
      return generateFixPlan(repoPath, files, commitMessage, findings);
    },
  });
}
