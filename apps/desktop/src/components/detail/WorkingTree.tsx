import { useState, useRef, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitStatus } from "@/queries/useGitLog";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { FilePlus, FileMinus, FileEdit, RotateCcw, SquareArrowOutUpRight } from "lucide-react";

export default function WorkingTree() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectFile = useUIStore((s) => s.selectFile);
  const { data: changes } = useGitStatus(repoPath);
  const queryClient = useQueryClient();
  const [commitMessage, setCommitMessage] = useState("");
  const [amend, setAmend] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const staged = changes?.filter((c) => c.staged) || [];
  const unstaged = changes?.filter((c) => !c.staged) || [];

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
      invalidate();
    } catch (e: any) {
      showToast(`Error: ${e}`);
    }
  };

  const handleUnstage = async (filePath: string) => {
    try {
      await api.commit.unstage(repoPath!, filePath);
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

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setCommitting(true);
    try {
      const result = await api.commit.commit(repoPath!, commitMessage, amend);
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && commitMessage.trim()) {
        handleCommit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [commitMessage, repoPath]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "added": return <FilePlus size={12} className="text-[#30d158]" />;
      case "deleted": return <FileMinus size={12} className="text-[#ff375f]" />;
      case "untracked": return <FilePlus size={12} className="text-text-muted" />;
      default: return <FileEdit size={12} className="text-[#ff9f0a]" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "modified": return "M";
      case "added": return "A";
      case "deleted": return "D";
      case "renamed": return "R";
      case "untracked": return "?";
      default: return status.charAt(0).toUpperCase();
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
        <div className="text-xs font-medium text-text-primary">Working Tree</div>
        <div className="text-2xs text-text-muted">
          {staged.length} staged · {unstaged.length} unstaged
        </div>
      </div>

      {/* Staged */}
      <div className="px-3 py-1.5 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-primary">
            Staged Changes ({staged.length})
          </span>
          {staged.length > 0 && (
            <button className="ghost text-2xs" onClick={handleUnstageAll}>
              Unstage All
            </button>
          )}
        </div>
        <div className="space-y-[1px] max-h-[120px] overflow-y-auto">
          {staged.length === 0 && (
            <div className="text-xs text-text-muted py-1">No staged changes</div>
          )}
          {staged.map((f) => (
            <div
              key={f.path}
              className="list-item flex items-center gap-2 px-2 py-[2px]"
              onClick={() => selectFile(f.path)}
            >
              <div className="w-4 text-center text-2xs font-mono text-[#30d158]">{statusLabel(f.status)}</div>
              <span className="text-xs truncate flex-1">{f.path}</span>
              <button
                className="ghost p-0.5 opacity-50 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleUnstage(f.path); }}
                title="Unstage"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Unstaged */}
      <div className="px-3 py-1.5 border-b border-border flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-primary">
            Changes ({unstaged.length})
          </span>
          {unstaged.length > 0 && (
            <button className="ghost text-2xs" onClick={handleStageAll}>
              Stage All
            </button>
          )}
        </div>
        <div className="space-y-[1px] flex-1 overflow-y-auto">
          {unstaged.length === 0 && (
            <div className="text-xs text-text-muted py-1">No changes</div>
          )}
          {unstaged.map((f) => (
            <div
              key={f.path}
              className="list-item flex items-center gap-2 px-2 py-[2px]"
              onClick={() => selectFile(f.path)}
            >
              <div className={`w-4 text-center text-2xs font-mono ${f.status === 'untracked' ? 'text-text-muted' : 'text-[#ff9f0a]'}`}>
                {statusLabel(f.status)}
              </div>
              <span className="text-xs truncate flex-1">{f.path}</span>
              <button
                className="ghost p-0.5 opacity-50 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleStage(f.path); }}
                title="Stage"
              >
                <SquareArrowOutUpRight size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Commit form */}
      <div className="px-3 py-2 border-t border-border space-y-2">
        <textarea
          ref={textareaRef}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message (Cmd+Enter to commit)"
          className="w-full h-[60px] text-xs bg-surface-1 border border-border rounded-mac px-2 py-1.5 text-text-primary placeholder:text-text-muted resize-none outline-none focus:border-accent transition-colors"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || committing}
            className="flex-1 px-3 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {committing ? "Committing..." : "Commit"}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={amend}
              onChange={(e) => setAmend(e.target.checked)}
              className="rounded"
            />
            Amend
          </label>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
