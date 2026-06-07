import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { api } from "@/api/tauri";
import { trackRemoteOp } from "@/stores/operations";
import { useGitBranches, useGitStatus, useGitSyncStatus } from "@/queries/useGitLog";
import { useGitLfsStatus } from "@/queries/useGitLfs";
import { useMergeStatus } from "@/queries/useGitMerge";
import { useUndoLast } from "@/queries/useGitReflog";
import { useGitFlowDetect } from "@/queries/useGitFlow";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePreflightGate } from "@/hooks/usePreflightGate";
import {
  GitPullRequest,
  GitBranchPlus,
  FileDiff,
  ArrowUpFromLine,
  ArrowDownToLine,
  RefreshCw,
  Search,
  History,
  RotateCcw,
  ArrowLeftRight,
  Archive,
  Settings,
  BarChart3,
  Database,
  PanelLeft,
  PanelRight,
  MoreHorizontal,
  Rocket,
  Tag,
  Zap,
  GitFork,
} from "lucide-react";
import CreateBranchDialog from "@/components/features/dialogs/CreateBranchDialog";
import { RiskSummaryDialog } from "@/components/features/dialogs";
import { generateRiskSummary } from "@/lib/ai";
import type { RiskReport } from "@/lib/risk-scanner";
import { useErrorReporter } from "@/lib/ErrorContext";

const COLLAPSE_BREAKPOINT = 900;

