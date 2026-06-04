import { Book, GitBranch, ArrowUp, ArrowDown, Loader2, GraduationCap, AlertTriangle, Terminal, Activity } from "lucide-react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { useGitBranches, useGitStatus, useGitSyncStatus } from "@/queries/useGitLog";
import { useMergeStatus } from "@/queries/useGitMerge";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useOperationsStore } from "@/stores/operations";
import { useLogsPanelStore } from "@/stores/logs";

export default function BottomBar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const openDialogState = useUIStore((s) => s.openDialog);
  const opsOpen = useOperationsStore((s) => s.isOpen);
  const toggleOps = useOperationsStore((s) => s.toggleOpen);
  const runningOps = useOperationsStore((s) => s.operations.filter((o) => o.status === "running").length);
  const logsOpen = useLogsPanelStore((s) => s.isOpen);
  const toggleLogs = useLogsPanelStore((s) => s.toggleOpen);

  // Monitor global background fetch/mutation progress
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isLoading = isFetching > 0 || isMutating > 0;

  // Fetch Git details only if we have an active repository
  const { data: branches } = useGitBranches(repoPath);
  const { data: status } = useGitStatus(repoPath);
  const { data: syncStatus } = useGitSyncStatus(repoPath);
  const { data: mergeStatus } = useMergeStatus(repoPath);

  const currentBranch = branches?.find((b) => b.current)?.name || "";
  const stagedCount = status?.filter((f) => f.staged).length || 0;
  const unstagedCount = status?.filter((f) => !f.staged).length || 0;
  const totalChanges = stagedCount + unstagedCount;

  const aheadCount = syncStatus?.ahead || 0;
  const behindCount = syncStatus?.behind || 0;

  const hasConflicts = !!mergeStatus?.conflicts?.length;
  const conflictCount = mergeStatus?.conflicts?.length || 0;

  return (
    <div className="h-[26px] border-t border-border-60 bg-surface-1-40 backdrop-blur-md flex items-center px-4 text-2xs text-text-muted select-none shrink-0">

      {/* Connection / State Indicator (Pulse Dot / Loader) */}
      <div className="flex items-center gap-1.5 border-r border-border-20 pr-3 mr-3 h-4 min-w-[56px]">
        {isLoading ? (
          <>
            <Loader2 size={11} className="animate-spin text-accent shrink-0" />
            <span className="font-semibold text-text-secondary">
              {isMutating > 0 ? "Running" : "Syncing"}
            </span>
          </>
        ) : (
          <>
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#30d158]"></span>
            </span>
            <span className="font-semibold text-text-secondary">Ready</span>
          </>
        )}
      </div>

      {/* Contextual Git Metrics */}
      {repoPath && (
        <div className="flex items-center gap-3">
          {/* Current Branch */}
          {currentBranch && (
            <div className="flex items-center gap-1 text-text-secondary font-medium">
              <GitBranch size={11} className="text-text-muted" />
              <span>{currentBranch}</span>
            </div>
          )}

          {/* Conflict Indicator */}
          {hasConflicts && (
            <button
              className="flex items-center gap-1 text-[10px] font-semibold border-l border-border-20 pl-3 h-3 text-[#ff375f] hover:text-[#ff6482] transition-colors cursor-pointer"
              onClick={() => openDialogState("merge")}
              title={`${conflictCount} conflict${conflictCount === 1 ? "" : "s"} — click to resolve`}
            >
              <AlertTriangle size={10} />
              <span>{conflictCount} conflict{conflictCount === 1 ? "" : "s"}</span>
            </button>
          )}

          {/* Sync Stats (Ahead/Behind) */}
          {(aheadCount > 0 || behindCount > 0) && (
            <div className="flex items-center gap-2 text-text-muted text-[10px] border-l border-border-20 pl-3 h-3">
              {aheadCount > 0 && (
                <span className="flex items-center gap-0.5 text-accent font-semibold" title={`${aheadCount} commits to push`}>
                  <ArrowUp size={10} />
                  {aheadCount}
                </span>
              )}
              {behindCount > 0 && (
                <span className="flex items-center gap-0.5 text-[#ff9f0a] font-semibold" title={`${behindCount} commits to pull`}>
                  <ArrowDown size={10} />
                  {behindCount}
                </span>
              )}
            </div>
          )}

          {/* Staging stats summary */}
          {totalChanges > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted border-l border-border-20 pl-3 h-3">
              {stagedCount > 0 && (
                <span className="text-[#30d158]" title={`${stagedCount} staged files`}>
                  {stagedCount} staged
                </span>
              )}
              {stagedCount > 0 && unstagedCount > 0 && <span>·</span>}
              {unstagedCount > 0 && (
                <span className="text-[#ff9f0a]" title={`${unstagedCount} unstaged files`}>
                  {unstagedCount} unstaged
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Right side: Operations + Feature Guide + Onboarding + Version */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleOps}
          className={`flex items-center gap-1 text-text-muted hover:text-accent transition-all p-0.5 rounded cursor-pointer mr-0.5 ${opsOpen ? "text-accent" : ""}`}
          title="Operation Center"
        >
          <Activity size={11} />
          <span className="text-[9px] font-semibold">Ops</span>
          {runningOps > 0 && (
            <span className="min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-accent text-[8px] font-bold text-white px-1">
              {runningOps}
            </span>
          )}
        </button>

        <button
          onClick={toggleLogs}
          className={`flex items-center gap-1 text-text-muted hover:text-accent transition-all p-0.5 rounded cursor-pointer mr-0.5 ${logsOpen ? "text-accent" : ""}`}
          title="App Logs"
        >
          <Terminal size={11} />
          <span className="text-[9px] font-semibold">Logs</span>
        </button>

        <button
          onClick={() => openDialogState("onboarding")}
          className="flex items-center gap-1 text-text-muted hover:text-accent transition-all p-0.5 rounded cursor-pointer mr-0.5"
          title="Onboarding Wizard"
        >
          <GraduationCap size={11} />
          <span className="text-[9px] font-semibold">Setup</span>
        </button>

        <button
          onClick={() => openDialogState("feature-guide")}
          className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-all p-0.5 rounded cursor-pointer mr-0.5"
          title="Feature Guide (⌘⇧H)"
        >
          <Book size={11} />
          <span className="text-[9px] font-semibold">Guide</span>
        </button>

        <span className="text-[9px] font-medium text-text-muted-60 select-all">
          v1.0.2
        </span>
      </div>
    </div>
  );
}
