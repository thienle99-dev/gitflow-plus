import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitDiff, useGitStatus } from "@/queries/useGitLog";
import { api, type FileChange, type LintDiagnostic } from "@/api/tauri";
import { useGenerateCommitMessage, useAICommitScope } from "@/queries/useAI";
import { generateLocalCommitMessage, shouldAnalyzeScope, type CommitScopeSuggestion } from "@/lib/ai";
import { useQueryClient } from "@tanstack/react-query";
import ContextMenu, { type ContextMenuItem } from "@/components/ui/overlay/ContextMenu";
import UndoButton from "@/components/features/actions/UndoButton";
import LazyDiffViewer from "@/components/features/diff/LazyDiffViewer";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { lintCommitMessage, autoFixCommitMessage, type CommitLintResult } from "@/lib/commit-lint";
import { LintWarningDialog } from "@/components/features/dialogs";
import {
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  File,
  FileArchive,
  FileCode,
  FileCog,
  FileImage,
  FileJson,
  FileMinus,
  FilePlus,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  GitCommit,
  Layers,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
  Plus,
  Undo2,
  X,
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
  const [toast, setToast] = useState<string | null>(null);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file: FileChange; stage: "staged" | "unstaged" } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<DiffReviewTarget | null>(null);
  // Multi-select for batch stage/unstage
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const openDiffReview = (path: string, stage: "staged" | "unstaged") => {
    const target = reviewFiles.find((file) => file.path === path && file.stage === stage) || { path, stage };
    setReviewTarget(target);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
      showToast(`Error: ${e}`);
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
      showToast(`Error: ${e}`);
    }
  };

  const handleStageAll = async () => {
    try {
      await api.commit.stageAll(repoPath!);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleUnstageAll = async () => {
    try {
      await api.commit.unstageAll(repoPath!);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleDiscard = async (filePath: string) => {
    if (!confirm(`Discard all changes in ${filePath}?`)) return;
    try {
      await api.commit.discard(repoPath!, filePath);
      if (selectedFile === filePath) {
        selectFile(null);
      }
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleDiscardAll = async () => {
    if (!confirm("Discard all working tree changes, including untracked files?")) return;
    try {
      await api.commit.discardAll(repoPath!);
      selectFile(null);
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
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
      showToast(`Error: ${e}`);
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
      showToast(`Error: ${e}`);
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
      showToast(`Error: ${e}`);
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
      showToast(`Error: ${e}`);
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
      showToast(`Error: ${e}`);
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
      showToast(`Error: ${e}`);
    } finally {
      setCommitting(false);
      setCommittingGroupKey(null);
    }
  };

  const handleGenerateCommit = async () => {
    if (generateCommit.isPending) return;
    if (!changes || changes.length === 0) {
      showToast("No changes to generate a commit message");
      return;
    }

    setScopeSuggestion(null);
    setScopeDismissed(false);

    showToast("Generating commit message for all changes...");
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
      showToast(`AI failed: ${err.message || err}. Used local fallback.`);
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleAnalyzeScope = async () => {
    if (!repoPath || scopeAnalyzing || commitScope.isPending) return;
    if (staged.length === 0) {
      showToast("Stage some files first to analyze scope");
      return;
    }
    setScopeAnalyzing(true);
    setScopeDismissed(false);
    setScopeSuggestion(null);
    showToast("Analyzing commit scope...");
    try {
      const scope = await commitScope.mutateAsync({ repoPath, files: changes || staged });
      if (scope?.shouldSplit && scope.groups.length > 1) {
        setScopeSuggestion(scope);
        showToast(`AI suggests splitting into ${scope.groups.length} commits`);
      } else {
        showToast("Changes look cohesive — single commit is fine");
      }
    } catch {
      showToast("Scope analysis failed");
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
        action: () => handleDiscard(ctxMenu.file.path),
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
      <div className="h-10 px-3 border-b border-border-60 flex items-center justify-between shrink-0 bg-surface-1/70 backdrop-blur">
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
            onClick={handleDiscardAll}
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
          onToggleOpen={() => setStagedOpen((open) => !open)}
          onMenu={(x, y, file) => setCtxMenu({ x, y, file, stage: "staged" })}
          onFileMultiClick={handleFileClick}
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
          onToggleOpen={() => setUnstagedOpen((open) => !open)}
          onMenu={(x, y, file) => setCtxMenu({ x, y, file, stage: "unstaged" })}
          onFileMultiClick={handleFileClick}
          grow
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
      </div>

      <div className="px-3 py-3 border-t border-border-60 bg-surface-1-10 space-y-2.5 shrink-0">
        <div className="flex flex-col bg-surface-2-30 border border-border-40 rounded-mac p-2.5 focus-within:border-accent-60 focus-within:ring-1 focus-within:ring-accent-15 transition-all shadow-2xs">
          <textarea
            ref={textareaRef}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message"
            className="w-full min-h-[96px] max-h-[240px] text-xs bg-transparent text-text-primary placeholder:text-text-muted/60 resize-y outline-none border-none p-0 leading-relaxed font-mono focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
            style={{ outline: "none", border: "none", boxShadow: "none" }}
          />
          <div className="flex items-center justify-end gap-1.5 border-t border-border-60 pt-2.5 mt-2 select-none shrink-0">
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
              className={`h-7 px-2.5 rounded text-3xs font-semibold flex items-center gap-1 transition-all bg-accent text-accent-fg hover:opacity-95 active:scale-[0.99] flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm ${generateCommit.isPending ? "opacity-50 cursor-not-allowed" : ""
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
                        className="text-2xs font-semibold px-2.5 py-1.5 bg-accent/10 text-accent rounded-mac hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || (staged.length === 0 && unstaged.length === 0) || committing || lintRunning}
            className={`flex-1 h-8 inline-flex items-center justify-center gap-1.5 px-4 text-2xs font-semibold rounded-[5px] transition-all shadow-2xs cursor-pointer select-none ${commitMessage.trim() && (staged.length > 0 || unstaged.length > 0)
              ? "bg-accent text-accent-fg hover:opacity-90 active:scale-[0.99] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
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
              <RefreshCw size={12} className="animate-spin text-accent-fg" />
            ) : (
              <Check size={12} className={commitMessage.trim() && (staged.length > 0 || unstaged.length > 0) ? "text-accent-fg" : "text-text-muted"} />
            )}
            <span>{committing ? "Committing..." : lintRunning ? "Linting changes..." : unstaged.length > 0 ? "Commit All" : "Commit"}</span>
          </button>

          <UndoButton onUndoComplete={invalidate} />

          <button
            type="button"
            onClick={() => setAmend(!amend)}
            className={`h-8 px-3 rounded-[5px] border text-2xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${amend
              ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
              : "bg-surface-2-40 border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-3"
              }`}
            title="Amend last commit"
          >
            <GitCommit size={11} className={amend ? "text-[#ff9f0a]" : "text-text-muted"} />
            <span>Amend</span>
          </button>
        </div>
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

      {toast && <div className="toast">{toast}</div>}
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
  onToggleOpen: () => void;
  onMenu: (x: number, y: number, file: FileChange) => void;
  onFileMultiClick: (path: string, e: React.MouseEvent) => void;
  grow?: boolean;
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
  onToggleOpen,
  onMenu,
  onFileMultiClick,
  grow,
}: ChangeSectionProps) {
  return (
    <div className={`border-b border-border-60 min-h-0 flex flex-col ${grow && open ? "flex-1" : "shrink-0"} ${!grow && open ? "max-h-[42%]" : ""}`}>
      <div className="h-9 px-3 flex items-center gap-2 bg-surface-1/55 shrink-0">
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
            <div className="px-5 py-4 text-xs text-text-muted/80">{empty}</div>
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
  onMenu: (x: number, y: number) => void;
  onMultiClick?: (e: React.MouseEvent) => void;
}

function StatusBadge({ status, selected }: { status: string; selected: boolean }) {
  const label = statusLabel(status);

  let badgeClass = "";
  if (selected) {
    badgeClass = "text-accent-fg opacity-90";
  } else {
    switch (status) {
      case "added":
        badgeClass = "text-[#30d158]";
        break;
      case "deleted":
        badgeClass = "text-[#ff375f]";
        break;
      case "renamed":
      case "copied":
        badgeClass = "text-[#64d2ff]";
        break;
      case "untracked":
        badgeClass = "text-text-muted";
        break;
      default: // modified
        badgeClass = "text-[#ff9f0a]";
        break;
    }
  }

  return (
    <span className={`inline-flex items-center justify-center font-mono text-[10px] font-bold select-none px-1 leading-none ${badgeClass}`}>
      {label}
    </span>
  );
}

function ChangeRow({ file, checked, selected, multiSelected, onSelect, onToggle, onMenu, onMultiClick }: ChangeRowProps) {
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
            ? "border-accent-fg/40 hover:border-accent-fg hover:bg-accent-fg/10 text-transparent"
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
        {folder && (
          <span className={`block text-[10px] truncate leading-3 ${selected ? "text-accent-fg opacity-75" : "text-text-muted"}`}>
            {folder}
          </span>
        )}
      </span>
      <span className="flex items-center justify-end gap-1.5 min-w-[48px]">
        <StatusBadge status={file.status} selected={selected} />
        <span
          className={`h-5 w-5 flex items-center justify-center rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${selected ? "hover:bg-accent-fg/20 text-accent-fg" : "text-text-muted hover:bg-surface-2"
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
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">No changes</div>
          )}
        </div>
      </div>
    </div>
  );
}

function fileIcon(path: string, status: string, size = 14) {
  const className = statusColor(status);
  const ext = getExtension(path);
  const fileName = getFileName(path).toLowerCase();

  if (["package.json", "tsconfig.json", "vite.config.ts", "tailwind.config.ts"].includes(fileName)) {
    return <FileCog size={size} className={className} />;
  }

  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "java":
    case "kt":
    case "rs":
    case "go":
    case "py":
    case "rb":
    case "php":
    case "c":
    case "cpp":
    case "h":
    case "hpp":
      return <FileCode size={size} className={className} />;
    case "json":
    case "jsonc":
    case "lock":
      return <FileJson size={size} className={className} />;
    case "yml":
    case "yaml":
    case "toml":
    case "ini":
    case "env":
      return <FileCog size={size} className={className} />;
    case "css":
    case "scss":
    case "sass":
    case "less":
    case "html":
    case "xml":
    case "svg":
      return <Braces size={size} className={className} />;
    case "sql":
    case "db":
    case "sqlite":
      return <Database size={size} className={className} />;
    case "md":
    case "mdx":
    case "txt":
    case "rst":
      return <FileText size={size} className={className} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
      return <FileImage size={size} className={className} />;
    case "zip":
    case "gz":
    case "tar":
    case "rar":
    case "7z":
      return <FileArchive size={size} className={className} />;
    case "csv":
    case "tsv":
    case "xls":
    case "xlsx":
      return <FileSpreadsheet size={size} className={className} />;
    case "sh":
    case "bash":
    case "zsh":
    case "ps1":
      return <FileTerminal size={size} className={className} />;
    default:
      if (status === "added" || status === "untracked") return <FilePlus size={size} className={className} />;
      if (status === "deleted") return <FileMinus size={size} className={className} />;
      return <File size={size} className={className} />;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "modified": return "M";
    case "added": return "A";
    case "deleted": return "D";
    case "renamed": return "R";
    case "untracked": return "?";
    default: return status.charAt(0).toUpperCase();
  }
}

function statusColor(status: string) {
  switch (status) {
    case "added": return "text-[#30d158]";
    case "deleted": return "text-[#ff375f]";
    case "renamed":
    case "copied": return "text-[#64d2ff]";
    case "untracked": return "text-text-muted";
    default: return "text-[#ff9f0a]";
  }
}

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

function getExtension(path: string) {
  const fileName = getFileName(path).toLowerCase();
  const index = fileName.lastIndexOf(".");
  return index > -1 ? fileName.slice(index + 1) : fileName;
}

function getFolder(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}