export default function Toolbar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const selectCommit = useUIStore((s) => s.selectCommit);
  const selectFile = useUIStore((s) => s.selectFile);
  const openDialog = useUIStore((s) => s.openDialog);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const queryClient = useQueryClient();
  const { data: branches } = useGitBranches(repoPath);
  const { data: changes } = useGitStatus(repoPath);
  const { data: syncStatus } = useGitSyncStatus(repoPath);
  const { data: lfsStatus } = useGitLfsStatus(repoPath);
  const { data: mergeStatus } = useMergeStatus(repoPath);
  const undoLast = useUndoLast(repoPath);
  const { data: gitflowConfig } = useGitFlowDetect(repoPath);
  const { reportError } = useErrorReporter();
  const [loading, setLoading] = useState<string | null>(null);

  // Preflight gates for risky operations
  const pushGate = usePreflightGate("push");
  const pullGate = usePreflightGate("pull");
  const mergeGate = usePreflightGate("merge");
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [riskDialog, setRiskDialog] = useState<{
    open: boolean;
    report: (RiskReport & { aiSummary?: string }) | null;
    loading: boolean;
  }>({ open: false, report: null, loading: false });

  // Responsive: detect when toolbar needs to collapse
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setCollapsed(width < COLLAPSE_BREAKPOINT);
    });
    observer.observe(el);
    // Initial check
    setCollapsed(el.clientWidth < COLLAPSE_BREAKPOINT);
    return () => observer.disconnect();
  }, []);

  // Close "More" menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [moreOpen]);

  if (!repoPath) return null;

  const doAction = async (action: string, fn: () => Promise<any>) => {
    setLoading(action);
    try {
      await trackRemoteOp(action, fn);
      if (action === "pull" || action === "push" || action === "fetch") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "sync-status"] });
      }
      if (action.startsWith("lfs-")) {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "lfs"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "status"] });
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

  const handlePush = async () => {
    const ok = await pushGate.runPreflight();
    if (!ok) return;
    setRiskDialog({ open: true, report: null, loading: true });
    try {
      const staged = (changes || []).filter((c) => c.staged);
      const diff = staged.length > 0 ? await api.diff.staged(repoPath!).catch(() => "") : "";
      const report = await generateRiskSummary(repoPath!, staged, diff);
      setRiskDialog({ open: true, report, loading: false });
    } catch {
      setRiskDialog({ open: false, report: null, loading: false });
      doAction("push", () => api.remote.push(repoPath!));
    }
  };

  const proceedPush = () => {
    setRiskDialog({ open: false, report: null, loading: false });
    doAction("push", () => api.remote.push(repoPath!));
  };

  const cancelPush = () => {
    setRiskDialog({ open: false, report: null, loading: false });
  };

  const inMerge = mergeStatus?.merging;
  const hasLfsFiles = !!lfsStatus?.installed && lfsStatus.tracked_files.length > 0;
  const lfsDirtyCount = lfsStatus?.dirty_files.length ?? 0;
  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac");
  const syncButtonClass = (action: "pull" | "fetch" | "push") =>
    `h-7 px-4 flex items-center gap-2 text-2xs font-semibold rounded transition-all cursor-pointer disabled:cursor-not-allowed ${
      loading === action
        ? "bg-accent-10 text-accent"
        : loading
          ? "text-text-muted-50 opacity-40"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
    }`;

  const syncIconClass = "h-[13px] w-[13px] shrink-0";

  const moreMenuItems = [
    {
      label: "Search Commits",
      icon: <Search size={12} />,
      action: () => openDialog("search"),
    },
    {
      label: "Stash",
      icon: <Archive size={12} />,
      action: () => openDialog("stash"),
    },
    ...(hasLfsFiles
      ? [
          {
            label: `LFS Pull (${lfsStatus!.tracked_files.length} tracked)`,
            icon: <ArrowDownToLine size={12} />,
            action: () => doAction("lfs-pull", () => api.lfs.pull(repoPath!)),
          },
          {
            label: "LFS Push",
            icon: <ArrowUpFromLine size={12} />,
            action: () => doAction("lfs-push", () => api.lfs.push(repoPath!)),
          },
        ]
      : []),
    {
      label: "Analytics",
      icon: <BarChart3 size={12} />,
      action: () => openDialog("analytics"),
    },
    {
      label: "Undo Last Action",
      icon: <RotateCcw size={12} />,
      action: () => doAction("undo", () => undoLast.mutateAsync()),
      disabled: undoLast.isPending,
    },
    {
      label: "Reflog Browser",
      icon: <History size={12} />,
      action: () => openDialog("reflog"),
    },
  ];

  return (
    <>
      <div
        ref={containerRef}
        role="toolbar"
        aria-label="Main toolbar"
        className={`vibrancy relative z-[200] border-b border-border-60 bg-surface-1-40 backdrop-blur-md flex items-center justify-between px-4 select-none anim-overlay-enter ${
          isMac ? "h-[52px]" : "h-[44px]"
        }`}
        data-tauri-drag-region
      >

        {/* Left Side: Status Capsule Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sidebar Toggle Button (Left) */}
          <button
            onClick={toggleSidebar}
            aria-label="Toggle Left Sidebar"
            aria-pressed={sidebarOpen}
            className={`h-8 w-8 flex items-center justify-center rounded-mac border border-border-40 bg-surface-2-40 hover:bg-surface-2 hover:border-border transition-all cursor-pointer shadow-2xs shrink-0 ${
              sidebarOpen ? "text-[#0a84ff] bg-[#0a84ff]/10" : "text-text-muted hover:text-text-primary"
            }`}
            title="Toggle Left Sidebar (⌘B)"
          >
            <PanelLeft size={14} />
          </button>

          {changes && changes.length > 0 ? (
            <button
              onClick={showChanges}
              aria-label={`${changes.filter(c => c.staged).length} staged, ${changes.filter(c => !c.staged).length} unstaged changes`}
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
                  <span className="text-text-muted-50 font-normal">·</span>
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
              aria-label="No changes — up to date"
              className="flex items-center gap-2.5 px-3.5 h-8 text-2xs font-semibold rounded-full bg-surface-2-60 border border-border-40 hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-2xs shrink-0"
              title="Show current changes"
            >
              <FileDiff size={12} className="text-text-muted" />
              <span>Up to date</span>
            </button>
          )}
        </div>

        {/* Middle Side: Action Button Segment Groups */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Sync Segment Group (Pull, Fetch, Push) — always visible */}
          <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs" role="group" aria-label="Sync actions">
            <button
              className={syncButtonClass("pull")}
              onClick={async () => {
                const ok = await pullGate.runPreflight();
                if (ok) doAction("pull", () => api.remote.pull(repoPath!));
              }}
              disabled={!!loading}
              aria-label={`Pull remote changes${syncStatus?.behind ? ` (${syncStatus.behind} behind)` : ""}`}
              title={loading === "pull" ? "Pulling…" : "Pull remote changes"}
            >
              {loading === "pull" ? (
                <RefreshCw size={13} className={`${syncIconClass} animate-spin`} />
              ) : (
                <ArrowDownToLine size={13} className={`${syncIconClass} text-text-muted`} />
              )}
              <span>{loading === "pull" ? "Pulling…" : "Pull"}</span>
              {!!syncStatus?.behind && (
                <span className="ml-0.5 rounded bg-[#0a84ff]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#0a84ff]">
                  {syncStatus.behind}
                </span>
              )}
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className={syncButtonClass("fetch")}
              onClick={() => doAction("fetch", () => api.remote.fetch(repoPath!))}
              disabled={!!loading}
              aria-label="Fetch remote changes"
              title={loading === "fetch" ? "Fetching…" : "Fetch remote changes"}
            >
              {loading === "fetch" ? (
                <RefreshCw size={13} className={`${syncIconClass} animate-spin`} />
              ) : (
                <RefreshCw size={13} className={`${syncIconClass} text-text-muted`} />
              )}
              <span>{loading === "fetch" ? "Fetching…" : "Fetch"}</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className={syncButtonClass("push")}
              onClick={handlePush}
              disabled={!!loading}
              aria-label={`Push local commits${syncStatus?.ahead ? ` (${syncStatus.ahead} ahead)` : ""}`}
              title={loading === "push" ? "Pushing…" : "Push local commits (risk analysis runs first)"}
            >
              {loading === "push" ? (
                <RefreshCw size={13} className={`${syncIconClass} animate-spin`} />
              ) : (
                <ArrowUpFromLine size={13} className={`${syncIconClass} text-text-muted`} />
              )}
              <span>{loading === "push" ? "Pushing…" : "Push"}</span>
              {!!syncStatus?.ahead && (
                <span className="ml-0.5 rounded bg-[#30d158]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#30d158]">
                  {syncStatus.ahead}
                </span>
              )}
            </button>
          </div>

          {/* LFS Segment Group — visible when not collapsed */}
          {!collapsed && hasLfsFiles && (
            <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs" role="group" aria-label="Git LFS actions">
              <div
                className="h-7 px-2.5 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary"
                title={`${lfsStatus.tracked_files.length} Git LFS tracked file${lfsStatus.tracked_files.length === 1 ? "" : "s"}${lfsDirtyCount > 0 ? `, ${lfsDirtyCount} changed` : ""}`}
              >
                <Database size={13} className="text-accent" />
                <span>LFS</span>
                <span className="ml-0.5 rounded bg-accent-10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                  {lfsStatus.tracked_files.length}
                </span>
                {lfsDirtyCount > 0 && (
                  <span className="rounded bg-[#ff9f0a]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#ff9f0a]">
                    {lfsDirtyCount}
                  </span>
                )}
              </div>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className={`h-7 px-2.5 flex items-center gap-1.5 text-2xs font-semibold rounded transition-all cursor-pointer disabled:cursor-not-allowed ${loading === "lfs-pull" ? "bg-accent-10 text-accent" : loading ? "opacity-40" : "text-text-secondary hover:text-text-primary hover:bg-surface-3"}`}
                onClick={() => doAction("lfs-pull", () => api.lfs.pull(repoPath!))}
                disabled={!!loading}
                title={loading === "lfs-pull" ? "Pulling LFS objects…" : "Pull Git LFS objects"}
              >
                {loading === "lfs-pull" ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <ArrowDownToLine size={13} className="text-text-muted" />
                )}
                <span>{loading === "lfs-pull" ? "Pulling…" : "Pull"}</span>
              </button>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className={`h-7 px-2.5 flex items-center gap-1.5 text-2xs font-semibold rounded transition-all cursor-pointer disabled:cursor-not-allowed ${loading === "lfs-push" ? "bg-accent-10 text-accent" : loading ? "opacity-40" : "text-text-secondary hover:text-text-primary hover:bg-surface-3"}`}
                onClick={() => doAction("lfs-push", () => api.lfs.push(repoPath!))}
                disabled={!!loading}
                title={loading === "lfs-push" ? "Pushing LFS objects…" : "Push Git LFS objects"}
              >
                {loading === "lfs-push" ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <ArrowUpFromLine size={13} className="text-text-muted" />
                )}
                <span>{loading === "lfs-push" ? "Pushing…" : "Push"}</span>
              </button>
            </div>
          )}

          {/* Git Operations Segment Group (Branch, Merge, Stash) — always visible */}
          <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs" role="group" aria-label="Git operations">
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
              onClick={() => setShowBranchDialog(true)}
              aria-label="Create branch"
              title="Create branch"
            >
              <GitBranchPlus size={13} className="text-text-muted" />
              <span>Branch</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className={`h-7 px-4 flex items-center gap-2 text-2xs font-semibold hover:bg-surface-3 rounded transition-all cursor-pointer ${inMerge
                ? "text-[#ff9f0a] bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20"
                : "text-text-secondary hover:text-text-primary"
                }`}
              onClick={async () => {
                if (inMerge) {
                  openDialog("merge");
                } else {
                  const ok = await mergeGate.runPreflight();
                  if (ok) openDialog("merge");
                }
              }}
              aria-label={inMerge ? "Merge in progress — click to resolve conflicts" : "Merge branches"}
              title={inMerge ? "Merge in progress — click to resolve conflicts" : "Merge branches"}
            >
              <ArrowLeftRight size={13} className={inMerge ? "text-[#ff9f0a]" : "text-text-muted"} />
              <span>{inMerge ? "Merge →" : "Merge"}</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
              onClick={() => openDialog("stash")}
              aria-label="Manage stashes"
              title="Manage stashes"
            >
              <Archive size={13} className="text-text-muted" />
              <span>Stash</span>
            </button>
          </div>

          {/* GitFlow Segment Group */}
          {!collapsed && (
            <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs" role="group" aria-label="GitFlow">
              {gitflowConfig?.initialized ? (
                <>
                  <button
                    className="h-7 px-3 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
                    onClick={() => openDialog("gitflow-feature-start")}
                    aria-label="Start new feature branch"
                    title="Start new feature branch"
                  >
                    <Rocket size={13} className="text-amber-400" />
                    <span className="text-amber-400/80">Feature</span>
                  </button>
                  <div className="w-[1px] h-3.5 bg-border-50" />
                  <button
                    className="h-7 px-3 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
                    onClick={() => openDialog("gitflow-release-start")}
                    aria-label="Start new release branch"
                    title="Start new release branch"
                  >
                    <Tag size={13} className="text-blue-400" />
                    <span className="text-blue-400/80">Release</span>
                  </button>
                  <div className="w-[1px] h-3.5 bg-border-50" />
                  <button
                    className="h-7 px-3 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
                    onClick={() => openDialog("gitflow-hotfix-start")}
                    aria-label="Start new hotfix branch"
                    title="Start new hotfix branch"
                  >
                    <Zap size={13} className="text-red-400" />
                    <span className="text-red-400/80">Hotfix</span>
                  </button>
                </>
              ) : (
                <button
                  className="h-7 px-3 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
                  onClick={() => openDialog("gitflow")}
                  aria-label="Initialize GitFlow"
                  title="Initialize GitFlow branching model"
                >
                  <GitFork size={13} className="text-text-muted" />
                  <span>Init GitFlow</span>
                </button>
              )}
            </div>
          )}

          {/* Utilities Segment Group — visible when not collapsed */}
          {!collapsed && (
            <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs" role="group" aria-label="Utilities">
              <button
                className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
                onClick={() => openDialog("search")}
                aria-label="Spotlight Search"
                title="Spotlight Search"
              >
                <Search size={13} className="text-text-muted" />
                <span>Search</span>
              </button>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all cursor-pointer"
                onClick={() => openDialog("analytics")}
                aria-label="View Repository Activity Analytics"
                title="View Repository Activity Analytics"
              >
                <BarChart3 size={13} className="text-text-muted" />
                <span>Analytics</span>
              </button>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded transition-all disabled:opacity-40 cursor-pointer"
                onClick={() => doAction("undo", () => undoLast.mutateAsync())}
                disabled={undoLast.isPending}
                aria-label="Undo last Git action"
                title="Undo last Git action"
              >
                <RotateCcw size={13} className={`${undoLast.isPending ? "animate-spin text-accent" : "text-text-muted"}`} />
                <span>Undo</span>
              </button>
            </div>
          )}

          {/* "More" (⋯) Button — visible when collapsed */}
          {collapsed && (
            <div className="relative" ref={moreRef}>
              <button
                className="h-7 w-7 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-mac transition-all cursor-pointer"
                onClick={() => setMoreOpen(!moreOpen)}
                aria-label="More actions"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                title="More actions"
              >
                <MoreHorizontal size={16} />
              </button>
              {moreOpen && (
                <div role="menu" aria-label="More actions" className="absolute top-full right-0 mt-1 z-50 min-w-[180px] py-1 bg-surface-1 border border-border rounded-mac shadow-lg animate-toast-in">
                  {moreMenuItems.map((item, i) => (
                    <button
                      key={i}
                      role="menuitem"
                      disabled={item.disabled}
                      aria-disabled={item.disabled}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-accent hover:text-accent-fg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      onClick={() => {
                        item.action();
                        setMoreOpen(false);
                      }}
                    >
                      <span className="w-4 h-4 flex items-center text-text-muted">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Integrations */}
        <div className="flex items-center gap-2 shrink-0">
          {/* PR Trigger */}
          <button
            onClick={() => openDialog("merge-request")}
            aria-label="Merge / Pull Requests"
            className="ghost h-8 w-8 flex items-center justify-center text-text-muted hover:text-text-primary rounded-mac hover:bg-surface-2 transition-all cursor-pointer"
            title="Merge / Pull Requests"
          >
            <GitPullRequest size={14} />
          </button>

          <div className="w-[1px] h-3.5 bg-border-60" />

          {/* Details Panel Toggle Button (Right) */}
          <button
            onClick={toggleRightPanel}
            aria-label="Toggle Right Details Panel"
            aria-pressed={rightPanelOpen}
            className={`h-8 w-8 flex items-center justify-center rounded-mac border border-border-40 bg-surface-2-40 hover:bg-surface-2 hover:border-border transition-all cursor-pointer shadow-2xs shrink-0 ${
              rightPanelOpen ? "text-[#0a84ff] bg-[#0a84ff]/10" : "text-text-muted hover:text-text-primary"
            }`}
            title="Toggle Right Details Panel (⌘I)"
          >
            <PanelRight size={14} />
          </button>

          <div className="w-[1px] h-3.5 bg-border-60" />

          {/* Settings */}
          <button
            onClick={() => openDialog("settings")}
            aria-label="Open Settings"
            className="ghost h-8 w-8 flex items-center justify-center text-text-muted hover:text-text-primary rounded-mac hover:bg-surface-2 transition-all cursor-pointer"
            title="Settings (⌘,)"
          >
            <Settings size={14} />
          </button>
        </div>

      </div>

      {showBranchDialog && (
        <CreateBranchDialog
          open={showBranchDialog}
          onClose={() => setShowBranchDialog(false)}
        />
      )}
      <RiskSummaryDialog
        open={riskDialog.open}
        report={riskDialog.report}
        loading={riskDialog.loading}
        action="push"
        onProceed={proceedPush}
        onCancel={cancelPush}
      />
      {pushGate.preflightDialog}
      {pullGate.preflightDialog}
      {mergeGate.preflightDialog}
    </>
  );
}
