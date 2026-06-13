import { useState, useEffect, useMemo, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitStatus, useGitBranches, useGitSyncStatus } from "@/queries/useGitLog";
import { api, type FileChange, type Commit, type RepoInfo } from "@/api/tauri";
import { useCommitDateFormatter } from "@/lib/date";
import { useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import { useGenerateCommitMessage } from "@/queries/useAI";
import { useGitFlowDetect } from "@/queries/useGitFlow";
import { showToast } from "@/lib/toast";
import { preflightGate, type PreflightAction } from "@/lib/preflight-gate";
import { logger } from "@/lib/logger";
import { trackRemoteOp } from "@/stores/operations";
import { useRepoAutoRefresh } from "@/hooks/useRepoAutoRefresh";
import { TrayCommitBox } from "./TrayCommitBox";
import { TrayCommitSplit } from "./TrayCommitSplit";
import { TrayFileChanges } from "./TrayFileChanges";
import { TrayActions } from "./TrayActions";
import {
  ChevronDown,
  FolderOpen,
  Search,
  Loader2,
  ExternalLink,
  Settings,
  GitCommitHorizontal,
  Clock,
  Wrench,
} from "lucide-react";

type ViewMode = "commit" | "recent" | "actions";

export default function TrayPanelView() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const openRepo = useRepoStore((s) => s.openRepo);
  const queryClient = useQueryClient();
  const formatCommitDate = useCommitDateFormatter();

  const { data: changes, isLoading: isLoadingStatus } = useGitStatus(repoPath);
  const { data: branches } = useGitBranches(repoPath);
  const { data: syncStatus } = useGitSyncStatus(repoPath);
  const { data: gitflowConfig } = useGitFlowDetect(repoPath);
  const generateCommit = useGenerateCommitMessage(repoPath);

  const currentBranch = branches?.find((b) => b.current)?.name || "";

  const [viewMode, setViewMode] = useState<ViewMode>("commit");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [showStashDiff, setShowStashDiff] = useState(false);
  const [stashDiff, setStashDiff] = useState("");
  const [stashDiffLoading, setStashDiffLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRepoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useRepoAutoRefresh(repoPath, { includeStash: true });

  const { data: preflight } = useQuery({
    queryKey: ["git", repoPath, "preflight"],
    queryFn: () => api.preflight.check(repoPath!),
    enabled: !!repoPath,
    staleTime: 5_000,
  });

  const { data: stashes } = useQuery({
    queryKey: ["git", repoPath, "stash-list"],
    queryFn: () => api.stash.list(repoPath!),
    enabled: !!repoPath,
    staleTime: 10_000,
  });

  const { data: recentCommits } = useQuery<Commit[]>({
    queryKey: ["git", repoPath, "recent-commits"],
    queryFn: () => api.log(repoPath!, 0, 10),
    enabled: !!repoPath,
    staleTime: 10_000,
  });

  const { data: rebaseStatus } = useQuery<[boolean, string[]]>({
    queryKey: ["git", repoPath, "rebase-status"],
    queryFn: () => api.rebase.status(repoPath!),
    enabled: !!repoPath,
    staleTime: 5_000,
  });

  const repoInfoResults = useQueries({
    queries: recentRepos.map((path) => ({
      queryKey: ["repo", path, "info"],
      queryFn: () => api.repo.info(path),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const invalidate = (path?: string) => {
    const targetPath = path || repoPath;
    if (targetPath) {
      queryClient.invalidateQueries({ queryKey: ["git", targetPath] });
      queryClient.invalidateQueries({ queryKey: ["repo", targetPath] });
    }
  };

  const checkPreflight = async (action: PreflightAction): Promise<boolean> => {
    if (!repoPath) return false;
    try {
      const result = await preflightGate(repoPath, action);
      if (!result.allowed) {
        result.warnings.forEach((w) => showToast(w, "error"));
        return false;
      }
      return true;
    } catch {
      return true; // If preflight fails, allow the operation
    }
  };

  const staged = changes?.filter((c) => c.staged) || [];
  const unstaged = changes?.filter((c) => !c.staged) || [];

  const handleCheckoutBranch = async (branchName: string) => {
    if (!repoPath) return;
    if (!(await checkPreflight("checkout"))) return;
    try {
      await api.branches.checkout(repoPath, branchName);
      invalidate();
      showToast(`Switched to: ${branchName}`);
    } catch (e: any) {
      showToast(e.message || `Failed to checkout ${branchName}`, "error");
    }
  };

  const handleStashPush = async () => {
    if (!repoPath) return;
    try {
      await api.stash.push(repoPath, `Tray stash - ${new Date().toLocaleTimeString()}`, true);
      invalidate();
      showToast("Stashed changes");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    }
  };

  const handleStashPop = async () => {
    if (!repoPath || !stashes || stashes.length === 0) return;
    try {
      await api.stash.pop(repoPath, 0);
      invalidate();
      showToast("Popped stash");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    }
  };

  const handleViewStashDiff = async () => {
    if (!repoPath || !stashes || stashes.length === 0) return;
    if (showStashDiff) { setShowStashDiff(false); return; }
    setStashDiffLoading(true);
    setShowStashDiff(true);
    try {
      const diff = await api.stash.diff(repoPath, 0);
      setStashDiff(diff);
    } catch (e: any) {
      setStashDiff("Failed to load stash diff");
    } finally {
      setStashDiffLoading(false);
    }
  };

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

  const handleDiscard = async (filePath: string) => {
    if (!repoPath) return;
    try {
      await api.commit.discard(repoPath, filePath);
      invalidate();
      showToast(`Discarded ${filePath}`);
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    }
  };

  const handleOpenInEditor = async (filePath: string) => {
    if (!repoPath) return;
    try {
      await api.commit.openInEditor(repoPath, filePath);
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
      const msg = await generateCommit.mutateAsync({ files: changes });
      setCommitMessage(msg.message);
    } catch (e: any) {
      showToast(e.message || "Failed to generate commit message", "error");
    }
  };

  const handleCommit = async () => {
    if (!repoPath || !commitMessage.trim()) return;
    if (!(await checkPreflight("commit"))) return;
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
    if (action === "push" && !(await checkPreflight("push"))) return;
    if (action === "pull" && !(await checkPreflight("pull"))) return;
    setSyncLoading(action);
    try {
      if (action === "fetch") {
        await trackRemoteOp("fetch", () => api.remote.fetch(repoPath));
        showToast("Fetch complete");
      } else if (action === "pull") {
        await trackRemoteOp("pull", () => api.remote.pull(repoPath));
        showToast("Pulled successfully");
      } else if (action === "push") {
        await trackRemoteOp("push", () => api.remote.push(repoPath));
        showToast("Pushed successfully");
      }
      invalidate();
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    } finally {
      setSyncLoading(null);
    }
  };

  const handleOpenRepo = async () => {
    try {
      await api.window.openRepoFromTray();
    } catch (e) {
      showToast("Failed to open repo picker", "error");
    }
  };

  const handleOpenMainApp = async () => {
    try {
      await api.window.showMain();
    } catch (e) {
      logger.error("Failed to open main app", e);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await api.window.openSettings();
    } catch (e) {
      logger.error("Failed to open settings", e);
    }
  };

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
    invalidate(path);
  };

  const changeCount = changes?.length || 0;

  return (
    <div className="h-[520px] w-[400px] bg-transparent p-0 rounded-[16px] overflow-hidden font-sans">
      <div className="flex h-full w-full flex-col bg-surface-0 border border-border-60 rounded-[14px] overflow-hidden select-none shadow-2xl relative">

        {/* Header — h-9 = 36px */}
        <div className="h-9 border-b border-border-60 bg-surface-1 flex items-center justify-between px-3 shrink-0">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-2 text-[11px] font-semibold text-text-primary transition-all max-w-[220px]"
            >
              <FolderOpen size={12} className="text-accent shrink-0" />
              <span className="truncate">{getRepoName(repoPath)}</span>
              <ChevronDown size={9} className={`text-text-muted transition-transform ${repoDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {repoDropdownOpen && (
              <div className="absolute left-0 mt-0.5 w-60 bg-surface-1 border border-border-60 rounded-mac shadow-xl z-50 py-1">
                <div className="px-2.5 pb-1 border-b border-border-40 flex items-center gap-1.5">
                  <Search size={10} className="text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search repos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-[10px] text-text-primary outline-none"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleOpenRepo}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-accent hover:bg-accent-10 transition-colors border-b border-border-40"
                >
                  Open Repo...
                </button>
                <div className="max-h-40 overflow-y-auto mt-0.5">
                  {filteredRepos.length === 0 ? (
                    <div className="px-2.5 py-1.5 text-[10px] text-text-muted italic">No repositories found</div>
                  ) : (
                    <>
                      {groupedRepos.remote.length > 0 && (
                        <div className="py-0.5">
                          <div className="px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                            <span>Remote</span>
                            <span>{groupedRepos.remote.length}</span>
                          </div>
                          {groupedRepos.remote.map((path) => (
                            <button
                              key={path}
                              onClick={() => selectRepo(path)}
                              className={`w-full text-left px-2.5 py-1 text-[10px] hover:bg-accent hover:text-accent-fg transition-colors flex flex-col ${repoPath === path ? "bg-surface-2 font-semibold" : "text-text-secondary"}`}
                            >
                              <span className="font-medium truncate">{path.split("/").pop()}</span>
                              <span className="text-[8px] opacity-75 truncate">{repoInfoByPath.get(path)?.remote || path}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {groupedRepos.local.length > 0 && (
                        <div className="py-0.5">
                          <div className="px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                            <span>Local</span>
                            <span>{groupedRepos.local.length}</span>
                          </div>
                          {groupedRepos.local.map((path) => (
                            <button
                              key={path}
                              onClick={() => selectRepo(path)}
                              className={`w-full text-left px-2.5 py-1 text-[10px] hover:bg-accent hover:text-accent-fg transition-colors flex flex-col ${repoPath === path ? "bg-surface-2 font-semibold" : "text-text-secondary"}`}
                            >
                              <span className="font-medium truncate">{path.split("/").pop()}</span>
                              <span className="text-[8px] opacity-75 truncate">{path}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <button onClick={handleOpenSettings} className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all" title="Settings">
              <Settings size={12} />
            </button>
            <button onClick={handleOpenMainApp} className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all" title="Open Full App">
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* Tabs — compact */}
        {repoPath && (
          <div className="px-2.5 pt-1.5 pb-1 shrink-0 bg-surface-0">
            <div className="flex bg-surface-1 p-0.5 rounded-md border border-border-40">
              {([
                { mode: "commit" as const, icon: <GitCommitHorizontal size={9} />, label: "Commit", badge: changeCount },
                { mode: "recent" as const, icon: <Clock size={9} />, label: "Recent", badge: null },
                { mode: "actions" as const, icon: <Wrench size={9} />, label: "Actions", badge: null },
              ]).map((tab) => (
                <button
                  key={tab.mode}
                  onClick={() => setViewMode(tab.mode)}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition-all flex items-center justify-center gap-0.5 ${viewMode === tab.mode ? "bg-surface-2 text-accent shadow-sm" : "text-text-muted hover:text-text-primary"}`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== null && tab.badge > 0 && (
                    <span className="ml-0.5 min-w-[13px] h-3 px-0.5 rounded-full bg-accent text-accent-fg text-[7px] font-bold leading-[12px]">{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1.5 flex flex-col gap-1.5">
          {repoPath ? (
            <>
              {/* Commit Tab */}
              {viewMode === "commit" && (
                <>
                  <TrayFileChanges
                    repoPath={repoPath}
                    staged={staged}
                    unstaged={unstaged}
                    searchQuery={fileSearchQuery}
                    setSearchQuery={setFileSearchQuery}
                    onStage={(path) => {
                      const file = changes?.find((c) => c.path === path && !c.staged);
                      if (file) handleToggleStage(file);
                    }}
                    onUnstage={(path) => {
                      const file = changes?.find((c) => c.path === path && c.staged);
                      if (file) handleToggleStage(file);
                    }}
                    onStageAll={handleStageAll}
                    onUnstageAll={handleUnstageAll}
                    onDiscard={handleDiscard}
                    onOpenInEditor={handleOpenInEditor}
                    isLoading={isLoadingStatus}
                  />

                  <TrayCommitBox
                    commitMessage={commitMessage}
                    setCommitMessage={setCommitMessage}
                    committing={committing}
                    lintRunning={false}
                    staged={staged}
                    unstaged={unstaged}
                    onCommit={handleCommit}
                    onGenerateCommit={handleAICommitMessage}
                    generateCommitPending={generateCommit.isPending}
                  />

                  {/* AI Commit Split */}
                  {staged.length > 2 && (
                    <TrayCommitSplit
                      repoPath={repoPath}
                      staged={staged}
                      unstaged={unstaged}
                      onCommitted={invalidate}
                    />
                  )}

                  {/* Stash — inline with stash row */}
                  <div className="flex gap-1">
                    <button
                      onClick={handleStashPush}
                      disabled={changes?.length === 0}
                      className="flex-1 h-7 text-[9px] font-semibold rounded-md border border-border-40 bg-surface-1 hover:bg-surface-2 text-text-primary transition-all disabled:opacity-40 flex items-center justify-center"
                    >
                      Stash All
                    </button>
                    {stashes && stashes.length > 0 && (
                      <>
                        <button
                          onClick={handleStashPop}
                          className="flex-1 h-7 text-[9px] font-semibold rounded-md border border-border-40 bg-surface-1 hover:bg-surface-2 text-text-primary transition-all relative flex items-center justify-center"
                        >
                          Pop Stash
                          <span className="absolute -top-1 -right-1 min-w-[13px] rounded-full bg-accent px-0.5 text-[6px] font-bold leading-[10px] text-accent-fg">{stashes.length}</span>
                        </button>
                        <button
                          onClick={handleViewStashDiff}
                          className={`h-7 px-2 text-[9px] font-semibold rounded-md border transition-all flex items-center justify-center ${showStashDiff ? "border-accent-30 bg-accent-5 text-accent" : "border-border-40 bg-surface-1 hover:bg-surface-2 text-text-primary"}`}
                        >
                          Diff
                        </button>
                      </>
                    )}
                  </div>

                  {/* Stash diff preview */}
                  {showStashDiff && (
                    <div className="border border-border-40 bg-surface-0 rounded-md overflow-hidden">
                      <div className="px-2 py-1 border-b border-border-40 flex items-center justify-between">
                        <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Stash Diff</span>
                        <button onClick={() => setShowStashDiff(false)} className="text-[8px] text-text-muted hover:text-text-primary">Close</button>
                      </div>
                      <div className="overflow-y-auto max-h-[120px]">
                        {stashDiffLoading ? (
                          <div className="flex items-center justify-center py-3 text-text-muted gap-1">
                            <Loader2 size={9} className="animate-spin text-accent" />
                            <span className="text-[8px]">Loading...</span>
                          </div>
                        ) : (
                          <pre className="text-[8px] font-mono text-text-primary px-2 py-1.5 whitespace-pre-wrap break-all leading-relaxed">
                            {stashDiff || "No changes"}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Recent Tab */}
              {viewMode === "recent" && (
                <div className="flex flex-col gap-1">
                  {/* Undo last commit */}
                  {recentCommits && recentCommits.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!repoPath) return;
                        try {
                          await api.reflog.undo(repoPath);
                          invalidate();
                          showToast("Undid last commit");
                        } catch (e: any) {
                          showToast(e.message || "Failed to undo", "error");
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-[9px] font-semibold rounded border border-[#ff453a]/30 bg-[#ff453a]/5 text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors"
                    >
                      Undo Last Commit
                    </button>
                  )}

                  {recentCommits && recentCommits.length > 0 ? (
                    recentCommits.map((commit) => (
                      <button
                        key={commit.hash}
                        onClick={async () => {
                          await navigator.clipboard.writeText(commit.hash);
                          showToast("Hash copied");
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-surface-2 rounded transition-colors border border-transparent hover:border-border-40"
                      >
                        <p className="text-[10px] text-text-primary font-medium truncate">{commit.message.split("\n")[0]}</p>
                        <p className="text-[8px] text-text-muted mt-0.5 flex items-center gap-1">
                          <span>{commit.author}</span>
                          <span>·</span>
                          <span>{formatCommitDate(commit.date)}</span>
                          <span className="font-mono bg-accent-10 border border-accent-20 px-1 rounded text-accent">{commit.hash.slice(0, 7)}</span>
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-text-muted gap-1.5">
                      <Clock size={16} />
                      <span className="text-[10px]">No commits found</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {viewMode === "actions" && (
                <TrayActions
                  currentBranch={currentBranch}
                  branches={branches || []}
                  syncStatus={syncStatus}
                  syncLoading={syncLoading}
                  refreshing={false}
                  onFetch={() => handleGitAction("fetch")}
                  onPull={() => handleGitAction("pull")}
                  onPush={() => handleGitAction("push")}
                  onCheckoutBranch={handleCheckoutBranch}
                  gitflowConfig={gitflowConfig || null}
                  onGitFlowAction={(action) => {
                    const mode = action.replace("-start", "").replace("-finish", "") as "feature" | "release" | "hotfix";
                    const isFinish = action.endsWith("-finish");
                    window.dispatchEvent(new CustomEvent("open-gitflow", { detail: { mode, isFinish } }));
                  }}
                  onCreateBranch={async (name) => {
                    if (!repoPath) return;
                    try {
                      await api.branches.create(repoPath, name);
                      invalidate();
                      showToast(`Created branch: ${name}`);
                    } catch (e: any) {
                      showToast(e.message || "Failed to create branch", "error");
                    }
                  }}
                  onCreateTag={async (name) => {
                    if (!repoPath) return;
                    try {
                      await api.tag.create(repoPath, name);
                      invalidate();
                      showToast(`Created tag: ${name}`);
                    } catch (e: any) {
                      showToast(e.message || "Failed to create tag", "error");
                    }
                  }}
                  onCherryPick={async (hash) => {
                    if (!repoPath) return;
                    try {
                      await api.cherryPick.pick(repoPath, hash);
                      invalidate();
                      showToast(`Cherry-picked ${hash.slice(0, 7)}`);
                    } catch (e: any) {
                      showToast(e.message || "Failed to cherry-pick", "error");
                    }
                  }}
                  rebaseInProgress={rebaseStatus?.[0] ?? false}
                  onRebaseContinue={async () => {
                    if (!repoPath) return;
                    try {
                      await trackRemoteOp("Rebase: Continue", (opId) => api.rebase.continue(repoPath, opId));
                      invalidate();
                      showToast("Rebase continued");
                    } catch (e: any) {
                      showToast(e.message || "Failed to continue rebase", "error");
                    }
                  }}
                  onRebaseSkip={async () => {
                    if (!repoPath) return;
                    try {
                      await trackRemoteOp("Rebase: Skip", (opId) => api.rebase.skip(repoPath, opId));
                      invalidate();
                      showToast("Rebase skipped");
                    } catch (e: any) {
                      showToast(e.message || "Failed to skip rebase", "error");
                    }
                  }}
                  onRebaseAbort={async () => {
                    if (!repoPath) return;
                    try {
                      await api.rebase.abort(repoPath);
                      invalidate();
                      showToast("Rebase aborted");
                    } catch (e: any) {
                      showToast(e.message || "Failed to abort rebase", "error");
                    }
                  }}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted gap-2 px-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-40 bg-surface-1">
                <FolderOpen size={16} className="text-accent" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-text-primary">No repository open</div>
                <div className="text-[9px] text-text-muted">Open the main app or pick a recent repo.</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleOpenRepo} className="h-7 px-2.5 rounded-md bg-accent text-accent-fg text-[9px] font-bold transition-all hover:opacity-95">Open Repo</button>
                <button onClick={handleOpenMainApp} className="h-7 px-2.5 rounded-md border border-border-40 bg-surface-1 text-[9px] font-bold text-text-primary transition-all hover:bg-surface-2">Open App</button>
              </div>
              {recentRepos.length > 0 && (
                <div className="mt-1 w-full max-w-[220px] overflow-hidden rounded-md border border-border-40 bg-surface-1 text-left">
                  {recentRepos.slice(0, 4).map((path) => (
                    <button key={path} onClick={() => selectRepo(path)} className="flex w-full flex-col gap-0 border-b border-border-40 px-2 py-1 text-left last:border-b-0 hover:bg-surface-2" title={path}>
                      <span className="truncate text-[9px] font-semibold text-text-primary">{path.split("/").pop() || path}</span>
                      <span className="truncate text-[7px] text-text-muted">{path}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — h-9 = 36px */}
        {repoPath && (
          <div className="h-9 border-t border-border-60 bg-surface-1 flex items-center justify-between px-3 shrink-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[9px] font-semibold text-text-primary truncate max-w-[100px]">{currentBranch}</span>
              {syncStatus && (syncStatus.ahead > 0 || syncStatus.behind > 0) && (
                <span className="flex items-center gap-0.5 text-[8px]">
                  {syncStatus.ahead > 0 && <span className="text-[#30d158]">↑{syncStatus.ahead}</span>}
                  {syncStatus.behind > 0 && <span className="text-[#ff453a]">↓{syncStatus.behind}</span>}
                </span>
              )}
              {preflight && (preflight.merge_in_progress || preflight.rebase_in_progress || preflight.cherry_pick_in_progress || preflight.has_conflicts) && (
                <span className="text-[8px] text-[#ff9f0a] font-semibold" title={
                  preflight.has_conflicts ? "Conflicts" :
                  preflight.merge_in_progress ? "Merge in progress" :
                  preflight.rebase_in_progress ? "Rebase in progress" :
                  "Cherry-pick in progress"
                }>
                  {preflight.has_conflicts ? "⚠ conflicts" :
                   preflight.merge_in_progress ? "⚠ merge" :
                   preflight.rebase_in_progress ? "⚠ rebase" :
                   "⚠ cherry-pick"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleGitAction("pull")}
                disabled={syncLoading !== null}
                className="h-6 px-2 text-[8px] font-semibold rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 flex items-center gap-0.5"
              >
                {syncLoading === "pull" ? <Loader2 size={8} className="animate-spin" /> : "↓ Pull"}
              </button>
              <button
                onClick={() => handleGitAction("push")}
                disabled={syncLoading !== null}
                className="h-6 px-2 text-[8px] font-semibold rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 flex items-center gap-0.5"
              >
                {syncLoading === "push" ? <Loader2 size={8} className="animate-spin" /> : "↑ Push"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
