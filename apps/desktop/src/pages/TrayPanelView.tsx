import { useState, useEffect, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitStatus } from "@/queries/useGitLog";
import { api, type FileChange } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import { useGenerateCommitMessage } from "@/queries/useAI";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  ChevronDown,
  File,
  GitCommit,
  Sparkles,
  RefreshCw,
  Download,
  Upload,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  FolderOpen,
  CheckSquare,
  Square,
  Search,
} from "lucide-react";

export default function TrayPanelView() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const openRepo = useRepoStore((s) => s.openRepo);
  const queryClient = useQueryClient();

  const { data: changes, isLoading: isLoadingStatus } = useGitStatus(repoPath);
  const generateCommit = useGenerateCommitMessage(repoPath);

  // States
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRepoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const invalidate = () => {
    if (repoPath) {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    }
  };

  const staged = changes?.filter((c) => c.staged) || [];
  const unstaged = changes?.filter((c) => !c.staged) || [];

  const handleToggleStage = async (file: FileChange) => {
    if (!repoPath) return;
    try {
      if (file.staged) {
        await api.commit.unstage(repoPath, file.path);
      } else {
        await api.commit.stage(repoPath, file.path);
      }
      invalidate();
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    }
  };

  const handleStageAll = async () => {
    if (!repoPath) return;
    try {
      await api.commit.stageAll(repoPath);
      invalidate();
      showToast("Staged all files");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    }
  };

  const handleUnstageAll = async () => {
    if (!repoPath) return;
    try {
      await api.commit.unstageAll(repoPath);
      invalidate();
      showToast("Unstaged all files");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    }
  };

  const handleAICommitMessage = async () => {
    if (!repoPath || staged.length === 0) {
      showToast("Please stage some files first", "error");
      return;
    }
    try {
      showToast("Generating message with AI...", "success");
      const msg = await generateCommit.mutateAsync({ files: staged });
      setCommitMessage(msg.message);
    } catch (e: any) {
      showToast(e.message || "Failed to generate commit message", "error");
    }
  };

  const handleCommit = async () => {
    if (!repoPath || !commitMessage.trim()) return;
    setCommitting(true);
    try {
      await api.commit.commit(repoPath, commitMessage, false);
      setCommitMessage("");
      invalidate();
      showToast("Committed successfully");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    } finally {
      setCommitting(false);
    }
  };

  const handleGitAction = async (action: "fetch" | "pull" | "push") => {
    if (!repoPath) return;
    setSyncLoading(action);
    try {
      if (action === "fetch") {
        await api.remote.fetch(repoPath);
        showToast("Fetch complete");
      } else if (action === "pull") {
        await api.remote.pull(repoPath);
        showToast("Pulled successfully");
      } else if (action === "push") {
        await api.remote.push(repoPath);
        showToast("Pushed successfully");
      }
      invalidate();
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    } finally {
      setSyncLoading(null);
    }
  };

  const handleOpenMainApp = async () => {
    try {
      const mainWin = await WebviewWindow.getByLabel("main");
      if (mainWin) {
        await mainWin.show();
        await mainWin.unminimize();
        await mainWin.setFocus();
      }
      // Hide tray popover
      const trayWin = await WebviewWindow.getByLabel("tray");
      if (trayWin) {
        await trayWin.hide();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter repos based on query
  const filteredRepos = recentRepos.filter((path) =>
    path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRepoName = (path: string | null) => {
    if (!path) return "No Repository";
    return path.split("/").pop() || path;
  };

  return (
    <div className="flex flex-col h-[460px] w-[360px] bg-surface-0 border border-border-60 rounded-lg overflow-hidden select-none shadow-2xl relative font-sans">
      {/* Header */}
      <div className="h-11 border-b border-border-60 bg-surface-1 flex items-center justify-between px-3 shrink-0">
        {/* Repo Selector Dropdown Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-2 text-xs font-semibold text-text-primary transition-all max-w-[220px]"
          >
            <FolderOpen size={13} className="text-accent shrink-0" />
            <span className="truncate">{getRepoName(repoPath)}</span>
            <ChevronDown size={11} className={`text-text-muted transition-transform ${repoDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {repoDropdownOpen && (
            <div className="absolute left-0 mt-1 w-64 bg-surface-1 border border-border-60 rounded-mac shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-2 pb-1.5 border-b border-border-40 flex items-center gap-1.5">
                <Search size={11} className="text-text-muted" />
                <input
                  type="text"
                  placeholder="Search recent repos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[10px] text-text-primary outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto mt-1">
                {filteredRepos.length === 0 ? (
                  <div className="px-3 py-2 text-[10px] text-text-muted italic">
                    No repositories found
                  </div>
                ) : (
                  filteredRepos.map((path) => (
                    <button
                      key={path}
                      onClick={() => {
                        openRepo(path);
                        setRepoDropdownOpen(false);
                        setSearchQuery("");
                        invalidate();
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-accent hover:text-accent-fg transition-colors flex flex-col gap-0.5 ${
                        repoPath === path ? "bg-surface-2 font-semibold" : "text-text-secondary"
                      }`}
                    >
                      <span className="font-medium truncate">{path.split("/").pop()}</span>
                      <span className="text-[8px] opacity-75 truncate">{path}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action: Open Main App */}
        <button
          onClick={handleOpenMainApp}
          className="p-1.5 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all"
          title="Open Full App"
        >
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {repoPath ? (
          <>
            {/* Working Tree Section */}
            <div className="flex-1 flex flex-col min-h-[170px] border border-border-40 bg-surface-1/40 rounded-mac p-2.5">
              <div className="flex items-center justify-between border-b border-border-40 pb-1.5 shrink-0">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Changes ({changes?.length || 0})
                </span>
                <div className="flex gap-2">
                  {unstaged.length > 0 && (
                    <button
                      onClick={handleStageAll}
                      className="text-[9px] font-semibold text-accent hover:underline"
                    >
                      Stage All
                    </button>
                  )}
                  {staged.length > 0 && (
                    <button
                      onClick={handleUnstageAll}
                      className="text-[9px] font-semibold text-text-muted hover:text-text-primary hover:underline"
                    >
                      Unstage All
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable File List */}
              <div className="flex-1 overflow-y-auto mt-2 space-y-1 pr-1">
                {isLoadingStatus ? (
                  <div className="h-full flex items-center justify-center py-4 text-text-muted gap-1.5">
                    <Loader2 size={12} className="animate-spin text-accent" />
                    <span className="text-[10px]">Loading status...</span>
                  </div>
                ) : changes && changes.length > 0 ? (
                  changes.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-surface-2 transition-all text-[10px]"
                    >
                      <button
                        onClick={() => handleToggleStage(file)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                      >
                        {file.staged ? (
                          <CheckSquare size={12} className="text-accent shrink-0" />
                        ) : (
                          <Square size={12} className="text-text-muted shrink-0" />
                        )}
                        <File size={11} className="text-text-secondary shrink-0" />
                        <span className="text-text-primary truncate font-medium">{file.path}</span>
                      </button>
                      <span
                        className={`text-[8px] font-bold uppercase px-1 rounded shrink-0 ${
                          file.status === "added" || file.status === "untracked"
                            ? "text-[#30d158]/80"
                            : file.status === "deleted"
                            ? "text-[#ff453a]/80"
                            : "text-[#ff9f0a]/80"
                        }`}
                      >
                        {file.status.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-8 text-center text-text-muted space-y-1.5">
                    <Check size={16} className="text-[#30d158]" />
                    <span className="text-[10px] font-medium">Working directory clean</span>
                  </div>
                )}
              </div>
            </div>

            {/* Commit Form Section */}
            <div className="border border-border-40 bg-surface-1/40 rounded-mac p-2.5 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between border-b border-border-40 pb-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Commit message
                </span>
                <button
                  onClick={handleAICommitMessage}
                  disabled={staged.length === 0 || generateCommit.isPending}
                  className="text-[9px] font-bold text-accent hover:opacity-85 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
                  title="Generate message using AI"
                >
                  {generateCommit.isPending ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Sparkles size={10} />
                  )}
                  <span>AI Message</span>
                </button>
              </div>

              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Write a message or generate with AI..."
                rows={2}
                className="w-full bg-surface-2 border border-border-40 rounded px-2 py-1 text-[10px] text-text-primary placeholder-text-muted outline-none focus:border-accent resize-none leading-relaxed font-mono"
              />

              <button
                onClick={handleCommit}
                disabled={committing || !commitMessage.trim()}
                className="w-full h-7 bg-accent text-accent-fg text-[10px] font-bold rounded hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {committing ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <GitCommit size={11} />
                )}
                <span>Commit {staged.length > 0 ? `(${staged.length} files)` : ""}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted gap-2">
            <FolderOpen size={24} className="opacity-45" />
            <span className="text-xs font-semibold">Select a Repository to start</span>
          </div>
        )}
      </div>

      {/* Footer Git Actions Bar */}
      <div className="h-12 border-t border-border-60 bg-surface-1 flex items-center justify-between px-3.5 shrink-0">
        <span className="text-[9px] font-mono text-text-muted truncate max-w-[150px]">
          {repoPath ? `Branch: ${changes?.[0] ? "Changes active" : "Up to date"}` : "Ready"}
        </span>

        {repoPath && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleGitAction("fetch")}
              disabled={syncLoading !== null}
              className="h-7 px-2.5 bg-surface-2 hover:bg-surface-3 text-text-primary text-[10px] font-semibold rounded border border-border-40 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Fetch remote changes"
            >
              {syncLoading === "fetch" ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <RefreshCw size={10} />
              )}
              <span>Fetch</span>
            </button>
            <button
              onClick={() => handleGitAction("pull")}
              disabled={syncLoading !== null}
              className="h-7 px-2.5 bg-surface-2 hover:bg-surface-3 text-text-primary text-[10px] font-semibold rounded border border-border-40 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Pull remote changes"
            >
              {syncLoading === "pull" ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Download size={10} />
              )}
              <span>Pull</span>
            </button>
            <button
              onClick={() => handleGitAction("push")}
              disabled={syncLoading !== null}
              className="h-7 px-2.5 bg-surface-2 hover:bg-surface-3 text-text-primary text-[10px] font-semibold rounded border border-border-40 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Push local commits"
            >
              {syncLoading === "push" ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Upload size={10} />
              )}
              <span>Push</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full shadow-lg text-[9px] font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 ${
            toast.type === "error"
              ? "bg-[#ff453a] text-white"
              : "bg-[#30d158] text-white"
          }`}
        >
          {toast.type === "error" ? <AlertCircle size={10} /> : <Check size={10} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
