import { useState, useRef, useEffect, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitDiff, useGitStatus } from "@/queries/useGitLog";
import { api, type FileChange, type LintDiagnostic } from "@/api/tauri";
import { useGenerateCommitMessage, useAICommitScope, useAIDiffReview, useImproveCommitMessage, useAddCommitBody, useAICommitGuardrail, useAICommitReadiness, useAILintReview } from "@/queries/useAI";
import { generateLocalCommitMessage, shouldAnalyzeScope, type CommitScopeSuggestion, type CommitGuardrailResult, type CommitReadinessResult } from "@/lib/ai";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import { fileIcon, statusLabel, statusColor } from "@/components/ui/shared";
import ContextMenu, { type ContextMenuItem } from "@/components/ui/overlay/ContextMenu";
import LazyDiffViewer from "@/components/features/diff/LazyDiffViewer";
import { AlertCircle, Clipboard, ShieldAlert, MessageSquare } from "lucide-react";
import { lintCommitMessage, autoFixCommitMessage, type CommitLintResult } from "@/lib/commit-lint";
import { LintWarningDialog } from "@/components/features/dialogs";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Maximize2,
} from "lucide-react";
import FileChangeList from "./FileChangeList";
import CommitBox from "./CommitBox";

export default function WorkingTree() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const selectedFileStage = useUIStore((s) => s.selectedFileStage);
  const selectFile = useUIStore((s) => s.selectFile);
  const { data: changes } = useGitStatus(repoPath);
  const queryClient = useQueryClient();
  const generateCommit = useGenerateCommitMessage(repoPath);
  const commitScope = useAICommitScope();
  const aiReview = useAIDiffReview();
  const improveMessage = useImproveCommitMessage(repoPath);
  const addBody = useAddCommitBody(repoPath);
  const guardrail = useAICommitGuardrail(repoPath);
  const readiness = useAICommitReadiness(repoPath);
  const lintReview = useAILintReview(repoPath);
  const [commitMessage, setCommitMessage] = useState("");
  const [lintResults, setLintResults] = useState<CommitLintResult[]>([]);

  const runLint = useCallback(() => {
    const isCommitLintEnabled = localStorage.getItem("gitflowCommitLintEnabled") !== "false";
    if (isCommitLintEnabled && commitMessage) {
      setLintResults(lintCommitMessage(commitMessage));
    } else {
      setLintResults([]);
    }
  }, [commitMessage]);

  useEffect(() => {
    runLint();
  }, [commitMessage, runLint]);

  useEffect(() => {
    window.addEventListener("gitflow-settings-updated", runLint);
    return () => {
      window.removeEventListener("gitflow-settings-updated", runLint);
    };
  }, [runLint]);
  const [amend, setAmend] = useState(false);
  const [scopeSuggestion, setScopeSuggestion] = useState<CommitScopeSuggestion | null>(null);
  const [scopeDismissed, setScopeDismissed] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committingGroupKey, setCommittingGroupKey] = useState<string | null>(null);
  const [scopeAnalyzing, setScopeAnalyzing] = useState(false);
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewCollapsed, setAiReviewCollapsed] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState("");
  const [aiReviewModalOpen, setAiReviewModalOpen] = useState(false);
  const [guardrailResult, setGuardrailResult] = useState<CommitGuardrailResult | null>(null);
  const [guardrailOpen, setGuardrailOpen] = useState(false);
  const [readinessResult, setReadinessResult] = useState<CommitReadinessResult | null>(null);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [lintReviewResult, setLintReviewResult] = useState("");
  const [lintReviewOpen, setLintReviewOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState<string | null>(null);
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file: FileChange; stage: "staged" | "unstaged" } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<DiffReviewTarget | null>(null);
  // Multi-select for batch stage/unstage
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  const [isTreeView, setIsTreeView] = useState(() => {
    return localStorage.getItem("gitflowTreeViewMode") !== "false";
  });

  const toggleTreeView = () => {
    setIsTreeView((prev) => {
      const next = !prev;
      localStorage.setItem("gitflowTreeViewMode", next ? "true" : "false");
      window.dispatchEvent(new Event("gitflow-viewmode-updated"));
      return next;
    });
  };

  useEffect(() => {
    const handleViewModeUpdate = () => {
      setIsTreeView(localStorage.getItem("gitflowTreeViewMode") !== "false");
    };
    window.addEventListener("gitflow-viewmode-updated", handleViewModeUpdate);
    return () => {
      window.removeEventListener("gitflow-viewmode-updated", handleViewModeUpdate);
    };
  }, []);

  // Pre-Commit Gate States
  const [lintWarningOpen, setLintWarningOpen] = useState(false);
  const [pendingCommitMessage, setPendingCommitMessage] = useState("");
  const [pendingAmend, setPendingAmend] = useState(false);
  const [gateCommitErrors, setGateCommitErrors] = useState<CommitLintResult[]>([]);
  const [gateCodeDiagnostics, setGateCodeDiagnostics] = useState<LintDiagnostic[]>([]);
  const [gateStrictness, setGateStrictness] = useState<"strict" | "warn">("warn");
  const [lintRunning, setLintRunning] = useState(false);

  const staged = changes?.filter((c) => c.staged) || [];
  const unstaged = changes?.filter((c) => !c.staged) || [];
  const reviewFiles: DiffReviewTarget[] = [
    ...staged.map((file) => ({ path: file.path, stage: "staged" as const, status: file.status })),
    ...unstaged.map((file) => ({ path: file.path, stage: "unstaged" as const, status: file.status })),
  ];
  const aiReviewTagCount = countAIReviewTags(aiReviewResult);

  const openDiffReview = (path: string, stage: "staged" | "unstaged", autoInlineReview = false) => {
    const target = reviewFiles.find((file) => file.path === path && file.stage === stage) || { path, stage };
    setReviewTarget({ ...target, autoInlineReview });
  };

  const openInlineReview = (path: string, stage: "staged" | "unstaged") => {
    openDiffReview(path, stage, true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
  };

  const handleStage = async (filePath: string) => {
    try {
      await api.commit.stage(repoPath!, filePath);
      if (selectedFile === filePath) {
        selectFile(filePath, "staged");
      }
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleUnstage = async (filePath: string) => {
    try {
      await api.commit.unstage(repoPath!, filePath);
      if (selectedFile === filePath) {
        selectFile(filePath, "unstaged");
      }
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleStageAll = async () => {
    try {
      await api.commit.stageAll(repoPath!);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleUnstageAll = async () => {
    try {
      await api.commit.unstageAll(repoPath!);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const doDiscard = async (filePath: string) => {
    setConfirmDiscard(null);
    try {
      await api.commit.discard(repoPath!, filePath);
      if (selectedFile === filePath) {
        selectFile(null);
      }
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const doDiscardAll = async () => {
    setConfirmDiscardAll(false);
    try {
      await api.commit.discardAll(repoPath!);
      selectFile(null);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  // Multi-select for batch stage/unstage
  const handleFileClick = (filePath: string, e: React.MouseEvent) => {
    const currentList = [...staged, ...unstaged];
    if (e.shiftKey && lastClickedRef.current) {
      const currentIdx = currentList.findIndex(f => f.path === filePath);
      const lastIdx = currentList.findIndex(f => f.path === lastClickedRef.current);
      if (currentIdx !== -1 && lastIdx !== -1) {
        const [start, end] = currentIdx > lastIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
        const newSet = new Set(selectedFiles);
        for (let i = start; i <= end; i++) {
          newSet.add(currentList[i].path);
        }
        setSelectedFiles(newSet);
        return; // handled — don't also select file for diff
      }
    }
    // Simple toggle if shift not held
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
    lastClickedRef.current = filePath;
  };

  const handleBatchStage = async () => {
    if (selectedFiles.size === 0) return;
    try {
      for (const path of selectedFiles) {
        await api.commit.stage(repoPath!, path);
      }
      setSelectedFiles(new Set());
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleBatchUnstage = async () => {
    if (selectedFiles.size === 0) return;
    try {
      for (const path of selectedFiles) {
        await api.commit.unstage(repoPath!, path);
      }
      setSelectedFiles(new Set());
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const performActualCommit = async (msg: string, isAmend: boolean) => {
    setCommitting(true);
    try {
      if (staged.length === 0 && unstaged.length > 0) {
        await api.commit.stageAll(repoPath!);
      }
      const result = await api.commit.commit(repoPath!, msg, isAmend);
      showToast(result);
      setCommitMessage("");
      setAmend(false);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    } finally {
      setCommitting(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;

    const commitLintEnabled = localStorage.getItem("gitflowCommitLintEnabled") !== "false";
    const codeLintEnabled = localStorage.getItem("gitflowCodeLintEnabled") === "true";
    const strictness = (localStorage.getItem("gitflowLintStrictness") || "warn") as "strict" | "warn";

    let msgErrors: CommitLintResult[] = [];
    let codeIssues: LintDiagnostic[] = [];

    const filesToLintExist = staged.length > 0 || unstaged.length > 0;

    if (commitLintEnabled) {
      msgErrors = lintCommitMessage(commitMessage);
    }

    if (codeLintEnabled && filesToLintExist) {
      setLintRunning(true);
      try {
        if (staged.length === 0 && unstaged.length > 0) {
          await api.commit.stageAll(repoPath!);
          invalidate();
        }
        const res = await api.lint.run(repoPath!);
        codeIssues = res.diagnostics;
      } catch (err) {
        console.error("Linter execution failed:", err);
      } finally {
        setLintRunning(false);
      }
    }

    const hasErrors = msgErrors.some(e => e.severity === "error") || codeIssues.some(d => d.severity === "error");
    const hasWarnings = msgErrors.some(e => e.severity === "warning") || codeIssues.some(d => d.severity === "warning");

    if (hasErrors || hasWarnings) {
      setGateCommitErrors(msgErrors);
      setGateCodeDiagnostics(codeIssues);
      setGateStrictness(strictness);
      setPendingCommitMessage(commitMessage);
      setPendingAmend(amend);
      setLintWarningOpen(true);
      return;
    }

    await performActualCommit(commitMessage, amend);
  };

  const handleLintReview = async (source?: {
    commitMessage?: string;
    commitIssues?: CommitLintResult[];
    codeDiagnostics?: LintDiagnostic[];
  }) => {
    if (!repoPath || lintReview.isPending) return;

    const commitIssues = source?.commitIssues ?? lintResults;
    const codeDiagnostics = source?.codeDiagnostics ?? [];
    if (commitIssues.length === 0 && codeDiagnostics.length === 0) {
      showToast("No lint issues to review", "info");
      return;
    }

    setLintReviewOpen(true);
    setLintReviewResult("");
    lintReview.reset();

    try {
      const result = await lintReview.mutateAsync({
        commitMessage: source?.commitMessage ?? commitMessage,
        commitIssues,
        codeDiagnostics,
      });
      setLintReviewResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI lint review failed";
      showToast(message, "error");
    }
  };

  const handleAIReview = async () => {
    if (!repoPath || aiReview.isPending) return;
    if (aiReviewOpen && aiReviewResult) {
      setAiReviewOpen(false);
      return;
    }

    const hasStaged = staged.length > 0;
    const filesToReview = hasStaged ? staged : unstaged;
    if (filesToReview.length === 0) {
      showToast("No changes to review", "info");
      return;
    }

    setAiReviewOpen(true);
    setAiReviewCollapsed(false);
    setAiReviewResult("");
    aiReview.reset();

    try {
      const diff = hasStaged
        ? await api.diff.staged(repoPath)
        : (await Promise.all(filesToReview.slice(0, 20).map((file) => api.diff.file(repoPath, file.path).catch(() => "")))).filter(Boolean).join("\n\n");

      if (!diff.trim()) {
        showToast("No diff found for AI review", "info");
        setAiReviewOpen(false);
        return;
      }

      const result = await aiReview.mutateAsync({
        filePath: hasStaged ? "Staged changes" : "Working tree changes",
        diff,
        repoPath,
        mode: "custom",
      });
      setAiReviewResult(result);
    } catch (err: any) {
      showToast(`AI review failed: ${err?.message || err}`, "error");
    }
  };

  const handleGuardrail = async () => {
    if (!repoPath || guardrail.isPending) return;
    const filesToCheck = staged.length > 0 ? staged : unstaged;
    if (filesToCheck.length === 0) {
      showToast("No changes to check", "info");
      return;
    }
    setGuardrailOpen(true);
    setGuardrailResult(null);
    guardrail.reset();
    try {
      const result = await guardrail.mutateAsync({
        files: filesToCheck,
        commitMessage,
      });
      setGuardrailResult(result);
    } catch (err: any) {
      showToast(`Guardrail check failed: ${err?.message || err}`, "error");
    }
  };

  const handleReadiness = async () => {
    if (!repoPath || readiness.isPending) return;
    setReadinessOpen(true);
    setReadinessResult(null);
    readiness.reset();
    try {
      const result = await readiness.mutateAsync({
        staged,
        unstaged,
        commitMessage,
      });
      setReadinessResult(result);
    } catch (err: any) {
      showToast(`Readiness check failed: ${err?.message || err}`, "error");
    }
  };

  const handleUseGroup = async (group: { files: string[]; message: string }) => {
    try {
      await api.commit.unstageAll(repoPath!);
      for (const filePath of group.files) {
        await api.commit.stage(repoPath!, filePath);
      }
      setCommitMessage(group.message);
      setScopeSuggestion((prev) => {
        if (!prev) return null;
        const remaining = prev.groups.filter((g) => g.message !== group.message);
        if (remaining.length <= 1) return null;
        return { ...prev, groups: remaining };
      });
      showToast(`Staged ${group.files.length} files for this commit. Press Commit or ⌘↵`);
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const handleCommitGroup = async (group: { files: string[]; message: string }) => {
    if (!repoPath || committingGroupKey || committing) return;
    const groupKey = group.message;
    setCommittingGroupKey(groupKey);
    setCommitting(true);
    try {
      await api.commit.unstageAll(repoPath);
      for (const filePath of group.files) {
        await api.commit.stage(repoPath, filePath);
      }
      const result = await api.commit.commit(repoPath, group.message, false);
      setCommitMessage("");
      setAmend(false);
      setScopeSuggestion((prev) => {
        if (!prev) return null;
        const remaining = prev.groups.filter((g) => g.message !== group.message);
        if (remaining.length <= 1) return null;
        return { ...prev, groups: remaining };
      });
      showToast(result || `Committed ${group.files.length} files`);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    } finally {
      setCommitting(false);
      setCommittingGroupKey(null);
    }
  };

  const handleCommitAllSuggested = async () => {
    if (!repoPath || !scopeSuggestion || committingGroupKey || committing) return;
    setCommittingGroupKey("__all__");
    setCommitting(true);
    try {
      for (const group of scopeSuggestion.groups) {
        await api.commit.unstageAll(repoPath);
        for (const filePath of group.files) {
          await api.commit.stage(repoPath, filePath);
        }
        await api.commit.commit(repoPath, group.message, false);
      }
      setCommitMessage("");
      setAmend(false);
      setScopeSuggestion(null);
      setScopeDismissed(true);
      showToast(`Committed ${scopeSuggestion.groups.length} suggested commits`);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    } finally {
      setCommitting(false);
      setCommittingGroupKey(null);
    }
  };

  const handleGenerateCommit = async () => {
    if (generateCommit.isPending) return;
    if (!changes || changes.length === 0) {
      showToast("No changes to generate a commit message", "info");
      return;
    }

    setScopeSuggestion(null);
    setScopeDismissed(false);

    showToast("Generating commit message for all changes...", "info");
    try {
      const result = await generateCommit.mutateAsync({ files: changes });
      setCommitMessage(result.message);
      showToast(result.fallback ? `Generated message using local template${result.reason ? ` (${result.reason})` : ""}` : "AI commit message generated");

      // Run scope analysis in background (non-blocking)
      if (!result.fallback && changes.length > 0) {
        commitScope.mutateAsync({ repoPath: repoPath!, files: changes }).then((scope) => {
          if (scope?.shouldSplit && scope.groups.length > 1) {
            setScopeSuggestion(scope);
          }
        }).catch(() => {
          // Silent failure — scope analysis is optional
        });
      }
    } catch (err: any) {
      setCommitMessage(generateLocalCommitMessage(changes));
      showToast(`AI failed: ${err.message || err}. Used local fallback.`, "error");
    }
  };

  const handleAnalyzeScope = async () => {
    if (!repoPath || scopeAnalyzing || commitScope.isPending) return;
    if (staged.length === 0) {
      showToast("Stage some files first to analyze scope", "info");
      return;
    }
    setScopeAnalyzing(true);
    setScopeDismissed(false);
    setScopeSuggestion(null);
    showToast("Analyzing commit scope...", "info");
    try {
      const scope = await commitScope.mutateAsync({ repoPath, files: changes || staged });
      if (scope?.shouldSplit && scope.groups.length > 1) {
        setScopeSuggestion(scope);
        showToast(`AI suggests splitting into ${scope.groups.length} commits`);
      } else {
        showToast("Changes look cohesive — single commit is fine");
      }
    } catch {
      showToast("Scope analysis failed", "error");
    } finally {
      setScopeAnalyzing(false);
    }
  };

  const handleImproveMessage = async () => {
    if (improveMessage.isPending || !commitMessage.trim()) return;
    if (staged.length === 0) {
      showToast("Stage some files first to improve the message", "info");
      return;
    }
    showToast("Improving commit message...", "info");
    try {
      const result = await improveMessage.mutateAsync({
        currentMessage: commitMessage,
        files: staged,
      });
      setCommitMessage(result);
      showToast("Commit message improved");
    } catch (err: any) {
      showToast(`AI failed: ${err.message || err}`, "error");
    }
  };

  const handleAddBody = async () => {
    if (addBody.isPending || !commitMessage.trim()) return;
    if (staged.length === 0) {
      showToast("Stage some files first to add a body", "info");
      return;
    }
    showToast("Generating commit body...", "info");
    try {
      const result = await addBody.mutateAsync({
        subject: commitMessage.split("\n")[0],
        files: staged,
      });
      setCommitMessage(result);
      showToast("Commit body added");
    } catch (err: any) {
      showToast(`AI failed: ${err.message || err}`, "error");
    }
  };

  // Auto-trigger scope analysis when staged files cross threshold (≥5 files across ≥2 dirs)
  const prevStagedCountRef = useRef(0);
  useEffect(() => {
    const prevCount = prevStagedCountRef.current;
    prevStagedCountRef.current = staged.length;
    if (staged.length >= 5 && prevCount < 5 && !scopeSuggestion && !scopeAnalyzing && !commitScope.isPending) {
      if (shouldAnalyzeScope(staged)) {
        handleAnalyzeScope();
      }
    }
  }, [staged.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && commitMessage.trim()) {
        handleCommit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [commitMessage, repoPath, handleCommit]);

  const ctxItems: ContextMenuItem[] = ctxMenu
    ? [
      {
        label: "View diff",
        action: () => openDiffReview(ctxMenu.file.path, ctxMenu.stage),
      },
      {
        label: "AI Inline Review",
        icon: <MessageSquare size={13} />,
        action: () => openInlineReview(ctxMenu.file.path, ctxMenu.stage),
      },
      {
        label: ctxMenu.stage === "staged" ? "Unstage file" : "Stage file",
        icon: <Check size={13} />,
        action: () =>
          ctxMenu.stage === "staged"
            ? handleUnstage(ctxMenu.file.path)
            : handleStage(ctxMenu.file.path),
      },
      {
        label: "Discard changes",
        icon: <Trash2 size={13} />,
        action: () => setConfirmDiscard(ctxMenu.file.path),
      },
    ]
    : [];

  const handleToggleAllSections = () => {
    if (stagedOpen || unstagedOpen) {
      setStagedOpen(false);
      setUnstagedOpen(false);
    } else {
      setStagedOpen(true);
      setUnstagedOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      <FileChangeList
        staged={staged}
        unstaged={unstaged}
        selectedFile={selectedFile}
        selectedFileStage={selectedFileStage}
        selectedFiles={selectedFiles}
        isTreeView={isTreeView}
        stagedOpen={stagedOpen}
        unstagedOpen={unstagedOpen}
        reviewTargetPath={reviewTarget?.path}
        reviewTargetStage={reviewTarget?.stage}
        onStage={handleStage}
        onUnstage={handleUnstage}
        onStageAll={handleStageAll}
        onUnstageAll={handleUnstageAll}
        onSelectFile={(path, stage) => openDiffReview(path, stage)}
        onAIInlineReview={(path, stage) => openInlineReview(path, stage)}
        onContextMenu={(x, y, file, stage) => setCtxMenu({ x, y, file, stage })}
        onFileMultiClick={handleFileClick}
        onRefresh={invalidate}
        onToggleTreeView={toggleTreeView}
        onToggleAllSections={handleToggleAllSections}
        onToggleStagedOpen={() => setStagedOpen((open) => !open)}
        onToggleUnstagedOpen={() => setUnstagedOpen((open) => !open)}
        onSetConfirmDiscardAll={setConfirmDiscardAll}
        onBatchStage={handleBatchStage}
        onBatchUnstage={handleBatchUnstage}
        onClearSelected={() => setSelectedFiles(new Set())}
      />

      {aiReviewOpen && (
        <div className={`${aiReviewCollapsed ? "shrink-0 px-3 py-2" : "flex-1 min-h-0 px-3 py-2"} border-t border-border-60`}>
          <div className={`h-full border border-accent-30 bg-surface-1 overflow-hidden transition-all ${aiReviewCollapsed ? "rounded-[5px] shadow-2xs" : "rounded-mac shadow-lg shadow-black/10 flex flex-col"}`}>
            <div className={`flex items-center justify-between gap-2 select-none shrink-0 ${aiReviewCollapsed ? "px-2 py-1 bg-surface-2-30" : "px-3 py-1.5 border-b border-border-40 bg-accent-5"}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles size={aiReviewCollapsed ? 11 : 13} className="text-accent shrink-0" />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`${aiReviewCollapsed ? "text-[10px]" : "text-[11px]"} font-bold text-text-primary`}>AI Review</span>
                  <span className="text-[9px] font-semibold text-accent bg-accent-10 border border-accent-20 rounded px-1.5 py-0.5 leading-none shrink-0">
                    {staged.length > 0 ? `${staged.length} staged` : `${unstaged.length} unstaged`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {aiReviewTagCount > 0 && (
                  <span className="mr-1 text-[9px] font-semibold text-text-secondary bg-surface-2 border border-border-40 rounded px-1.5 py-0.5 leading-none">
                    {aiReviewTagCount} tagged
                  </span>
                )}
                {!aiReview.isPending && aiReviewResult && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(aiReviewResult);
                        showToast("Copied to clipboard", "success");
                      } catch {
                        showToast("Failed to copy", "error");
                      }
                    }}
                    className={`${aiReviewCollapsed ? "h-5 w-5" : "h-6 w-6"} inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer`}
                    title="Copy AI review"
                  >
                    <Clipboard size={aiReviewCollapsed ? 11 : 12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAiReviewModalOpen(true)}
                  className={`${aiReviewCollapsed ? "h-5 w-5" : "h-6 w-6"} inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer`}
                  title="Open full AI review modal"
                >
                  <Maximize2 size={aiReviewCollapsed ? 11 : 12} />
                </button>
                <button
                  type="button"
                  onClick={() => setAiReviewCollapsed((collapsed) => !collapsed)}
                  className={`${aiReviewCollapsed ? "h-5 w-5" : "h-6 w-6"} inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer`}
                  title={aiReviewCollapsed ? "Show AI review details" : "Hide AI review details"}
                >
                  <ChevronDown size={aiReviewCollapsed ? 11 : 13} className={`transition-transform duration-200 ${aiReviewCollapsed ? "-rotate-90" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setAiReviewOpen(false)}
                  className={`${aiReviewCollapsed ? "h-5 w-5" : "h-6 w-6"} inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer`}
                  title="Close AI review"
                >
                  <X size={aiReviewCollapsed ? 11 : 13} />
                </button>
              </div>
            </div>
            {!aiReviewCollapsed && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 text-xs leading-relaxed text-text-secondary space-y-2">
                {aiReview.isPending ? (
                  <div className="flex items-center gap-2 rounded-mac border border-accent-20 bg-accent-5 px-3 py-2.5 text-text-secondary">
                    <RefreshCw size={13} className="animate-spin text-accent" />
                    <span>Reviewing changes with AI...</span>
                  </div>
                ) : aiReview.isError ? (
                  <div className="rounded-mac border border-[#ff453a]/25 bg-[#ff453a]/10 px-3 py-2 text-[#ff453a]">
                    {aiReview.error instanceof Error ? aiReview.error.message : "AI review failed"}
                  </div>
                ) : aiReviewResult ? (
                  aiReviewResult.split("\n").map((line, index) => <AIReviewLine key={index} line={line} />)
                ) : (
                  <span className="text-text-muted">No review result yet.</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <CommitBox
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        lintResults={lintResults}
        staged={staged}
        unstaged={unstaged}
        committing={committing}
        lintRunning={lintRunning}
        amend={amend}
        setAmend={setAmend}
        scopeSuggestion={scopeSuggestion}
        scopeDismissed={scopeDismissed}
        setScopeDismissed={setScopeDismissed}
        scopeAnalyzing={scopeAnalyzing}
        committingGroupKey={committingGroupKey}
        onCommit={handleCommit}
        onGenerateCommit={handleGenerateCommit}
        onAnalyzeScope={handleAnalyzeScope}
        onAIReview={handleAIReview}
        onGuardrail={handleGuardrail}
        onReadiness={handleReadiness}
        onUseGroup={handleUseGroup}
        onCommitGroup={handleCommitGroup}
        onCommitAllSuggested={handleCommitAllSuggested}
        onUndoComplete={invalidate}
        onImproveMessage={handleImproveMessage}
        onAddBody={handleAddBody}
        onLintReview={() => handleLintReview()}
        aiReviewPending={aiReview.isPending}
        lintReviewPending={lintReview.isPending}
        lintReviewResult={lintReviewResult}
        lintReviewOpen={lintReviewOpen}
        setLintReviewOpen={setLintReviewOpen}
        guardrailPending={guardrail.isPending}
        guardrailResult={guardrailResult}
        guardrailOpen={guardrailOpen}
        setGuardrailOpen={setGuardrailOpen}
        readinessPending={readiness.isPending}
        readinessResult={readinessResult}
        readinessOpen={readinessOpen}
        setReadinessOpen={setReadinessOpen}
        generateCommitPending={generateCommit.isPending}
        commitScopePending={commitScope.isPending}
        improveMessagePending={improveMessage.isPending}
        addBodyPending={addBody.isPending}
      />

      {reviewTarget && (
        <DiffReviewModal
          target={reviewTarget}
          files={reviewFiles}
          onChangeTarget={setReviewTarget}
          onClose={() => setReviewTarget(null)}
          onRefresh={invalidate}
        />
      )}

      {aiReviewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setAiReviewModalOpen(false)}>
          <div
            className="bg-surface-0 rounded-[6px] shadow-2xl border border-border-60 overflow-hidden w-[min(900px,95vw)] h-[600px] max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-30 bg-surface-1-40 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-[12px] font-bold text-text-primary">AI Review Report</span>
                <span className="text-[10px] text-text-muted">
                  · {staged.length > 0 ? `${staged.length} staged` : `${unstaged.length} unstaged`} changes
                </span>
              </div>
              <button
                onClick={() => setAiReviewModalOpen(false)}
                className="p-1 hover:bg-surface-2 rounded-[4px] transition-colors cursor-pointer text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4 min-h-0 flex flex-col">
              <div className="flex gap-3 p-3.5 bg-gradient-to-br from-accent-5 to-surface-1 border border-accent-20 rounded-[4px] shrink-0">
                <div className="h-7 w-7 rounded-full bg-accent-15 border border-accent-20 flex items-center justify-center text-accent shrink-0">
                  <Sparkles size={13} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-text-primary">GitFlow Assistant</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Here is the comprehensive AI analysis for your current code changes:
                  </p>
                </div>
              </div>

              <div className="flex-1 text-[11px] text-text-secondary bg-surface-1 border border-border-30 rounded-[4px] p-4 whitespace-pre-wrap leading-relaxed overflow-y-auto font-sans">
                {aiReviewResult ? (
                  aiReviewResult.split("\n").map((line, index) => <AIReviewLine key={index} line={line} />)
                ) : (
                  <span className="text-text-muted">No review result yet.</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-30 bg-surface-1-40 shrink-0 select-none">
              <button
                onClick={() => setAiReviewModalOpen(false)}
                className="px-3.5 py-1.5 text-[11px] font-semibold text-white bg-accent hover:bg-accent-90 rounded-[4px] transition-colors cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDiscard !== null}
        title="Discard Changes"
        message={`Discard all changes to this file? The file will be reverted to its last committed state.`}
        impactItems={[
          {
            label: "File will be reverted to last committed state",
            severity: "irreversible",
            details: confirmDiscard ? [confirmDiscard] : undefined,
          },
          {
            label: "All local modifications (staged and unstaged) will be permanently lost",
            severity: "irreversible",
          },
        ]}
        variant="destructive"
        confirmLabel="Discard"
        onConfirm={() => doDiscard(confirmDiscard!)}
        onCancel={() => setConfirmDiscard(null)}
      />
      <ConfirmDialog
        open={confirmDiscardAll}
        title="Discard All Changes"
        message={`Discard all working tree changes across ${changes?.length ?? 0} file(s), including untracked files?`}
        impactItems={[
          {
            label: `${staged.length} staged file(s) will be unstaged and reverted`,
            severity: "irreversible",
            details: staged.length > 0 ? staged.map((f) => f.path) : undefined,
          },
          {
            label: `${unstaged.length} unstaged file(s) will be reverted to their committed state`,
            severity: "irreversible",
            details: unstaged.length > 0 ? unstaged.filter((f) => f.status !== "untracked").map((f) => f.path) : undefined,
          },
          {
            label: "Untracked files will be permanently deleted",
            severity: "irreversible",
            details: unstaged.filter((f) => f.status === "untracked").map((f) => f.path),
          },
        ]}
        variant="destructive"
        confirmLabel="Discard All"
        onConfirm={doDiscardAll}
        onCancel={() => setConfirmDiscardAll(false)}
      />
      <LintWarningDialog
        open={lintWarningOpen}
        onClose={() => setLintWarningOpen(false)}
        commitErrors={gateCommitErrors}
        codeDiagnostics={gateCodeDiagnostics}
        strictness={gateStrictness}
        onCommitAnyway={async () => {
          setLintWarningOpen(false);
          await performActualCommit(pendingCommitMessage, pendingAmend);
        }}
        onAutoFixCommit={() => {
          const fixed = autoFixCommitMessage(pendingCommitMessage, gateCommitErrors);
          setPendingCommitMessage(fixed);
          setCommitMessage(fixed);
          const reErrors = lintCommitMessage(fixed);
          setGateCommitErrors(reErrors);
          if (reErrors.length === 0 && gateCodeDiagnostics.length === 0) {
            setLintWarningOpen(false);
            performActualCommit(fixed, pendingAmend);
          }
        }}
        onAIReview={() => handleLintReview({
          commitMessage: pendingCommitMessage,
          commitIssues: gateCommitErrors,
          codeDiagnostics: gateCodeDiagnostics,
        })}
        aiReviewPending={lintReview.isPending}
        aiReviewResult={lintReviewResult}
      />
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

// ─── DiffReviewTarget & DiffReviewModal ────────────────────────────────────────

interface DiffReviewTarget {
  path: string;
  stage: "staged" | "unstaged";
  status?: string;
  autoInlineReview?: boolean;
}

interface DiffReviewModalProps {
  target: DiffReviewTarget;
  files: DiffReviewTarget[];
  onChangeTarget: (target: DiffReviewTarget) => void;
  onClose: () => void;
  onRefresh: () => void;
}

function DiffReviewModal({ target, files, onChangeTarget, onClose, onRefresh }: DiffReviewModalProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const queryClient = useQueryClient();
  const [showFullContext, setShowFullContext] = useState(false);
  const currentIndex = files.findIndex((file) => file.path === target.path && file.stage === target.stage);
  const currentNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < files.length - 1;
  const { data: diff, isLoading } = useGitDiff(
    repoPath,
    target.path,
    null,
    target.stage === "staged",
    showFullContext ? 9999 : undefined,
  );

  const goTo = useCallback((offset: number) => {
    if (currentIndex < 0) return;
    const next = files[currentIndex + offset];
    if (next) {
      setShowFullContext(false);
      onChangeTarget(next);
    }
  }, [currentIndex, files, onChangeTarget]);

  const refreshDiff = () => {
    queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    onRefresh();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goTo, onClose]);

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex h-[88vh] w-[92vw] max-w-[1320px] min-w-[760px] flex-col overflow-hidden rounded-mac border border-border bg-surface-0 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-1 px-3 py-2 shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-2 text-text-secondary shrink-0">
              {fileIcon(target.path, target.status || "modified", 16)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-text-primary">{getFileName(target.path)}</span>
                {target.status && (
                  <span className={`font-mono text-[10px] font-bold ${statusColor(target.status)}`}>
                    {statusLabel(target.status)}
                  </span>
                )}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${target.stage === "staged"
                  ? "bg-[#30d158]/10 text-[#30d158]"
                  : "bg-[#ff9f0a]/10 text-[#ff9f0a]"
                  }`}>
                  {target.stage}
                </span>
              </div>
              <div className="truncate text-[11px] text-text-muted">{target.path}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              className="h-7 w-7 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 disabled:opacity-35 flex items-center justify-center transition-colors"
              onClick={() => goTo(-1)}
              disabled={!canGoPrevious}
              title="Previous file"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-[58px] text-center text-[11px] font-semibold text-text-muted">
              {currentNumber}/{Math.max(files.length, 1)}
            </span>
            <button
              className="h-7 w-7 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 disabled:opacity-35 flex items-center justify-center transition-colors"
              onClick={() => goTo(1)}
              disabled={!canGoNext}
              title="Next file"
            >
              <ChevronRight size={14} />
            </button>

            <button
              className={`ghost h-7 px-2 text-[11px] rounded border border-transparent ${showFullContext ? "text-accent bg-accent-10 border-accent-20" : "hover:bg-surface-2"
                }`}
              onClick={() => setShowFullContext((show) => !show)}
              title={showFullContext ? "Show changed hunks only" : "Show full file context"}
            >
              {showFullContext ? "Compact" : "Full file"}
            </button>
            <div className="segmented-control">
              <button
                className={diffViewMode === "split" ? "active" : ""}
                onClick={() => setDiffViewMode("split")}
              >
                Split
              </button>
              <button
                className={diffViewMode === "unified" ? "active" : ""}
                onClick={() => setDiffViewMode("unified")}
              >
                Unified
              </button>
            </div>
            <button
              className="h-7 w-7 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
              onClick={onClose}
              title="Close review"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-surface-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">Loading diff...</div>
          ) : diff ? (
            <LazyDiffViewer
              diff={diff}
              filePath={target.path}
              source={target.stage === "staged" ? "staged" : "working"}
              onPatchApplied={refreshDiff}
              autoInlineReview={target.autoInlineReview}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">No changes</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Review helpers ─────────────────────────────────────────────────────────

function AIReviewLine({ line }: { line: string }) {
  const match = line.match(aiReviewTagPattern());
  if (!match) {
    const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
    if (heading) {
      return <h4 className="pt-1 text-xs font-bold text-text-primary">{stripInlineMarkdown(heading[1])}</h4>;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      return <p className="ml-2 whitespace-pre-wrap text-text-secondary">{line.replace(/^\s*[-*]\s+/, "• ").replace(/^\s*\|\s*/, "")}</p>;
    }
    return <p className="whitespace-pre-wrap text-text-secondary">{line.replace(/^\s*\|\s*/, "") || "\u00A0"}</p>;
  }

  const meta = aiReviewTagMeta(match[1]);
  return (
    <div className={`flex items-start gap-2 rounded-mac border border-l-[3px] px-2.5 py-2 ${meta.containerClassName}`}>
      <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none ${meta.badgeClassName}`}>
        {meta.label}
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-text-primary">{stripInlineMarkdown(match[2])}</p>
    </div>
  );
}

function countAIReviewTags(text: string) {
  if (!text) return 0;
  const pattern = aiReviewTagPattern();
  return text.split("\n").filter((line) => pattern.test(line)).length;
}

function aiReviewTagPattern() {
  return /^\s*(?:#{1,6}\s*)?(?:[-*]\s*)?(?:\|+\s*)?(?:\*\*)?\[(BUG|SECURITY|PERF|STYLE|BEST-PRACTICE|LINTER|TEST|A11Y|UX)\](?:\*\*)?(?:\s*\|+)?(?::)?\s*(.*)$/i;
}

function aiReviewTagMeta(tag: string) {
  switch (tag.toUpperCase()) {
    case "BUG":
      return { label: "BUG", badgeClassName: "border-[#ff375f] bg-[#ff375f]/15 text-[#ff375f]", containerClassName: "border-[#ff375f]/25 border-l-[#ff375f] bg-[#ff375f]/8" };
    case "SECURITY":
      return { label: "SECURITY", badgeClassName: "border-[#ff6b35] bg-[#ff6b35]/15 text-[#ff6b35]", containerClassName: "border-[#ff6b35]/25 border-l-[#ff6b35] bg-[#ff6b35]/8" };
    case "PERF":
      return { label: "PERF", badgeClassName: "border-[#ffcc00] bg-[#ffcc00]/15 text-[#ffcc00]", containerClassName: "border-[#ffcc00]/25 border-l-[#ffcc00] bg-[#ffcc00]/8" };
    case "STYLE":
      return { label: "STYLE", badgeClassName: "border-[#0a84ff] bg-[#0a84ff]/15 text-[#0a84ff]", containerClassName: "border-[#0a84ff]/25 border-l-[#0a84ff] bg-[#0a84ff]/8" };
    case "BEST-PRACTICE":
      return { label: "BEST", badgeClassName: "border-[#bf5af2] bg-[#bf5af2]/15 text-[#bf5af2]", containerClassName: "border-[#bf5af2]/25 border-l-[#bf5af2] bg-[#bf5af2]/8" };
    case "LINTER":
      return { label: "LINTER", badgeClassName: "border-[#64d2ff] bg-[#64d2ff]/15 text-[#64d2ff]", containerClassName: "border-[#64d2ff]/25 border-l-[#64d2ff] bg-[#64d2ff]/8" };
    case "TEST":
      return { label: "TEST", badgeClassName: "border-[#30d158] bg-[#30d158]/15 text-[#30d158]", containerClassName: "border-[#30d158]/25 border-l-[#30d158] bg-[#30d158]/8" };
    case "A11Y":
      return { label: "A11Y", badgeClassName: "border-[#ff9f0a] bg-[#ff9f0a]/15 text-[#ff9f0a]", containerClassName: "border-[#ff9f0a]/25 border-l-[#ff9f0a] bg-[#ff9f0a]/8" };
    case "UX":
      return { label: "UX", badgeClassName: "border-[#ff2d55] bg-[#ff2d55]/15 text-[#ff2d55]", containerClassName: "border-[#ff2d55]/25 border-l-[#ff2d55] bg-[#ff2d55]/8" };
    default:
      return { label: tag.toUpperCase(), badgeClassName: "border-accent bg-accent-15 text-accent", containerClassName: "border-accent-20 border-l-accent bg-accent-5" };
  }
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function getFileName(path: string) {
  return path.split("/").pop() || path;
}
