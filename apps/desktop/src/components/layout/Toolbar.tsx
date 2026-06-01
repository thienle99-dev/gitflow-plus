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
} from "lucide-react";
import CreateBranchDialog from "@/components/features/dialogs/CreateBranchDialog";
import { useErrorReporter } from "@/lib/ErrorContext";
import SettingsDropdown from "@/components/ui/theme/SettingsDropdown";

export default function Toolbar() {
  const repoPath = useRepoStore((s) => s.repoPath);
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
      <div className="vibrancy h-[38px] border-b border-border flex items-center px-3 gap-1 select-none">
        {/* Status Badge — replaces old "Show Changes" button */}
        {changes && changes.length > 0 ? (
          <button
            onClick={showChanges}
            className="flex items-center gap-1.5 px-2 h-7 text-2xs font-medium rounded-mac transition-all border border-transparent hover:border-border"
            title={`${changes.filter(c => c.staged).length} staged, ${changes.filter(c => !c.staged).length} unstaged — click to view`}
          >
            <FileDiff size={13} className="text-accent" />
            {changes.filter(c => c.staged).length > 0 && (
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {changes.filter(c => c.staged).length} staged
              </span>
            )}
            {changes.filter(c => c.staged).length > 0 && changes.filter(c => !c.staged).length > 0 && (
              <span className="text-text-muted">•</span>
            )}
            {changes.filter(c => !c.staged).length > 0 && (
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                {changes.filter(c => !c.staged).length} unstaged
              </span>
            )}
          </button>
        ) : (
          <button className="ghost text-xs" onClick={showChanges} title="Show current changes">
            <FileDiff size={14} /> Changes
          </button>
        )}
        <div className="w-[1px] h-4 bg-border mx-1" />
        <button className="ghost text-xs" onClick={() => doAction("pull", () => api.remote.pull(repoPath!))} disabled={!!loading}>
          <ArrowDownToLine size={14} /> Pull
          {!!syncStatus?.behind && (
            <span className="ml-1 rounded bg-[#007aff]/15 dark:bg-[#0a84ff]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#007aff] dark:text-[#0a84ff]">
              {syncStatus.behind}
            </span>
          )}
        </button>
        <button className="ghost text-xs" onClick={() => doAction("push", () => api.remote.push(repoPath!))} disabled={!!loading}>
          <ArrowUpFromLine size={14} /> Push
          {!!syncStatus?.ahead && (
            <span className="ml-1 rounded bg-[#34c759]/15 dark:bg-[#30d158]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#34c759] dark:text-[#30d158]">
              {syncStatus.ahead}
            </span>
          )}
        </button>
        <button className="ghost text-xs" onClick={() => doAction("fetch", () => api.remote.fetch(repoPath!))} disabled={!!loading}>
          <RefreshCw size={14} className={loading === "fetch" ? "animate-spin" : ""} /> Fetch
        </button>
        <div className="w-[1px] h-4 bg-border mx-1" />

        {/* Branch */}
        <button className="ghost text-xs" onClick={() => setShowBranchDialog(true)}>
          <GitBranchPlus size={14} /> Branch
        </button>

        {/* Merge — highlight if in merge state */}
        <button
          className={`ghost text-xs ${inMerge ? "text-[#ff9f0a]" : ""}`}
          onClick={() => openDialog("merge")}
          title={inMerge ? "Merge in progress — resolve conflicts" : "Merge branch"}
        >
          <ArrowLeftRight size={14} /> {inMerge ? "Merge →" : "Merge"}
        </button>

        {/* Stash */}
        <button className="ghost text-xs" onClick={() => openDialog("stash")}>
          <Archive size={14} /> Stash
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        {/* Search */}
        <button className="ghost text-xs" onClick={() => openDialog("search")}>
          <Search size={14} /> Search
        </button>

        {/* Analytics */}
        <button className="ghost text-xs" onClick={() => openDialog("analytics")} title="View Repository Activity Analytics">
          <BarChart3 size={14} /> Analytics
        </button>

        {/* Undo */}
        <button
          className="ghost text-xs"
          onClick={() => doAction("undo", () => undoLast.mutateAsync())}
          disabled={undoLast.isPending}
        >
          <RotateCcw size={14} /> Undo
        </button>

        <div className="flex-1" />

        {/* PR (Phase 3) */}
        <button className="ghost text-xs" disabled title="Coming soon">
          <GitPullRequest size={14} /> PR
        </button>

        {/* Settings & Quick Actions */}
        <SettingsDropdown
          onOpenSettings={() => openDialog("settings")}
          onOpenKeyboardShortcuts={() => openDialog("keyboard-shortcuts")}
        />
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
