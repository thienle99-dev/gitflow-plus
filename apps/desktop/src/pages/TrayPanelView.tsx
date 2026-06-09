import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import { useGitStatus, useGitBranches, useGitSyncStatus } from "@/queries/useGitLog";
import { api, type FileChange, type Commit, type StashEntry, type RepoInfo, type LintDiagnostic } from "@/api/tauri";
import { useCommitDateFormatter } from "@/lib/date";
import { useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import { useGenerateCommitMessage } from "@/queries/useAI";
import { lintCommitMessage, autoFixCommitMessage, type CommitLintResult } from "@/lib/commit-lint";
import { LintWarningDialog } from "@/components/features/dialogs";
import { showToast } from "@/lib/toast";
import { trackRemoteOp } from "@/stores/operations";
import { useRepoAutoRefresh } from "@/hooks/useRepoAutoRefresh";
import { TrayCommitBox } from "./TrayCommitBox";
import { TrayFileChanges } from "./TrayFileChanges";
import { TrayActions } from "./TrayActions";
import {
  ChevronDown,
  FolderOpen,
  Search,
  Loader2,
  RefreshCw,
  ExternalLink,
  Settings,
  Copy,
  MessageSquare,
  Plus,
} from "lucide-react";



export default function TrayPanelView() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const openRepo = useRepoStore((s) => s.openRepo);
  const queryClient = useQueryClient();
  const formatCommitDate = useCommitDateFormatter();

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

  // File search and selection state for TrayFileChanges
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStage, setSelectedFileStage] = useState<"staged" | "unstaged" | null>(null);

  // Commit message linting state
  const [lintResults, setLintResults] = useState<CommitLintResult[]>([]);

  const runLint = useCallback(() => {
    const isCommitLintEnabled = localStorage.getItem("gitflowCommitLintEnabled") !== "false";
    if (isCommitLintEnabled && commitMessage) {
      setLintResults(lintCommitMessage(commitMessage));
    } else {
      setLintResults([]);
    }
  }, [commitMessage]);

  useEffect(() => {
    runLint();
  }, [commitMessage, runLint]);

  useEffect(() => {
    window.addEventListener("gitflow-settings-updated", runLint);
    return () => {
      window.removeEventListener("gitflow-settings-updated", runLint);
    };
  }, [runLint]);

  // Auto-refresh git state on file-watcher events and window focus
  useRepoAutoRefresh(repoPath, {
    includeStash: true,
  });

  // Pre-Commit Gate States
  const [lintWarningOpen, setLintWarningOpen] = useState(false);
  const [pendingCommitMessage, setPendingCommitMessage] = useState("");
  const [gateCommitErrors, setGateCommitErrors] = useState<CommitLintResult[]>([]);
  const [gateCodeDiagnostics, setGateCodeDiagnostics] = useState<LintDiagnostic[]>([]);
  const [gateStrictness, setGateStrictness] = useState<"strict" | "warn">("warn");
  const [lintRunning, setLintRunning] = useState(false);

  // Stash states
  const [stashLoading, setStashLoading] = useState(false);
  const [popLoading, setPopLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close repo dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRepoDropdownOpen(false);
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
    try {
      await api.branches.checkout(repoPath, branchName);
      invalidate();
      showToast(`Switched to branch: ${branchName}`);
    } catch (e: any) {
      showToast(e.message || `Failed to checkout ${branchName}`, "error");
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

  const invalidate = (path?: string) => {
    const targetPath = path || repoPath;
    if (targetPath) {
      queryClient.invalidateQueries({ queryKey: ["git", targetPath] });
      queryClient.invalidateQueries({ queryKey: ["repo", targetPath] });
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

  const performActualCommit = async (msg: string) => {
    setCommitting(true);
    try {
      if (unstaged.length > 0) {
        await api.commit.stageAll(repoPath!);
      }
      await api.commit.commit(repoPath!, msg, false);
      setCommitMessage("");
      invalidate();
      showToast("Committed successfully");
    } catch (e: any) {
      showToast(e.message || String(e), "error");
    } finally {
      setCommitting(false);
    }
  };

  const handleCommit = async () => {
    if (!repoPath || !commitMessage.trim()) return;

    const commitLintEnabled = localStorage.getItem("gitflowCommitLintEnabled") !== "false";
    const codeLintEnabled = localStorage.getItem("gitflowCodeLintEnabled") === "true";
    const strictness = (localStorage.getItem("gitflowLintStrictness") || "warn") as "strict" | "warn";

    let msgErrors: CommitLintResult[] = [];
    let codeIssues: LintDiagnostic[] = [];

    const filesToLintExist = (changes?.length || 0) > 0;

    if (commitLintEnabled) {
      msgErrors = lintCommitMessage(commitMessage);
    }

    if (codeLintEnabled && filesToLintExist) {
      setLintRunning(true);
      try {
        if (unstaged.length > 0) {
          await api.commit.stageAll(repoPath);
          invalidate();
        }
        const res = await api.lint.run(repoPath);
        codeIssues = res.diagnostics;
      } catch (err) {
        console.error("Linter execution failed:", err);
      } finally {
        setLintRunning(false);
      }
    }

    const hasErrors = msgErrors.some(e => e.severity === "error") || codeIssues.some(d => d.severity === "error");
    const hasWarnings = msgErrors.some(e => e.severity === "warning") || codeIssues.some(d => d.severity === "warning");

    if (hasErrors || hasWarnings) {
      setGateCommitErrors(msgErrors);
      setGateCodeDiagnostics(codeIssues);
      setGateStrictness(strictness);
      setPendingCommitMessage(commitMessage);
      setLintWarningOpen(true);
      return;
    }

    await performActualCommit(commitMessage);
  };

  const handleGitAction = async (action: "fetch" | "pull" | "push") => {
    if (!repoPath) return;
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

  const handleOpenRepo = async () => {
    try {
      await api.window.openRepoFromTray();
    } catch (e) {
      console.error("[Tray] Error opening repo:", e);
      showToast("Failed to open repo picker", "error");
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
    invalidate(path);
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
        <div className="px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-text-muted-80 flex items-center justify-between">
          <span>{label}</span>
          <span>{paths.length}</span>
        </div>
        {paths.map(renderRepoItem)}
      </div>
    );
  };

  return (
    <div className="h-[584px] w-[384px] bg-transparent p-0 rounded-[20px] overflow-hidden font-sans">
      <div className="flex h-full w-full flex-col bg-surface-0 border border-border-60 rounded-[18px] overflow-hidden select-none shadow-2xl relative">
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
            <div className="absolute left-0 mt-1 w-64 bg-surface-1 border border-border-60 rounded-mac shadow-xl z-50 py-1.5 anim-palette-enter">
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
              <button
                onClick={handleOpenRepo}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent-10 transition-colors border-b border-border-40 cursor-pointer"
              >
                <Plus size={10} />
                <span>Open Repo...</span>
              </button>
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
              <TrayFileChanges
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
                selectedFile={selectedFile}
                selectedFileStage={selectedFileStage}
                onSelectFile={(path, stage) => {
                  setSelectedFile(path);
                  setSelectedFileStage(stage);
                }}
                isLoading={isLoadingStatus}
                stashes={stashes}
                stashLoading={stashLoading}
                popLoading={popLoading}
                onStashPush={handleStashPush}
                onStashPop={handleStashPop}
              />

              <TrayCommitBox
                commitMessage={commitMessage}
                setCommitMessage={setCommitMessage}
                lintResults={lintResults}
                committing={committing}
                lintRunning={lintRunning}
                staged={staged}
                unstaged={unstaged}
                onCommit={handleCommit}
                onGenerateCommit={handleAICommitMessage}
                generateCommitPending={generateCommit.isPending}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col border border-border-40 bg-surface-1-40 rounded-mac p-2.5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border-40 pb-1.5 shrink-0">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Recent Commits
                </span>
                <span className="text-[8px] text-text-muted">Click commit to copy hash</span>
              </div>

              <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 anim-overlay-enter">
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
                      className="group min-h-[58px] w-full text-left p-2.5 rounded hover:bg-surface-2 active:bg-surface-3 transition-all flex flex-col justify-center gap-1.5 border border-transparent hover:border-border-40 cursor-pointer"
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
                          <span className="text-text-secondary">{formatCommitDate(commit.date)}</span>
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
          <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted gap-3 px-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-40 bg-surface-1">
              <FolderOpen size={20} className="text-accent" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-text-primary">No repository open</div>
              <div className="text-[10px] leading-relaxed text-text-muted">
                Open the main app or pick a recent repository.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenRepo}
                className="h-7 px-3 rounded bg-accent text-accent-fg text-[10px] font-bold transition-all hover:opacity-95 cursor-pointer"
              >
                Open Repo
              </button>
              <button
                type="button"
                onClick={handleOpenMainApp}
                className="h-7 px-3 rounded border border-border-40 bg-surface-1 text-[10px] font-bold text-text-primary transition-all hover:bg-surface-2 cursor-pointer"
              >
                Open App
              </button>
              {recentRepos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRepoDropdownOpen(true)}
                  className="h-7 px-3 rounded border border-border-40 bg-surface-1 text-[10px] font-bold text-text-primary transition-all hover:bg-surface-2 cursor-pointer"
                >
                  Recent
                </button>
              )}
            </div>
            {recentRepos.length > 0 && (
              <div className="mt-1 w-full max-w-[250px] overflow-hidden rounded border border-border-40 bg-surface-1-60 text-left">
                {recentRepos.slice(0, 4).map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => selectRepo(path)}
                    className="flex w-full flex-col gap-0.5 border-b border-border-40 px-2.5 py-1.5 text-left last:border-b-0 hover:bg-surface-2 cursor-pointer"
                    title={path}
                  >
                    <span className="truncate text-[10px] font-semibold text-text-primary">
                      {path.split("/").pop() || path}
                    </span>
                    <span className="truncate text-[8px] text-text-muted">{path}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Git Actions Bar */}
      {repoPath ? (
        <TrayActions
          currentBranch={currentBranch}
          branches={branches || []}
          syncStatus={syncStatus}
          syncLoading={syncLoading}
          refreshing={refreshing}
          onFetch={() => handleGitAction("fetch")}
          onPull={() => handleGitAction("pull")}
          onPush={() => handleGitAction("push")}
          onCheckoutBranch={handleCheckoutBranch}
        />
      ) : (
        <div className="h-12 border-t border-border-60 bg-surface-1 flex items-center justify-between px-3.5 shrink-0">
          <span className="text-[9px] font-mono text-text-muted">Ready</span>
        </div>
      )}

      <LintWarningDialog
        open={lintWarningOpen}
        onClose={() => setLintWarningOpen(false)}
        commitErrors={gateCommitErrors}
        codeDiagnostics={gateCodeDiagnostics}
        strictness={gateStrictness}
        onCommitAnyway={async () => {
          setLintWarningOpen(false);
          await performActualCommit(pendingCommitMessage);
        }}
        onAutoFixCommit={() => {
          const fixed = autoFixCommitMessage(pendingCommitMessage, gateCommitErrors);
          setPendingCommitMessage(fixed);
          setCommitMessage(fixed);
          const reErrors = lintCommitMessage(fixed);
          setGateCommitErrors(reErrors);
          if (reErrors.length === 0 && gateCodeDiagnostics.length === 0) {
            setLintWarningOpen(false);
            performActualCommit(fixed);
          }
        }}
      />
      </div>
    </div>
  );
}
