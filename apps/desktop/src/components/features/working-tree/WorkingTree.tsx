import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitDiff, useGitStatus } from "@/queries/useGitLog";
import { api, type FileChange, type LintDiagnostic } from "@/api/tauri";
import { useGenerateCommitMessage, useAICommitScope, useAIDiffReview } from "@/queries/useAI";
import { generateLocalCommitMessage, shouldAnalyzeScope, type CommitScopeSuggestion } from "@/lib/ai";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import { StatusBadge, fileIcon, statusLabel, statusColor } from "@/components/ui/shared";
import ContextMenu, { type ContextMenuItem } from "@/components/ui/overlay/ContextMenu";
import UndoButton from "@/components/features/actions/UndoButton";
import LazyDiffViewer from "@/components/features/diff/LazyDiffViewer";
import { AlertCircle, ShieldAlert, MessageSquare } from "lucide-react";
import { lintCommitMessage, autoFixCommitMessage, type CommitLintResult } from "@/lib/commit-lint";
import { LintWarningDialog } from "@/components/features/dialogs";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  Layers,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
  Plus,
  Undo2,
  X,
  Maximize2,
  Folder,
  List,
  FolderTree,
} from "lucide-react";

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
  const [confirmDiscard, setConfirmDiscard] = useState<string | null>(null);
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file: FileChange; stage: "staged" | "unstaged" } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<DiffReviewTarget | null>(null);
  // Multi-select for batch stage/unstage
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    requestAnimationFrame(() => textareaRef.current?.focus());
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
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus());
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

  // Auto-trigger scope analysis when staged files cross threshold (≥5 files across ≥2 dirs)
  const prevStagedCountRef = useRef(0);
  useEffect(() => {
    const prevCount = prevStagedCountRef.current;
    prevStagedCountRef.current = staged.length;
    // Trigger when crossing the threshold (from <5 to ≥5) and not already analyzing
    if (staged.length >= 5 && prevCount < 5 && !scopeSuggestion && !scopeAnalyzing && !commitScope.isPending) {
      // Only auto-trigger if shouldAnalyzeScope returns true
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
  }, [commitMessage, repoPath]);

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

  const totalChanges = staged.length + unstaged.length;
  const isAllOpen = stagedOpen || unstagedOpen;

  const handleToggleAllSections = () => {
    if (isAllOpen) {
      setStagedOpen(false);
      setUnstagedOpen(false);
    } else {
      setStagedOpen(true);
      setUnstagedOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Master Changes Header */}
      <div className="h-10 px-3 border-b border-border-60 flex items-center justify-between shrink-0 bg-surface-1-70 backdrop-blur">
        <div
          className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-text-primary uppercase tracking-wider select-none"
          onClick={handleToggleAllSections}
          title={isAllOpen ? "Collapse all" : "Expand all"}
        >
          <ChevronDown
            size={13}
            className={`text-text-secondary transition-transform duration-150 ${isAllOpen ? "" : "-rotate-90"}`}
          />
          Changes
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={`h-6 w-6 inline-flex items-center justify-center rounded-md transition-colors ${
              isTreeView
                ? "text-accent bg-accent-10 hover:bg-accent-20"
                : "text-text-muted hover:text-text-primary hover:bg-surface-2"
            }`}
            onClick={toggleTreeView}
            title={isTreeView ? "Switch to List View" : "Switch to Tree View"}
          >
            {isTreeView ? <FolderTree size={13} /> : <List size={13} />}
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            onClick={invalidate}
            title="Refresh changes"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-accent hover:bg-accent-10 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
            onClick={handleStageAll}
            disabled={unstaged.length === 0}
            title="Stage all changes"
          >
            <Plus size={13} />
          </button>
          <button
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-[#ff375f] hover:bg-[#ff375f]/10 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
            onClick={() => setConfirmDiscardAll(true)}
            disabled={totalChanges === 0}
            title="Discard all changes"
          >
            <Undo2 size={13} />
          </button>
          {totalChanges > 0 && (
            <span className="ml-1 flex items-center justify-center min-w-[20px] h-5 rounded-full bg-[#bf5af2]/15 text-[#bf5af2] dark:text-[#da8fff] text-[10px] font-bold px-1.5 select-none">
              {totalChanges}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChangeSection
          title="Staged files"
          checked
          open={stagedOpen}
          files={staged}
          empty="No staged changes"
          selectedFile={reviewTarget?.path || selectedFile}
          selectedStage={reviewTarget?.stage || selectedFileStage}
          stage="staged"
          multiSelectedFiles={selectedFiles}
          onToggleAll={handleUnstageAll}
          onToggleFile={handleUnstage}
          onSelect={(path) => openDiffReview(path, "staged")}
          onAIInlineReview={(path) => openInlineReview(path, "staged")}
          onToggleOpen={() => setStagedOpen((open) => !open)}
          onMenu={(x, y, file) => setCtxMenu({ x, y, file, stage: "staged" })}
          onFileMultiClick={handleFileClick}
          isTreeView={isTreeView}
        />
        <ChangeSection
          title="Unstaged files"
          checked={false}
          open={unstagedOpen}
          files={unstaged}
          empty="No unstaged changes"
          selectedFile={reviewTarget?.path || selectedFile}
          selectedStage={reviewTarget?.stage || selectedFileStage}
          stage="unstaged"
          multiSelectedFiles={selectedFiles}
          onToggleAll={handleStageAll}
          onToggleFile={handleStage}
          onSelect={(path) => openDiffReview(path, "unstaged")}
          onAIInlineReview={(path) => openInlineReview(path, "unstaged")}
          onToggleOpen={() => setUnstagedOpen((open) => !open)}
          onMenu={(x, y, file) => setCtxMenu({ x, y, file, stage: "unstaged" })}
          onFileMultiClick={handleFileClick}
          isTreeView={isTreeView}
        />
        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-5 border-b border-accent-20 shrink-0">
            <span className="text-2xs text-text-muted">{selectedFiles.size} selected</span>
            <button onClick={handleBatchStage} className="text-2xs font-medium text-accent hover:underline">
              Stage selected
            </button>
            <button onClick={handleBatchUnstage} className="text-2xs font-medium text-text-muted hover:text-text-primary hover:underline">
              Unstage selected
            </button>
            <button onClick={() => setSelectedFiles(new Set())} className="text-2xs text-text-muted hover:text-text-primary ml-auto">
              Clear
            </button>
          </div>
        )}

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
      </div>

      <div className="px-3 py-3 border-t border-border-60 bg-surface-1-10 space-y-2.5 shrink-0">
        <div className="flex flex-col bg-surface-2-30 border border-border-40 rounded-mac p-2.5 focus-within:border-accent-60 focus-within:ring-1 focus-within:ring-accent-15 transition-all shadow-2xs">
          <textarea
            ref={textareaRef}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message"
            className="w-full min-h-[96px] max-h-[240px] text-xs bg-transparent text-text-primary placeholder:text-text-muted-60 resize-y outline-none border-none p-0 leading-relaxed font-mono focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
            style={{ outline: "none", border: "none", boxShadow: "none" }}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border-60 pt-2.5 mt-2 select-none shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleAIReview}
                disabled={committing || aiReview.isPending || (staged.length === 0 && unstaged.length === 0)}
                className={`h-7 px-2.5 rounded-[5px] border text-3xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs bg-accent-10 border-accent-30 text-accent hover:bg-accent-20 hover:border-accent-40 active:scale-[0.99] disabled:bg-surface-2-40 disabled:border-border-40 disabled:text-text-muted disabled:opacity-45 disabled:cursor-not-allowed ${aiReview.isPending ? "opacity-70" : ""}`}
                title="Run AI review with custom checklist"
              >
                {aiReview.isPending ? (
                  <RefreshCw size={11} className="animate-spin text-accent" />
                ) : (
                  <Sparkles size={11} className="text-accent" />
                )}
                <span>AI Review</span>
              </button>

              <UndoButton compact onUndoComplete={invalidate} />

              <button
                type="button"
                onClick={() => setAmend(!amend)}
                className={`h-7 px-2.5 rounded-[5px] border text-3xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${amend
                  ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
                  : "bg-surface-2-40 border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-3"
                  }`}
                title="Amend last commit"
              >
                <GitCommit size={11} className={amend ? "text-[#ff9f0a]" : "text-text-muted"} />
                <span>Amend</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {staged.length >= 3 && (
                <button
                  type="button"
                  className={`h-7 px-2.5 rounded border text-3xs font-semibold flex items-center gap-1 transition-all bg-surface-2 border-border-40 text-text-secondary hover:text-text-primary hover:bg-surface-3 active:scale-95 cursor-pointer ${scopeAnalyzing || commitScope.isPending ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  onClick={handleAnalyzeScope}
                  disabled={scopeAnalyzing || commitScope.isPending}
                  title={scopeAnalyzing ? "Analyzing scope..." : "Analyze commit scope (suggest splitting)"}
                >
                  {scopeAnalyzing || commitScope.isPending ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <Layers size={11} />
                  )}
                  <span>Split Scope</span>
                </button>
              )}
              <button
                type="button"
                className={`h-7 px-2.5 rounded text-3xs font-semibold flex items-center gap-1 transition-all bg-accent text-accent-fg hover:opacity-95 active:scale-[0.99] active:scale-95 cursor-pointer shadow-sm ${generateCommit.isPending ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                onClick={handleGenerateCommit}
                disabled={generateCommit.isPending}
                title={generateCommit.isPending ? "Generating..." : "Generate commit message (AI)"}
              >
                {generateCommit.isPending ? (
                  <RefreshCw size={11} className="animate-spin text-accent-fg" />
                ) : (
                  <Sparkles size={11} />
                )}
                <span>Generate with AI</span>
              </button>

              <button
                type="button"
                onClick={handleCommit}
                disabled={!commitMessage.trim() || (staged.length === 0 && unstaged.length === 0) || committing || lintRunning}
                className={`h-7 px-3 rounded-[5px] text-3xs font-semibold inline-flex items-center gap-1 transition-all shadow-sm cursor-pointer select-none ${commitMessage.trim() && (staged.length > 0 || unstaged.length > 0)
                  ? "bg-[#30d158] text-[#07140a] hover:bg-[#30d158]/90 active:scale-[0.99]"
                  : "bg-surface-3 text-text-muted opacity-40 cursor-not-allowed"
                  } ${committing || lintRunning ? "opacity-60" : ""}`}
                title={
                  !commitMessage.trim()
                    ? "Enter a commit message"
                    : staged.length === 0 && unstaged.length === 0
                      ? "No changes to commit"
                      : staged.length === 0
                        ? "Commit all changes"
                        : "Commit (⌘↵)"
                }
              >
                {lintRunning ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Check size={11} />
                )}
                <span>{committing ? "Committing..." : lintRunning ? "Linting..." : unstaged.length > 0 ? "Commit All" : "Commit"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-2xs px-1 text-text-muted mt-1 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            {localStorage.getItem("gitflowCommitLintEnabled") !== "false" && lintResults.length > 0 ? (
              <>
                {lintResults[0].severity === "error" ? (
                  <ShieldAlert size={11} className="text-[#ff453a] shrink-0" />
                ) : (
                  <AlertCircle size={11} className="text-[#ff9f0a] shrink-0" />
                )}
                <span className="text-text-secondary truncate max-w-[280px]" title={lintResults[0].message}>
                  {lintResults[0].message}
                </span>
                {lintResults.some(r => r.autoFixable) && (
                  <button
                    type="button"
                    onClick={() => setCommitMessage(autoFixCommitMessage(commitMessage, lintResults))}
                    className="text-accent hover:underline font-semibold ml-1 cursor-pointer shrink-0"
                  >
                    Auto-fix
                  </button>
                )}
              </>
            ) : localStorage.getItem("gitflowCommitLintEnabled") !== "false" && commitMessage.trim().length > 0 ? (
              <span className="text-[#30d158] flex items-center gap-1">
                <Check size={11} className="text-[#30d158]" /> Message conforms to spec
              </span>
            ) : null}
          </div>

          <div className="text-2xs text-text-muted shrink-0 ml-2">
            <span className={commitMessage.split('\n')[0].length > 72 ? "text-[#ff453a] font-semibold" : ""}>
              {commitMessage.split('\n')[0].length}
            </span>
            /72
          </div>
        </div>
        {scopeSuggestion && !scopeDismissed && (
          <div className="border border-accent-20 bg-accent-5 rounded-mac p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers size={13} className="text-accent" />
                <span className="text-xs font-semibold text-accent">
                  AI suggests splitting into {scopeSuggestion.groups.length} commits
                </span>
              </div>
              <button
                onClick={() => setScopeDismissed(true)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-2xs text-text-secondary leading-relaxed">{scopeSuggestion.explanation}</p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {scopeSuggestion.groups.map((group, i) => {
                const groupColors = [
                  { border: "border-l-[#0a84ff]", bg: "bg-[#0a84ff]/8", badge: "bg-[#0a84ff]/15 text-[#0a84ff]" },
                  { border: "border-l-[#30d158]", bg: "bg-[#30d158]/8", badge: "bg-[#30d158]/15 text-[#30d158]" },
                  { border: "border-l-[#ff9f0a]", bg: "bg-[#ff9f0a]/8", badge: "bg-[#ff9f0a]/15 text-[#ff9f0a]" },
                  { border: "border-l-[#bf5af2]", bg: "bg-[#bf5af2]/8", badge: "bg-[#bf5af2]/15 text-[#bf5af2]" },
                ];
                const color = groupColors[i % groupColors.length];
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 p-2.5 ${color.bg} rounded-mac border-l-[3px] ${color.border} border border-border-20`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-text-primary leading-snug">
                        {group.message}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {group.files.map((f, fi) => (
                          <span
                            key={fi}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono ${color.badge}`}
                          >
                            {f.split("/").pop()}
                          </span>
                        ))}
                      </div>
                      <p className="text-2xs text-text-secondary italic leading-relaxed">{group.reason}</p>
                    </div>
                    <div className="shrink-0 flex flex-col gap-1 mt-0.5">
                      <button
                        onClick={() => handleCommitGroup(group)}
                        disabled={!!committingGroupKey || committing}
                        className="text-2xs font-semibold px-2.5 py-1.5 bg-accent text-accent-fg rounded-mac hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {committingGroupKey === group.message ? "Committing..." : "Commit"}
                      </button>
                      <button
                        onClick={() => handleUseGroup(group)}
                        disabled={!!committingGroupKey || committing}
                        className="text-2xs font-semibold px-2.5 py-1.5 bg-accent-10 text-accent rounded-mac hover:bg-accent-20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Use this
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={handleCommitAllSuggested}
                disabled={!!committingGroupKey || committing}
                className="flex-1 text-2xs font-semibold text-accent-fg py-1.5 cursor-pointer bg-accent hover:opacity-90 rounded-mac border border-accent transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {committingGroupKey === "__all__" ? "Committing suggestions..." : "Commit all suggested"}
              </button>
              <button
                onClick={() => setScopeDismissed(true)}
                disabled={!!committingGroupKey || committing}
                className="flex-1 text-2xs text-text-muted hover:text-text-primary py-1.5 cursor-pointer bg-surface-2-30 hover:bg-surface-2 rounded-mac border border-border-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Commit all as one
              </button>
            </div>
          </div>
        )}

      </div>

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
        message={`Discard all changes in ${confirmDiscard}?`}
        variant="destructive"
        confirmLabel="Discard"
        onConfirm={() => doDiscard(confirmDiscard!)}
        onCancel={() => setConfirmDiscard(null)}
      />
      <ConfirmDialog
        open={confirmDiscardAll}
        title="Discard All Changes"
        message="Discard all working tree changes, including untracked files?"
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

interface FileTreeNode {
  type: "file";
  name: string;
  path: string;
  file: FileChange;
}

interface FolderTreeNode {
  type: "folder";
  name: string;
  path: string;
  children: { [key: string]: FileTreeNode | FolderTreeNode };
}

function buildFileTree(files: FileChange[]): FolderTreeNode {
  const root: FolderTreeNode = {
    type: "folder",
    name: "",
    path: "",
    children: {},
  };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        current.children[part] = {
          type: "file",
          name: part,
          path: file.path,
          file,
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = {
            type: "folder",
            name: part,
            path: currentPath,
            children: {},
          };
        }
        current = current.children[part] as FolderTreeNode;
      }
    }
  }

  return root;
}

