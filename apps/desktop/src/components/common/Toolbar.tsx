import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { api } from "@/api/tauri";
import { useGitBranches, useGitStatus } from "@/queries/useGitLog";
import { useMergeStatus } from "@/queries/useGitMerge";
import { useUndoLast } from "@/queries/useGitReflog";
import { useState } from "react";
import {
  GitPullRequest,
  GitBranchPlus,
  FileDiff,
  ArrowUpFromLine,
  ArrowDownToLine,
  RefreshCw,
  Moon,
  Sun,
  Search,
  Sparkles,
  RotateCcw,
  ArrowLeftRight,
  Archive,
  Settings,
} from "lucide-react";
import CreateBranchDialog from "./CreateBranchDialog";

export default function Toolbar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const theme = useRepoStore((s) => s.theme);
  const toggleTheme = useRepoStore((s) => s.toggleTheme);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const selectFile = useUIStore((s) => s.selectFile);
  const openDialog = useUIStore((s) => s.openDialog);
  const { data: branches } = useGitBranches(repoPath);
  const { data: changes } = useGitStatus(repoPath);
  const { data: mergeStatus } = useMergeStatus(repoPath);
  const undoLast = useUndoLast(repoPath);
  const [loading, setLoading] = useState<string | null>(null);
  const [showBranchDialog, setShowBranchDialog] = useState(false);

  if (!repoPath) return null;

  const doAction = async (action: string, fn: () => Promise<any>) => {
    setLoading(action);
    try {
      await fn();
    } catch (e) {
      console.error(`${action} failed:`, e);
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
        <button className="ghost text-xs" onClick={showChanges} title="Show current changes">
          <FileDiff size={14} /> Changes
          {!!changes?.length && (
            <span className="ml-0.5 rounded bg-surface-3 px-1 text-[10px] font-semibold text-text-secondary">
              {changes.length}
            </span>
          )}
        </button>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <button className="ghost text-xs" onClick={() => doAction("pull", () => api.remote.pull(repoPath!))} disabled={!!loading}>
          <ArrowDownToLine size={14} /> Pull
        </button>
        <button className="ghost text-xs" onClick={() => doAction("push", () => api.remote.push(repoPath!))} disabled={!!loading}>
          <ArrowUpFromLine size={14} /> Push
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

        {/* Undo */}
        <button
          className="ghost text-xs"
          onClick={() => doAction("undo", () => undoLast.mutateAsync())}
          disabled={undoLast.isPending}
        >
          <RotateCcw size={14} /> Undo
        </button>

        {/* Settings */}
        <button className="ghost text-xs" onClick={() => openDialog("settings")} title="Application settings">
          <Settings size={14} /> Settings
        </button>

        <div className="flex-1" />

        {/* PR (Phase 3) */}
        <button className="ghost text-xs" disabled title="Coming soon">
          <GitPullRequest size={14} /> PR
        </button>

        {/* Theme toggle */}
        <button className="ghost" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {showBranchDialog && (
        <CreateBranchDialog
          repoPath={repoPath}
          branches={branches || []}
          open={showBranchDialog}
          onClose={() => setShowBranchDialog(false)}
        />
      )}
    </>
  );
}
