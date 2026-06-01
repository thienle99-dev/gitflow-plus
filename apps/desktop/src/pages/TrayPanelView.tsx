import { useState, useEffect, useMemo, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitStatus, useGitBranches, useGitSyncStatus } from "@/queries/useGitLog";
import { api, type FileChange, type Commit, type StashEntry, type RepoInfo } from "@/api/tauri";
import { useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import { useGenerateCommitMessage } from "@/queries/useAI";
import {
  ChevronDown,
  ChevronUp,
  GitBranch,
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
  Archive,
  History,
  Settings,
  Copy,
  MessageSquare,
} from "lucide-react";

function formatTrayCommitDate(date: string) {
  const normalized = date.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
    "$1T$2$3:$4",
  );
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return date.slice(0, 16);
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function TrayPanelView() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const openRepo = useRepoStore((s) => s.openRepo);
  const queryClient = useQueryClient();

  const { data: changes, isLoading: isLoadingStatus } = useGitStatus(repoPath);
  const { data: branches } = useGitBranches(repoPath);
  const { data: syncStatus } = useGitSyncStatus(repoPath);
  const generateCommit = useGenerateCommitMessage(repoPath);

  const currentBranch = branches?.find((b) => b.current)?.name || "";

  // States
  const [activeTab, setActiveTab] = useState<"changes" | "commits">("changes");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Branch switcher states
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [checkingOutBranch, setCheckingOutBranch] = useState<string | null>(null);

  // Stash states
  const [stashLoading, setStashLoading] = useState(false);
  const [popLoading, setPopLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRepoDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch stashes
  const { data: stashes } = useQuery<StashEntry[]>({
    queryKey: ["git", repoPath, "stash-list"],
    queryFn: () => api.stash.list(repoPath!),
    enabled: !!repoPath,
    staleTime: 10_000,
  });

  // Fetch recent commits
  const { data: recentCommits, isLoading: isLoadingCommits } = useQuery<Commit[]>({
    queryKey: ["git", repoPath, "recent-commits"],
    queryFn: () => api.log(repoPath!, 0, 8),
    enabled: !!repoPath,
    staleTime: 10_000,
  });

  const repoInfoResults = useQueries({
    queries: recentRepos.map((path) => ({
      queryKey: ["repo", path, "info"],
      queryFn: () => api.repo.info(path),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const handleCheckoutBranch = async (branchName: string) => {
    if (!repoPath) return;
    setCheckingOutBranch(branchName);
    try {
      await api.branches.checkout(repoPath, branchName);
      invalidate();
      showToast(`Switched to branch: ${branchName}`);
      setBranchDropdownOpen(false);
      setBranchSearchQuery("");
    } catch (e: any) {
      showToast(e.message || `Failed to checkout ${branchName}`, "error");
    } finally {
      setCheckingOutBranch(null);
    }
  };

  const handleStashPush = async () => {
    if (!repoPath) return;
    setStashLoading(true);
    try {
      await api.stash.push(repoPath, `Stash from Tray - ${new Date().toLocaleTimeString()}`, true);
      invalidate();
      showToast("Stashed changes successfully");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    } finally {
      setStashLoading(false);
    }
  };

  const handleStashPop = async () => {
    if (!repoPath || !stashes || stashes.length === 0) return;
    setPopLoading(true);
    try {
      await api.stash.pop(repoPath, 0);
      invalidate();
      showToast("Popped stash successfully");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    } finally {
      setPopLoading(false);
    }
  };

  const copyToClipboard = async (text: string, successMessage = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (err) {
      showToast("Failed to copy", "error");
    }
  };

  const filteredBranches = (branches || []).filter((branch) =>
    branch.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );

  const groupedBranches = useMemo(() => {
    return filteredBranches.reduce(
      (groups, branchItem) => {
        if (branchItem.remote) {
          groups.remote.push(branchItem);
        } else {
          groups.local.push(branchItem);
        }
        return groups;
      },
      {
        local: [] as NonNullable<typeof branches>,
        remote: [] as NonNullable<typeof branches>,
      }
    );
  }, [filteredBranches, branches]);

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
    if (!repoPath || !changes || changes.length === 0) {
      showToast("No changes to generate a commit message", "error");
      return;
    }

    try {
      showToast("Generating message for all changes...", "success");
      const msg = await generateCommit.mutateAsync({ files: changes });
      setCommitMessage(msg.message);
    } catch (e: any) {
      showToast(e.message || "Failed to generate commit message", "error");
    }
  };

  const handleCommit = async () => {
    if (!repoPath || !commitMessage.trim()) return;
    setCommitting(true);
    try {
      if (unstaged.length > 0) {
        await api.commit.stageAll(repoPath);
      }
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

  const handleRefresh = async () => {
    if (!repoPath || refreshing) return;
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      await queryClient.invalidateQueries({ queryKey: ["repo", repoPath] });
      showToast("Refreshed");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenMainApp = async () => {
    console.log("[Tray] Open Full App clicked");
    try {
      await api.window.showMain();
      console.log("[Tray] Main window shown");
    } catch (e) {
      console.error("[Tray] Error opening full app:", e);
    }
  };

  const handleOpenSettings = async () => {
    console.log("[Tray] Open Settings clicked");
    try {
      await api.window.openSettings();
      console.log("[Tray] Settings opened");
    } catch (e) {
      console.error("[Tray] Error opening settings:", e);
    }
  };

  // Filter repos based on query
  const filteredRepos = recentRepos.filter((path) =>
    path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const repoInfoByPath = useMemo(() => {
    return recentRepos.reduce((infoMap, path, index) => {
      infoMap.set(path, repoInfoResults[index]?.data as RepoInfo | undefined);
      return infoMap;
    }, new Map<string, RepoInfo | undefined>());
  }, [recentRepos, repoInfoResults]);

  const groupedRepos = useMemo(() => {
    return filteredRepos.reduce(
      (groups, path) => {
        const info = repoInfoByPath.get(path);
        if (info?.remote) {
          groups.remote.push(path);
        } else {
          groups.local.push(path);
        }
        return groups;
      },
      { local: [] as string[], remote: [] as string[] }
    );
  }, [filteredRepos, repoInfoByPath]);

  const getRepoName = (path: string | null) => {
    if (!path) return "No Repository";
    return path.split("/").pop() || path;
  };

  const selectRepo = (path: string) => {
    openRepo(path);
    setRepoDropdownOpen(false);
    setSearchQuery("");
    invalidate();
  };

  const renderRepoItem = (path: string) => {
    const remote = repoInfoByPath.get(path)?.remote;

    return (
      <button
        key={path}
        onClick={() => selectRepo(path)}
        className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-accent hover:text-accent-fg transition-colors flex flex-col gap-0.5 ${repoPath === path ? "bg-surface-2 font-semibold" : "text-text-secondary"
          }`}
      >
        <span className="font-medium truncate">{path.split("/").pop()}</span>
        <span className="text-[8px] opacity-75 truncate">{remote || path}</span>
      </button>
    );
  };

  const renderRepoGroup = (label: string, paths: string[]) => {
    if (paths.length === 0) return null;

    return (
      <div className="py-1">
        <div className="px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-text-muted/80 flex items-center justify-between">
          <span>{label}</span>
          <span>{paths.length}</span>
        </div>
        {paths.map(renderRepoItem)}
      </div>
    );
  };

  const renderBranchItem = (branchItem: NonNullable<typeof branches>[number]) => (
    <button
      key={`${branchItem.remote || "local"}:${branchItem.name}`}
      onClick={() => handleCheckoutBranch(branchItem.name)}
      disabled={checkingOutBranch !== null}
      className={`w-full text-left px-3 py-1.5 text-[9px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between gap-1.5 ${branchItem.current ? "bg-surface-2 font-semibold text-accent" : "text-text-secondary"
        }`}
    >
      <span className="truncate flex-1">{branchItem.name}</span>
      {checkingOutBranch === branchItem.name ? (
        <Loader2 size={9} className="animate-spin text-accent" />
      ) : branchItem.current ? (
        <Check size={9} className="text-accent" />
      ) : null}
    </button>
  );

  const renderBranchGroup = (label: string, branchItems: NonNullable<typeof branches>) => {
    if (branchItems.length === 0) return null;

    return (
      <div className="py-1">
        <div className="px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-text-muted/80 flex items-center justify-between">
          <span>{label}</span>
          <span>{branchItems.length}</span>
        </div>
        {branchItems.map(renderBranchItem)}
      </div>
    );
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
                  <>
                    {renderRepoGroup("Remote", groupedRepos.remote)}
                    {renderRepoGroup("Local", groupedRepos.local)}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {repoPath && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary disabled:opacity-50 transition-all cursor-pointer"
              title="Refresh"
            >
              {refreshing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
            </button>
          )}
          <button
            onClick={handleOpenSettings}
            className="p-1.5 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all cursor-pointer"
            title="Settings"
          >
            <Settings size={13} />
          </button>
          <button
            onClick={handleOpenMainApp}
            className="p-1.5 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all cursor-pointer"
            title="Open Full App"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* Segmented Tab Control */}
      {repoPath && (
        <div className="px-3 pt-2.5 shrink-0 bg-surface-0">
          <div className="flex bg-surface-1 p-0.5 rounded border border-border-40">
            <button
              onClick={() => setActiveTab("changes")}
              className={`flex-1 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${activeTab === "changes" ? "bg-surface-2 text-accent shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
            >
              Changes ({changes?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("commits")}
              className={`flex-1 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${activeTab === "commits" ? "bg-surface-2 text-accent shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
            >
              Recent Commits
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {repoPath ? (
          activeTab === "changes" ? (
            <>
              {/* Working Tree Section */}
              <div className="flex-1 flex flex-col min-h-[170px] border border-border-40 bg-surface-1/40 rounded-mac p-2.5">
                <div className="flex items-center justify-between border-b border-border-40 pb-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Changes ({changes?.length || 0})
                    </span>
                    {repoPath && (
                      <div className="flex items-center gap-1.5 border-l border-border-40 pl-2">
                        <button
                          onClick={handleStashPush}
                          disabled={stashLoading || changes?.length === 0}
                          className="text-[9px] font-semibold text-text-secondary hover:text-accent disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
                          title="Stash changes"
                        >
                          {stashLoading ? <Loader2 size={9} className="animate-spin" /> : <Archive size={9} />}
                          <span>Stash</span>
                        </button>
                        {stashes && stashes.length > 0 && (
                          <button
                            onClick={handleStashPop}
                            disabled={popLoading}
                            className="text-[9px] font-semibold text-text-secondary hover:text-accent disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
                            title={`Pop latest stash (${stashes.length})`}
                          >
                            {popLoading ? <Loader2 size={9} className="animate-spin" /> : <History size={9} />}
                            <span>Pop ({stashes.length})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                          className={`text-[8px] font-bold uppercase px-1 rounded shrink-0 ${file.status === "added" || file.status === "untracked"
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
              <div className="border border-border-40 focus-within:border-accent-60 bg-surface-2 rounded-mac p-2 flex flex-col gap-2 shrink-0 transition-colors">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message (or generate with AI...)"
                  rows={2}
                  className="w-full bg-transparent border-none text-[10px] text-text-primary placeholder-text-muted resize-none leading-relaxed font-mono p-0.5"
                  style={{ outline: "none", border: "none", boxShadow: "none" }}
                />

                <div className="flex items-center justify-between gap-2 border-t border-border-40 pt-1.5">
                  <button
                    onClick={handleAICommitMessage}
                    disabled={(changes?.length || 0) === 0 || generateCommit.isPending}
                    className="text-[9px] font-bold text-accent hover:opacity-85 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
                    title={
                      "Generate message using all changes"
                    }
                  >
                    {generateCommit.isPending ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} />
                    )}
                    <span>AI Message</span>
                  </button>

                  <button
                    onClick={handleCommit}
                    disabled={committing || !commitMessage.trim()}
                    className="h-6 px-3 bg-accent text-accent-fg text-[9px] font-bold rounded hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {committing ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <GitCommit size={10} />
                    )}
                    <span>Commit {unstaged.length > 0 ? "(all)" : staged.length > 0 ? `(${staged.length})` : ""}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col border border-border-40 bg-surface-1/40 rounded-mac p-2.5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border-40 pb-1.5 shrink-0">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Recent Commits
                </span>
                <span className="text-[8px] text-text-muted">Click commit to copy hash</span>
              </div>

              <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 animate-in fade-in duration-200">
                {isLoadingCommits ? (
                  <div className="h-full flex items-center justify-center py-8 text-text-muted gap-1.5">
                    <Loader2 size={12} className="animate-spin text-accent" />
                    <span className="text-[10px]">Loading commits...</span>
                  </div>
                ) : recentCommits && recentCommits.length > 0 ? (
                  recentCommits.map((commit) => (
                    <div
                      key={commit.hash}
                      onClick={() => copyToClipboard(commit.hash, "Commit hash copied")}
                      className="group w-full text-left p-2 rounded hover:bg-surface-2 active:bg-surface-3 transition-all flex flex-col gap-1 border border-transparent hover:border-border-40 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          copyToClipboard(commit.hash, "Commit hash copied");
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <span className="text-[10px] text-text-primary font-semibold truncate flex-1">
                          {commit.message.split("\n")[0]}
                        </span>
                        <span className="text-[8px] font-mono bg-accent-10 border border-accent-20 px-1.5 py-0.5 rounded text-accent shrink-0">
                          {commit.hash.slice(0, 7)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] w-full">
                        <span className="truncate max-w-[120px] text-text-secondary">{commit.author}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-secondary">{formatTrayCommitDate(commit.date)}</span>
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                copyToClipboard(commit.hash, "Commit hash copied");
                              }}
                              className="p-0.5 rounded hover:bg-surface-3 text-text-muted hover:text-accent transition-colors"
                              title="Copy hash"
                            >
                              <Copy size={9} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                copyToClipboard(commit.message.split("\n")[0], "Commit message copied");
                              }}
                              className="p-0.5 rounded hover:bg-surface-3 text-text-muted hover:text-accent transition-colors"
                              title="Copy message"
                            >
                              <MessageSquare size={9} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenMainApp();
                              }}
                              className="p-0.5 rounded hover:bg-surface-3 text-text-muted hover:text-accent transition-colors"
                              title="Open full app"
                            >
                              <ExternalLink size={9} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-8 text-center text-text-muted">
                    <span className="text-[10px]">No commits found</span>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted gap-2">
            <FolderOpen size={24} className="opacity-45" />
            <span className="text-xs font-semibold">Select a Repository to start</span>
          </div>
        )}
      </div>

      {/* Footer Git Actions Bar */}
      <div className="h-12 border-t border-border-60 bg-surface-1 flex items-center justify-between px-3.5 shrink-0 relative">
        {/* Branch Switcher (Upwards Dropdown) */}
        {repoPath ? (
          <div className="relative min-w-0" ref={branchDropdownRef}>
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-2 text-[10px] font-semibold text-text-primary transition-all max-w-[145px]"
            >
              <GitBranch size={11} className="text-accent shrink-0" />
              <span className="truncate">{currentBranch || "no branch"}</span>
              {syncStatus && (syncStatus.ahead > 0 || syncStatus.behind > 0) && (
                <span
                  className="flex items-center gap-1 rounded bg-accent-10 px-1 py-0.5 text-[8px] font-bold text-accent shrink-0"
                  title={`${syncStatus.ahead} ahead, ${syncStatus.behind} behind`}
                >
                  {syncStatus.ahead > 0 && <span>↑{syncStatus.ahead}</span>}
                  {syncStatus.behind > 0 && <span>↓{syncStatus.behind}</span>}
                </span>
              )}
              <ChevronUp size={10} className="text-text-muted shrink-0" />
            </button>

            {branchDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-1 w-56 bg-surface-1 border border-border-60 rounded-mac shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="px-2 pb-1.5 border-b border-border-40 flex items-center gap-1.5">
                  <Search size={10} className="text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search branches..."
                    value={branchSearchQuery}
                    onChange={(e) => setBranchSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-[9px] text-text-primary outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto mt-1">
                  {filteredBranches.length === 0 ? (
                    <div className="px-3 py-2 text-[9px] text-text-muted italic">
                      No branches found
                    </div>
                  ) : (
                    <>
                      {renderBranchGroup("Local", groupedBranches.local)}
                      {renderBranchGroup("Remote", groupedBranches.remote)}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-[9px] font-mono text-text-muted">Ready</span>
        )}

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
        <div className="pointer-events-none absolute bottom-[54px] left-3 right-3 z-50 flex justify-center animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="flex max-w-[260px] items-center gap-1.5 rounded-mac border border-border-60 bg-surface-1/95 px-2.5 py-1.5 text-[9px] font-semibold text-text-primary shadow-xl backdrop-blur">
            {toast.type === "error" ? (
              <AlertCircle size={11} className="shrink-0 text-[#ff453a]" />
            ) : (
              <Check size={11} className="shrink-0 text-[#30d158]" />
            )}
            <span className="min-w-0 truncate whitespace-nowrap" title={toast.message}>
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
