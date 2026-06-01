import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { api } from "@/api/tauri";
import { useGitBranches, useGitStatus, useGitSyncStatus } from "@/queries/useGitLog";
import { useMergeStatus } from "@/queries/useGitMerge";
import { useUndoLast } from "@/queries/useGitReflog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GitPullRequest,
  GitBranchPlus,
  FileDiff,
  ArrowUpFromLine,
  ArrowDownToLine,
  RefreshCw,
  Search,
  RotateCcw,
  ArrowLeftRight,
  Archive,
  Settings,
  BarChart3,
  LogOut,
} from "lucide-react";
import CreateBranchDialog from "@/components/features/dialogs/CreateBranchDialog";
import { useErrorReporter } from "@/lib/ErrorContext";
import SettingsDropdown from "@/components/ui/theme/SettingsDropdown";

export default function Toolbar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const selectFile = useUIStore((s) => s.selectFile);
  const openDialog = useUIStore((s) => s.openDialog);
  const queryClient = useQueryClient();
  const { data: branches } = useGitBranches(repoPath);
  const { data: changes } = useGitStatus(repoPath);
  const { data: syncStatus } = useGitSyncStatus(repoPath);
  const { data: mergeStatus } = useMergeStatus(repoPath);
  const undoLast = useUndoLast(repoPath);
  const { reportError } = useErrorReporter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showBranchDialog, setShowBranchDialog] = useState(false);

  if (!repoPath) return null;

  const doAction = async (action: string, fn: () => Promise<any>) => {
    setLoading(action);
    try {
      await fn();
      if (action === "pull" || action === "push" || action === "fetch") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "sync-status"] });
      }
    } catch (e) {
      reportError(e, action, () => doAction(action, fn));
    } finally {
      setLoading(null);
    }
  };

  const showChanges = () => {
    selectCommit(null);
    selectFile(null);
  };

  const inMerge = mergeStatus?.merging;

  return (
    <>
      <div className="vibrancy h-[44px] border-b border-border-60 bg-surface-1/40 backdrop-blur-md flex items-center justify-between px-4 select-none animate-in fade-in duration-200">

        {/* Left Side: Status Capsule Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              closeRepo();
              useUIStore.setState({
                selectedCommit: null,
                selectedFile: null,
                selectedFileStage: null,
                activeDialog: null,
              });
            }}
            className="h-8 w-8 flex items-center justify-center rounded-mac bg-surface-2-40 hover:bg-surface-2 border border-border-40 hover:border-border text-text-muted hover:text-text-primary transition-all shrink-0 cursor-pointer"
            title="Close Repository"
          >
            <LogOut size={13} />
          </button>
          <div className="w-[1px] h-3.5 bg-border-40/60 mr-1" />
          {changes && changes.length > 0 ? (
            <button
              onClick={showChanges}
              className="flex items-center gap-2.5 px-3.5 h-8 text-2xs font-bold rounded-full bg-accent-10 border border-accent-20 hover:bg-accent-15 text-text-primary transition-all cursor-pointer shadow-2xs shrink-0"
              title={`${changes.filter(c => c.staged).length} staged, ${changes.filter(c => !c.staged).length} unstaged — click to view`}
            >
              <FileDiff size={12} className="text-accent" />
              <div className="flex items-center gap-1.5">
                {changes.filter(c => c.staged).length > 0 && (
                  <span className="text-[#30d158] font-bold">
                    {changes.filter(c => c.staged).length} staged
                  </span>
                )}
                {changes.filter(c => c.staged).length > 0 && changes.filter(c => !c.staged).length > 0 && (
                  <span className="text-text-muted/50 font-normal">·</span>
                )}
                {changes.filter(c => !c.staged).length > 0 && (
                  <span className="text-[#ff9f0a] font-bold">
                    {changes.filter(c => !c.staged).length} unstaged
                  </span>
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={showChanges}
              className="flex items-center gap-2.5 px-3.5 h-8 text-2xs font-semibold rounded-full bg-surface-2-60 border border-border-40 hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-2xs shrink-0"
              title="Show current changes"
            >
              <FileDiff size={12} className="text-text-muted" />
              <span>Up to date</span>
            </button>
          )}
        </div>

        {/* Middle Side: Action Button Segment Groups */}
        <div className="flex items-center gap-3">
          {/* Sync Segment Group (Pull, Fetch, Push) */}
          <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs">
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
              onClick={() => doAction("pull", () => api.remote.pull(repoPath!))}
              disabled={!!loading}
              title="Pull remote changes"
            >
              <ArrowDownToLine size={13} className="text-text-muted group-hover:text-text-primary" />
              <span>Pull</span>
              {!!syncStatus?.behind && (
                <span className="ml-0.5 rounded-[3px] bg-[#0a84ff]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#0a84ff]">
                  {syncStatus.behind}
                </span>
              )}
            </button>
            <div className="w-[1px] h-3.5 bg-border-40/50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
              onClick={() => doAction("fetch", () => api.remote.fetch(repoPath!))}
              disabled={!!loading}
              title="Fetch remote changes"
            >
              <RefreshCw size={13} className={`${loading === "fetch" ? "animate-spin text-accent" : "text-text-muted"}`} />
              <span>Fetch</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-40/50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
              onClick={() => doAction("push", () => api.remote.push(repoPath!))}
              disabled={!!loading}
              title="Push local commits"
            >
              <ArrowUpFromLine size={13} className="text-text-muted" />
              <span>Push</span>
              {!!syncStatus?.ahead && (
                <span className="ml-0.5 rounded-[3px] bg-[#30d158]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#30d158]">
                  {syncStatus.ahead}
                </span>
              )}
            </button>
          </div>

          {/* Git Operations Segment Group (Branch, Merge, Stash) */}
          <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs">
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
              onClick={() => setShowBranchDialog(true)}
              title="Create branch"
            >
              <GitBranchPlus size={13} className="text-text-muted" />
              <span>Branch</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-40/50" />
            <button
              className={`h-7 px-4 flex items-center gap-2 text-2xs font-semibold hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer ${inMerge
                ? "text-[#ff9f0a] bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20"
                : "text-text-secondary hover:text-text-primary"
                }`}
              onClick={() => openDialog("merge")}
              title={inMerge ? "Merge in progress — click to resolve conflicts" : "Merge branches"}
            >
              <ArrowLeftRight size={13} className={inMerge ? "text-[#ff9f0a]" : "text-text-muted"} />
              <span>{inMerge ? "Merge →" : "Merge"}</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-40/50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
              onClick={() => openDialog("stash")}
              title="Manage stashes"
            >
              <Archive size={13} className="text-text-muted" />
              <span>Stash</span>
            </button>
          </div>

          {/* Utilities Segment Group (Search, Analytics, Undo) */}
          <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs">
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
              onClick={() => openDialog("search")}
              title="Spotlight Search"
            >
              <Search size={13} className="text-text-muted" />
              <span>Search</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-40/50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
              onClick={() => openDialog("analytics")}
              title="View Repository Activity Analytics"
            >
              <BarChart3 size={13} className="text-text-muted" />
              <span>Analytics</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-40/50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
              onClick={() => doAction("undo", () => undoLast.mutateAsync())}
              disabled={undoLast.isPending}
              title="Undo last Git action"
            >
              <RotateCcw size={13} className="text-text-muted" />
              <span>Undo</span>
            </button>
          </div>
        </div>

        {/* Right Side: Integrations (PR & SettingsDropdown) */}
        <div className="flex items-center gap-3">
          {/* PR Trigger */}
          <button
            className="ghost h-8 w-8 flex items-center justify-center text-text-muted hover:text-text-primary rounded-mac transition-all"
            disabled
            title="Pull Requests (Coming soon)"
          >
            <GitPullRequest size={13} />
          </button>

          <div className="w-[1px] h-3.5 bg-border-40/60" />

          {/* Settings & Quick Actions */}
          <SettingsDropdown
            onOpenSettings={() => openDialog("settings")}
            onOpenKeyboardShortcuts={() => openDialog("keyboard-shortcuts")}
          />
        </div>

      </div>

      {showBranchDialog && (
        <CreateBranchDialog
          open={showBranchDialog}
          onClose={() => setShowBranchDialog(false)}
        />
      )}
    </>
  );
}
