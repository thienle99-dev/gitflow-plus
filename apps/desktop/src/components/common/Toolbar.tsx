import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
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

export default function Toolbar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const theme = useRepoStore((s) => s.theme);
  const toggleTheme = useRepoStore((s) => s.toggleTheme);
  const [loading, setLoading] = useState<string | null>(null);

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
      <button className="ghost text-xs">
        <GitBranchPlus size={14} /> Branch
      </button>
      <button className="ghost text-xs">
        <GitPullRequest size={14} /> PR
      </button>
      <div className="flex-1" />
      <button className="ghost" onClick={toggleTheme}>
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}
