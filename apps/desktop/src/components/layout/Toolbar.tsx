import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { api } from "@/api/tauri";
import { useGitBranches, useGitStatus, useGitSyncStatus } from "@/queries/useGitLog";
import { useGitLfsStatus } from "@/queries/useGitLfs";
import { useMergeStatus } from "@/queries/useGitMerge";
import { useUndoLast } from "@/queries/useGitReflog";
import { useState, useEffect, useRef, useCallback } from "react";
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
  Database,
  PanelLeft,
  PanelRight,
  MoreHorizontal,
} from "lucide-react";
import CreateBranchDialog from "@/components/features/dialogs/CreateBranchDialog";
import { RiskSummaryDialog } from "@/components/features/dialogs";
import { generateRiskSummary } from "@/lib/ai";
import type { RiskReport } from "@/lib/risk-scanner";
import { useErrorReporter } from "@/lib/ErrorContext";
import SettingsDropdown from "@/components/ui/theme/SettingsDropdown";

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
  const { reportError } = useErrorReporter();
  const [loading, setLoading] = useState<string | null>(null);
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
      await fn();
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
  ];

  return (
    <>
      <div
        ref={containerRef}
        className={`vibrancy relative z-[200] border-b border-border-60 bg-surface-1-40 backdrop-blur-md flex items-center justify-between px-4 select-none animate-in fade-in duration-200 ${
          isMac ? "h-[52px]" : "h-[44px]"
        }`}
        data-tauri-drag-region
      >

        {/* Left Side: Status Capsule Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sidebar Toggle Button (Left) */}
          <button
            onClick={toggleSidebar}
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
              className="flex items-center gap-2.5 px-3.5 h-8 text-2xs font-semibold rounded-full bg-surface-2-60 border border-border-40 hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-2xs shrink-0"
              title="Show current changes"
            >
              <FileDiff size={12} className="text-text-muted" />
              <span>Up to date</span>
            </button>
          )}
        </div>

        {/* Middle Side: Action Button Segment Groups */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Sync Segment Group (Pull, Fetch, Push) — always visible */}
          <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs">
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
              onClick={() => doAction("pull", () => api.remote.pull(repoPath!))}
              disabled={!!loading}
              title="Pull remote changes"
            >
              <ArrowDownToLine size={13} className="text-text-muted group-hover:text-text-primary" />
              <span>Pull</span>
              {!!syncStatus?.behind && (
                <span className="ml-0.5 rounded-[3px] bg-[#0a84ff]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#0a84ff]">
                  {syncStatus.behind}
                </span>
              )}
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
              onClick={() => doAction("fetch", () => api.remote.fetch(repoPath!))}
              disabled={!!loading}
              title="Fetch remote changes"
            >
              <RefreshCw size={13} className={`${loading === "fetch" ? "animate-spin text-accent" : "text-text-muted"}`} />
              <span>Fetch</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
              onClick={handlePush}
              disabled={!!loading}
              title="Push local commits (risk analysis runs first)"
            >
              <ArrowUpFromLine size={13} className="text-text-muted" />
              <span>Push</span>
              {!!syncStatus?.ahead && (
                <span className="ml-0.5 rounded-[3px] bg-[#30d158]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#30d158]">
                  {syncStatus.ahead}
                </span>
              )}
            </button>
          </div>

          {/* LFS Segment Group — visible when not collapsed */}
          {!collapsed && hasLfsFiles && (
            <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs">
              <div
                className="h-7 px-2.5 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary"
                title={`${lfsStatus.tracked_files.length} Git LFS tracked file${lfsStatus.tracked_files.length === 1 ? "" : "s"}${lfsDirtyCount > 0 ? `, ${lfsDirtyCount} changed` : ""}`}
              >
                <Database size={13} className="text-accent" />
                <span>LFS</span>
                <span className="ml-0.5 rounded-[3px] bg-accent-10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                  {lfsStatus.tracked_files.length}
                </span>
                {lfsDirtyCount > 0 && (
                  <span className="rounded-[3px] bg-[#ff9f0a]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#ff9f0a]">
                    {lfsDirtyCount}
                  </span>
                )}
              </div>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className="h-7 px-2.5 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
                onClick={() => doAction("lfs-pull", () => api.lfs.pull(repoPath!))}
                disabled={!!loading}
                title="Pull Git LFS objects"
              >
                <ArrowDownToLine size={13} className="text-text-muted" />
                <span>Pull</span>
              </button>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className="h-7 px-2.5 flex items-center gap-1.5 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
                onClick={() => doAction("lfs-push", () => api.lfs.push(repoPath!))}
                disabled={!!loading}
                title="Push Git LFS objects"
              >
                <ArrowUpFromLine size={13} className="text-text-muted" />
                <span>Push</span>
              </button>
            </div>
          )}

          {/* Git Operations Segment Group (Branch, Merge, Stash) — always visible */}
          <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs">
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
              onClick={() => setShowBranchDialog(true)}
              title="Create branch"
            >
              <GitBranchPlus size={13} className="text-text-muted" />
              <span>Branch</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className={`h-7 px-4 flex items-center gap-2 text-2xs font-semibold hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer ${inMerge
                ? "text-[#ff9f0a] bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20"
                : "text-text-secondary hover:text-text-primary"
                }`}
              onClick={() => openDialog("merge")}
              title={inMerge ? "Merge in progress — click to resolve conflicts" : "Merge branches"}
            >
              <ArrowLeftRight size={13} className={inMerge ? "text-[#ff9f0a]" : "text-text-muted"} />
              <span>{inMerge ? "Merge →" : "Merge"}</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-50" />
            <button
              className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
              onClick={() => openDialog("stash")}
              title="Manage stashes"
            >
              <Archive size={13} className="text-text-muted" />
              <span>Stash</span>
            </button>
          </div>

          {/* Utilities Segment Group — visible when not collapsed */}
          {!collapsed && (
            <div className="flex items-center bg-surface-2-40 border border-border-40 rounded-mac p-0.5 shadow-2xs">
              <button
                className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
                onClick={() => openDialog("search")}
                title="Spotlight Search"
              >
                <Search size={13} className="text-text-muted" />
                <span>Search</span>
              </button>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all cursor-pointer"
                onClick={() => openDialog("analytics")}
                title="View Repository Activity Analytics"
              >
                <BarChart3 size={13} className="text-text-muted" />
                <span>Analytics</span>
              </button>
              <div className="w-[1px] h-3.5 bg-border-50" />
              <button
                className="h-7 px-4 flex items-center gap-2 text-2xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-[5px] transition-all disabled:opacity-40 cursor-pointer"
                onClick={() => doAction("undo", () => undoLast.mutateAsync())}
                disabled={undoLast.isPending}
                title="Undo last Git action"
              >
                <RotateCcw size={13} className="text-text-muted" />
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
                title="More actions"
              >
                <MoreHorizontal size={16} />
              </button>
              {moreOpen && (
                <div className="absolute top-full right-0 mt-1 z-50 min-w-[180px] py-1 bg-surface-1 border border-border rounded-mac shadow-lg animate-toast-in">
                  {moreMenuItems.map((item, i) => (
                    <button
                      key={i}
                      disabled={item.disabled}
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

        {/* Right Side: Integrations (PR & SettingsDropdown) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* PR Trigger */}
          <button
            onClick={() => openDialog("merge-request")}
            className="ghost h-8 w-8 flex items-center justify-center text-text-muted hover:text-text-primary rounded-mac hover:bg-surface-2 transition-all cursor-pointer"
            title="Merge / Pull Requests"
          >
            <GitPullRequest size={14} />
          </button>

          <div className="w-[1px] h-3.5 bg-border-60" />

          {/* Details Panel Toggle Button (Right) */}
          <button
            onClick={toggleRightPanel}
            className={`h-8 w-8 flex items-center justify-center rounded-mac border border-border-40 bg-surface-2-40 hover:bg-surface-2 hover:border-border transition-all cursor-pointer shadow-2xs shrink-0 ${
              rightPanelOpen ? "text-[#0a84ff] bg-[#0a84ff]/10" : "text-text-muted hover:text-text-primary"
            }`}
            title="Toggle Right Details Panel (⌘I)"
          >
            <PanelRight size={14} />
          </button>

          <div className="w-[1px] h-3.5 bg-border-60" />

          {/* Settings & Quick Actions */}
          <SettingsDropdown
            onOpenSettings={() => openDialog("settings")}
            onOpenKeyboardShortcuts={() => openDialog("keyboard-shortcuts")}
            onOpenFeatureGuide={() => openDialog("feature-guide")}
            onOpenHealthCheck={() => openDialog("health-check")}
            onOpenDiagnostics={() => openDialog("diagnostics")}
          />
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
    </>
  );
}
