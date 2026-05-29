import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { useGitBranches } from "@/queries/useGitLog";
import { useState } from "react";
import {
  GitPullRequest,
  GitBranchPlus,
  ArrowUpFromLine,
  ArrowDownToLine,
  RefreshCw,
  Moon,
  Sun,
} from "lucide-react";
import CreateBranchDialog from "./CreateBranchDialog";

export default function Toolbar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const theme = useRepoStore((s) => s.theme);
  const toggleTheme = useRepoStore((s) => s.toggleTheme);
  const { data: branches } = useGitBranches(repoPath);
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

  return (
    <>
      <div className="vibrancy h-[38px] border-b border-border flex items-center px-3 gap-1 select-none">
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
        <button className="ghost text-xs" onClick={() => setShowBranchDialog(true)}>
          <GitBranchPlus size={14} /> Branch
        </button>
        <button className="ghost text-xs" disabled title="Coming in Phase 3">
          <GitPullRequest size={14} /> PR
        </button>
        <div className="flex-1" />
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