interface FileTreeRendererProps {
  node: FolderTreeNode;
  depth: number;
  checked: boolean;
  selectedFile: string | null;
  selectedStage: "staged" | "unstaged" | null;
  stage: "staged" | "unstaged";
  multiSelectedFiles: Set<string>;
  onToggleFile: (path: string) => void;
  onSelect: (path: string) => void;
  onAIInlineReview: (path: string) => void;
  onMenu: (x: number, y: number, file: FileChange) => void;
  onFileMultiClick: (path: string, e: React.MouseEvent) => void;
  collapsedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function FileTreeRenderer({
  node,
  depth,
  checked,
  selectedFile,
  selectedStage,
  stage,
  multiSelectedFiles,
  onToggleFile,
  onSelect,
  onAIInlineReview,
  onMenu,
  onFileMultiClick,
  collapsedFolders,
  onToggleFolder,
}: FileTreeRendererProps) {
  const sortedKeys = Object.keys(node.children).sort((a, b) => {
    const childA = node.children[a];
    const childB = node.children[b];
    if (childA.type !== childB.type) {
      return childA.type === "folder" ? -1 : 1;
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-[1px]">
      {sortedKeys.map((key) => {
        const child = node.children[key];
        if (child.type === "folder") {
          const isCollapsed = collapsedFolders.has(child.path);
          return (
            <div key={child.path}>
              <div
                className="tree-item group w-full flex items-center gap-1.5 px-3 py-1 hover:bg-surface-2 cursor-pointer text-left select-none text-xs text-text-secondary"
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={() => onToggleFolder(child.path)}
              >
                <span
                  className="h-3.5 w-3.5 flex items-center justify-center shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFolder(child.path);
                  }}
                >
                  <ChevronDown
                    size={12}
                    className={`text-text-muted transition-transform duration-150 shrink-0 ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </span>

                <Folder size={12} className="text-accent shrink-0" />
                <span className="truncate font-semibold text-text-primary flex-1">{child.name}</span>

                <span
                  className={`h-3.5 w-3.5 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer mr-1 opacity-0 group-hover:opacity-100 ${checked
                    ? "bg-accent border-accent text-accent-fg"
                    : "border-border text-transparent hover:border-text-secondary hover:bg-surface-2"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFile(child.path);
                  }}
                  title={checked ? "Unstage folder" : "Stage folder"}
                >
                  {checked && <Check size={9} strokeWidth={3.5} />}
                </span>
              </div>
              {!isCollapsed && (
                <FileTreeRenderer
                  node={child}
                  depth={depth + 1}
                  checked={checked}
                  selectedFile={selectedFile}
                  selectedStage={selectedStage}
                  stage={stage}
                  multiSelectedFiles={multiSelectedFiles}
                  onToggleFile={onToggleFile}
                  onSelect={onSelect}
                  onAIInlineReview={onAIInlineReview}
                  onMenu={onMenu}
                  onFileMultiClick={onFileMultiClick}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={onToggleFolder}
                />
              )}
            </div>
          );
        } else {
          return (
            <div
              key={`${stage}:${child.path}`}
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              <ChangeRow
                file={child.file}
                checked={checked}
                selected={selectedFile === child.path && selectedStage === stage}
                multiSelected={multiSelectedFiles.has(child.path)}
                onSelect={() => onSelect(child.path)}
                onToggle={() => onToggleFile(child.path)}
                onAIInlineReview={() => onAIInlineReview(child.path)}
                onMenu={(x, y) => onMenu(x, y, child.file)}
                onMultiClick={(e) => onFileMultiClick(child.path, e)}
                hideFolder
              />
            </div>
          );
        }
      })}
    </div>
  );
}

interface ChangeSectionProps {
  title: string;
  checked: boolean;
  open: boolean;
  files: FileChange[];
  empty: string;
  selectedFile: string | null;
  selectedStage: "staged" | "unstaged" | null;
  stage: "staged" | "unstaged";
  multiSelectedFiles: Set<string>;
  onToggleAll: () => void;
  onToggleFile: (path: string) => void;
  onSelect: (path: string) => void;
  onAIInlineReview: (path: string) => void;
  onToggleOpen: () => void;
  onMenu: (x: number, y: number, file: FileChange) => void;
  onFileMultiClick: (path: string, e: React.MouseEvent) => void;
  grow?: boolean;
  isTreeView?: boolean;
}

function ChangeSection({
  title,
  checked,
  open,
  files,
  empty,
  selectedFile,
  selectedStage,
  stage,
  multiSelectedFiles,
  onToggleAll,
  onToggleFile,
  onSelect,
  onAIInlineReview,
  onToggleOpen,
  onMenu,
  onFileMultiClick,
  grow,
  isTreeView,
}: ChangeSectionProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const handleToggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const treeRoot = useMemo(() => {
    if (isTreeView) {
      return buildFileTree(files);
    }
    return null;
  }, [files, isTreeView]);

  return (
    <div className={`border-b border-border-60 min-h-0 flex flex-col ${grow && open ? "flex-1" : "shrink-0"} ${!grow && open ? "max-h-[42%]" : ""}`}>
      <div className="h-9 px-3 flex items-center gap-2 bg-surface-1-55 shrink-0">
        <button
          className="ghost p-0.5 text-text-muted hover:text-text-primary transition-colors"
          onClick={onToggleOpen}
          title={open ? "Collapse" : "Expand"}
        >
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "" : "-rotate-90"}`} />
        </button>
        <button
          className={`h-3.5 w-3.5 rounded-[4px] border flex items-center justify-center transition-all ${checked
            ? "bg-accent border-accent text-accent-fg"
            : "border-border text-transparent hover:border-text-secondary hover:bg-surface-2"
            }`}
          onClick={onToggleAll}
          title={checked ? "Unstage all (⌘U)" : "Stage all (⌘⇧A)"}
          disabled={files.length === 0}
        >
          {checked && <Check size={9} strokeWidth={3.5} />}
        </button>
        <div className="flex-1 text-xs font-semibold text-text-primary">
          {title} <span className="text-text-muted font-medium">({files.length})</span>
        </div>
        {files.length > 0 && (
          <button className="text-2xs font-semibold text-text-muted hover:text-accent transition-colors" onClick={onToggleAll}
            title={checked ? "Unstage all (⌘U)" : "Stage all (⌘⇧A)"}>
            {checked ? "Unstage all" : "Stage all"}
          </button>
        )}
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto py-1.5">
          {files.length === 0 ? (
            <div className="px-5 py-4 text-xs text-text-muted-80">{empty}</div>
          ) : isTreeView && treeRoot ? (
            <FileTreeRenderer
              node={treeRoot}
              depth={0}
              checked={checked}
              selectedFile={selectedFile}
              selectedStage={selectedStage}
              stage={stage}
              multiSelectedFiles={multiSelectedFiles}
              onToggleFile={onToggleFile}
              onSelect={onSelect}
              onAIInlineReview={onAIInlineReview}
              onMenu={onMenu}
              onFileMultiClick={onFileMultiClick}
              collapsedFolders={collapsedFolders}
              onToggleFolder={handleToggleFolder}
            />
          ) : (
            files.map((file) => (
              <ChangeRow
                key={`${stage}:${file.path}`}
                file={file}
                checked={checked}
                selected={selectedFile === file.path && selectedStage === stage}
                multiSelected={multiSelectedFiles.has(file.path)}
                onSelect={() => onSelect(file.path)}
                onToggle={() => onToggleFile(file.path)}
                onAIInlineReview={() => onAIInlineReview(file.path)}
                onMenu={(x, y) => onMenu(x, y, file)}
                onMultiClick={(e) => onFileMultiClick(file.path, e)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ChangeRowProps {
  file: FileChange;
  checked: boolean;
  selected: boolean;
  multiSelected?: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onAIInlineReview: () => void;
  onMenu: (x: number, y: number) => void;
  onMultiClick?: (e: React.MouseEvent) => void;
  hideFolder?: boolean;
}

function ChangeRow({ file, checked, selected, multiSelected, onSelect, onToggle, onAIInlineReview, onMenu, onMultiClick, hideFolder }: ChangeRowProps) {
  const fileName = getFileName(file.path);
  const folder = getFolder(file.path);

  return (
    <div
      className={`tree-item group w-full grid grid-cols-[14px_16px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1 text-left ${multiSelected ? "ring-1 ring-accent bg-accent-5" : selected ? "selected" : ""
        }`}
      onClick={(e) => {
        if (onMultiClick && (e.shiftKey || e.metaKey || e.ctrlKey)) {
          onMultiClick(e);
        } else {
          onSelect();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
      title={file.path}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span
        className={`h-3.5 w-3.5 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer ${checked
          ? selected
            ? "bg-accent-fg border-accent-fg text-accent"
            : "bg-accent border-accent text-accent-fg"
          : selected
            ? "border-accent-fg-40 hover:border-accent-fg hover:bg-accent-fg-10 text-transparent"
            : "border-border hover:border-text-secondary hover:bg-surface-2 text-transparent"
          }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {checked && <Check size={9} strokeWidth={3.5} />}
      </span>
      <span title={checked ? "Unstage (⌘U)" : "Stage (⌘S)"}
        className="h-4 w-4 flex items-center justify-center shrink-0">
        {fileIcon(file.path, file.status)}
      </span>
      <span className="min-w-0 flex flex-col justify-center">
        <span className={`block text-xs font-medium text-current truncate leading-4 ${file.status === "deleted" ? "line-through opacity-60" : ""}`}>
          {fileName}
        </span>
        {!hideFolder && folder && (
          <span className={`block text-[10px] truncate leading-3 ${selected ? "text-accent-fg opacity-75" : "text-text-muted"}`}>
            {folder}
          </span>
        )}
      </span>
      <span className="flex items-center justify-end gap-1.5 min-w-[48px]">
        <StatusBadge status={file.status} selected={selected} />
        <span
          className={`h-5 w-5 flex items-center justify-center rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${selected ? "hover:bg-accent-fg-20 text-accent-fg" : "text-text-muted hover:bg-surface-2"
            }`}
          onClick={(e) => {
            e.stopPropagation();
            onAIInlineReview();
          }}
          title="AI Inline Review"
        >
          <MessageSquare size={12} className="text-current" />
        </span>
        <span
          className={`h-5 w-5 flex items-center justify-center rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${selected ? "hover:bg-accent-fg-20 text-accent-fg" : "text-text-muted hover:bg-surface-2"
            }`}
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e.clientX, e.clientY);
          }}
        >
          <MoreHorizontal size={13} className="text-current" />
        </span>
      </span>
    </div>
  );
}

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


function getFolder(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}
