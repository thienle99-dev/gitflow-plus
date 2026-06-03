import { useEffect, useCallback, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import type { Commit, FileChange, Branch, RepoInfo, SyncStatus } from "@/api/tauri";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import Toolbar from "@/components/layout/Toolbar";
import Sidebar from "@/components/features/sidebar/Sidebar";
import CommitGraph from "@/components/features/graph/CommitGraph";
import RightPanel from "@/components/layout/RightPanel";
import BottomBar from "@/components/layout/BottomBar";
import { SearchDialog, KeyboardShortcutsModal, CherryPickDialog, SettingsDialog, AnalyticsDialog, CreateBranchDialog, MergeRequestDialog, MergePreviewDialog, CloneDialog, FeatureGuideDialog, OnboardingWizard, isOnboardingComplete, BranchCompareDialog } from "@/components/features/dialogs";
import ErrorBoundary from "@/components/ui/feedback/ErrorBoundary";
import { AlertOctagon, RefreshCw, Trash2 } from "lucide-react";

export default function MainLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeDialog = useUIStore((s) => s.activeDialog);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const mergeTargetBranch = useUIStore((s) => s.mergeTargetBranch);
  const compareBranchTarget = useUIStore((s) => s.compareBranchTarget);
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedRef = useRepoStore((s) => s.selectedRef);
  const openRepo = useRepoStore((s) => s.openRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const toggleTheme = useRepoStore((s) => s.toggleTheme);
  const openDialogState = useUIStore((s) => s.openDialog);
  const queryClient = useQueryClient();
  const invalidateTimersRef = useRef<Map<string, number>>(new Map());
  const lastFocusRefreshRef = useRef(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());

  // Sync onboarding from activeDialog ("onboarding" opened from BottomBar etc.)
  useEffect(() => {
    if (activeDialog === "onboarding") {
      setShowOnboarding(true);
      closeDialog();
    }
  }, [activeDialog, closeDialog]);

  const scheduleInvalidate = useCallback((queryKey: unknown[], delay = 250) => {
    const key = JSON.stringify(queryKey);
    const existing = invalidateTimersRef.current.get(key);
    if (existing !== undefined) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(() => {
      invalidateTimersRef.current.delete(key);
      queryClient.invalidateQueries({ queryKey });
    }, delay);
    invalidateTimersRef.current.set(key, timer);
  }, [queryClient]);

  useEffect(() => {
    return () => {
      invalidateTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      invalidateTimersRef.current.clear();
    };
  }, []);

  // Start/stop file watcher when repo changes
  useEffect(() => {
    if (!repoPath) return;
    api.watcher.start(repoPath).catch(console.error);
    return () => {
      api.watcher.stop().catch(console.error);
    };
  }, [repoPath]);

  // Parallel startup prefetch — warm critical query caches immediately on repo open
  useEffect(() => {
    if (!repoPath) return;
    Promise.all([
      queryClient.prefetchQuery<Commit[]>({
        queryKey: ["git", repoPath, "log"],
        queryFn: () => api.log(repoPath, 0, 200),
        staleTime: 30_000,
      }),
      queryClient.prefetchQuery<FileChange[]>({
        queryKey: ["git", repoPath, "status"],
        queryFn: () => api.status(repoPath),
        staleTime: 0,
      }),
      queryClient.prefetchQuery<Branch[]>({
        queryKey: ["git", repoPath, "branches"],
        queryFn: () => api.branches.list(repoPath),
        staleTime: 15_000,
      }),
      queryClient.prefetchQuery<RepoInfo>({
        queryKey: ["git", repoPath, "info"],
        queryFn: () => api.repo.info(repoPath),
      }),
      queryClient.prefetchQuery<SyncStatus>({
        queryKey: ["git", repoPath, "sync-status"],
        queryFn: () => api.remote.getSyncStatus(repoPath),
        staleTime: 5_000,
      }),
    ]).catch((err) => {
      console.debug("[prefetch] startup queries failed", err);
    });
  }, [repoPath, queryClient]);

  // Listen for file watcher events and invalidate queries
  useEffect(() => {
    const unlisten = listen<{ event_type: string }>("repo:changed", (event) => {
      if (!repoPath) return;
      const type = event.payload.event_type;
      if (type === "worktree") {
        scheduleInvalidate(["git", repoPath, "status"]);
        scheduleInvalidate(["git", repoPath, "submodules"]);
        scheduleInvalidate(["git", repoPath, "lfs"]);
      } else if (type === "refs") {
        scheduleInvalidate(["git", repoPath, "branches"]);
        scheduleInvalidate(["git", repoPath, "log"]);
        scheduleInvalidate(["git", repoPath, "sync-status"]);
      } else if (type === "head") {
        scheduleInvalidate(["git", repoPath, "info"]);
        scheduleInvalidate(["git", repoPath, "branches"]);
        scheduleInvalidate(["git", repoPath, "log"]);
        scheduleInvalidate(["git", repoPath, "sync-status"]);
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, [repoPath, scheduleInvalidate]);

  // Auto-fetch: periodically run git fetch in background
  useEffect(() => {
    if (!repoPath) return;

    const autoFetchEnabled = localStorage.getItem("gitflowAutoFetch") !== "false";
    if (!autoFetchEnabled) return;

    const minutes = Number(localStorage.getItem("gitflowFetchIntervalMinutes") || "10");
    const safeMinutes = Number.isFinite(minutes) ? Math.min(60, Math.max(5, minutes)) : 10;
    const intervalMs = safeMinutes * 60_000;

    const runFetch = () => {
      api.remote.fetch(repoPath).then(() => {
        scheduleInvalidate(["git", repoPath, "sync-status"]);
        scheduleInvalidate(["git", repoPath, "branches"]);
      }).catch(() => {
        // Silently ignore — network errors are transient
      });
    };

    // Initial fetch after a short delay (don't block repo open)
    const initialTimer = window.setTimeout(runFetch, 5_000);

    const interval = window.setInterval(runFetch, intervalMs);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [repoPath, scheduleInvalidate]);

  // Listen for open-dialog requests from other windows (e.g. tray popover)
  useEffect(() => {
    const unlisten = listen<string>("open-dialog", (event) => {
      openDialogState(event.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [openDialogState]);

  const handleOpenRepo = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        openRepo(selected as string);
      }
    } catch (e) {
      const path = prompt("Enter repository path:");
      if (path) openRepo(path);
    }
  };

  // Listen for native macOS/Tauri menu events
  useEffect(() => {
    const unlisten = listen<string>("menu-action", async (event) => {
      const action = event.payload;
      if (action === "open-repo") {
        await handleOpenRepo();
      } else if (action === "close-repo") {
        closeRepo();
        useUIStore.setState({
          selectedCommit: null,
          selectedFile: null,
          selectedFileStage: null,
          activeDialog: null,
        });
      } else if (action === "toggle-sidebar") {
        toggleSidebar();
      } else if (action === "refresh") {
        if (repoPath) {
          queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
          api.remote.fetch(repoPath).catch(console.error);
        }
      } else if (action === "toggle-theme") {
        toggleTheme();
      } else if (action === "open-settings") {
        openDialogState("settings");
      } else if (action === "help-docs") {
        window.open("https://github.com/thienle99-dev/gitflow-plus", "_blank");
      }
    });
    return () => {
      unlisten.then((f) => f());
    }
  }, [repoPath, queryClient, closeRepo, toggleSidebar, toggleTheme, openDialogState]);

  // Auto-refresh Git state when the app window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (repoPath) {
        const now = Date.now();
        if (now - lastFocusRefreshRef.current < 5_000) return;
        lastFocusRefreshRef.current = now;
        scheduleInvalidate(["git", repoPath, "status"]);
        scheduleInvalidate(["git", repoPath, "sync-status"]);
        scheduleInvalidate(["git", repoPath, "branches"]);
        scheduleInvalidate(["git", repoPath, "lfs"]);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [repoPath, scheduleInvalidate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Stage/unstage shortcuts (only when no dialog is open)
      if (!activeDialog && repoPath) {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
          e.preventDefault();
          api.commit.stageAll(repoPath!).then(() =>
            queryClient.invalidateQueries({ queryKey: ["git", repoPath] })
          ).catch(console.error);
          return;
        }
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          api.commit.stageAll(repoPath!).then(() =>
            queryClient.invalidateQueries({ queryKey: ["git", repoPath] })
          ).catch(console.error);
          return;
        }
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "u" || e.key === "U")) {
          e.preventDefault();
          api.commit.unstageAll(repoPath!).then(() =>
            queryClient.invalidateQueries({ queryKey: ["git", repoPath] })
          ).catch(console.error);
          return;
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        openDialogState("settings");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "?") {
        e.preventDefault();
        openDialogState("keyboard-shortcuts");
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        openDialogState("feature-guide");
      }
      // Escape closes dialogs
      if (e.key === "Escape" && activeDialog) {
        e.preventDefault();
        closeDialog();
      }
    },
    [toggleSidebar, activeDialog, closeDialog, repoPath, queryClient],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const overlayDialog = activeDialog && activeDialog !== "stash" && activeDialog !== "tag"
    ? activeDialog
    : null;

  // Dialog overlay components
  const dialogComponents: Record<string, React.ReactNode> = {
    search: <SearchDialog open={true} onClose={closeDialog} />,
    settings: <SettingsDialog onClose={closeDialog} />,
    "ai-settings": <SettingsDialog onClose={closeDialog} />,
    "accounts-settings": <SettingsDialog initialTab="accounts" onClose={closeDialog} />,
    "keyboard-shortcuts": <KeyboardShortcutsModal open={true} onClose={closeDialog} />,
    "cherry-pick": (
      <CherryPickDialog
        open={true}
        commitHash={selectedCommit || ""}
        onClose={closeDialog}
      />
    ),
    "create-branch": <CreateBranchDialog open={true} onClose={closeDialog} />,
    analytics: <AnalyticsDialog open={true} onClose={closeDialog} />,
    "merge-request": <MergeRequestDialog onClose={closeDialog} />,
    merge: <MergePreviewDialog initialBranch={mergeTargetBranch ?? undefined} onClose={closeDialog} />,
    "branch-compare": compareBranchTarget ? (
      <BranchCompareDialog
        baseBranch={selectedRef ?? ""}
        targetBranch={compareBranchTarget}
        onClose={closeDialog}
      />
    ) : null,
    "clone": <CloneDialog open={true} onClose={closeDialog} />,
    "feature-guide": <FeatureGuideDialog open={true} onClose={closeDialog} />,
  };

  const dialogOverlay = overlayDialog ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`bg-surface-0 rounded-mac shadow-xl border border-border overflow-hidden ${
        overlayDialog === "merge-request"
          ? "h-[min(760px,88vh)] w-[min(1180px,92vw)]"
          : overlayDialog === "settings" || overlayDialog === "ai-settings" || overlayDialog === "accounts-settings"
            ? "h-[min(680px,88vh)] w-[min(900px,90vw)]"
          : overlayDialog === "branch-compare"
            ? "h-[min(700px,85vh)] w-[min(900px,92vw)]"
          : "min-w-[480px] max-w-[600px] max-h-[80vh]"
      }`}>
        {dialogComponents[overlayDialog] || (
          <div className="p-4 text-text-muted text-sm">
            Unknown dialog: {overlayDialog}
            <button className="ghost text-xs ml-4" onClick={closeDialog}>Close</button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  if (!repoPath) {
    return (
      <div className="h-full min-h-0">
        <WelcomeScreen onOpen={handleOpenRepo} />
        {dialogOverlay}
        <OnboardingWizard open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </div>
    );
  }

function InlineErrorFallback({ name }: { name: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-surface-1 text-center space-y-2 border border-dashed border-border select-none animate-in fade-in duration-200">
      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#ff453a] shrink-0">
        <AlertOctagon size={16} />
      </div>
      <div className="space-y-0.5">
        <h4 className="text-2xs font-semibold text-text-primary">{name} crashed</h4>
        <p className="text-3xs text-text-muted max-w-[200px] leading-normal mx-auto">
          An error occurred in this panel. You can reload the app to restore it.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="h-6 px-2.5 bg-surface-3 hover:bg-surface-4 text-text-primary rounded text-3xs font-semibold flex items-center gap-1 transition-all shadow-2xs mt-1 cursor-pointer"
      >
        <RefreshCw size={10} />
        <span>Reload</span>
      </button>
    </div>
  );
}

  return (
    <div className="h-full min-h-0 flex flex-col">
      <Toolbar />
      <div className="flex-1 min-h-0 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="main-layout" className="h-full min-h-0">
          {sidebarOpen && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={35} className="h-full min-h-0">
                <div className="vibrancy h-full border-r border-border overflow-hidden">
                  <ErrorBoundary fallback={<InlineErrorFallback name="Sidebar" />}>
                    <Sidebar />
                  </ErrorBoundary>
                </div>
              </Panel>
              <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-accent transition-colors cursor-col-resize" />
            </>
          )}
          <Panel defaultSize={sidebarOpen ? 50 : 70} minSize={30} className="h-full min-h-0">
            <div className="h-full min-h-0 overflow-hidden bg-surface-0">
              <ErrorBoundary fallback={<InlineErrorFallback name="Commit Graph" />}>
                <CommitGraph />
              </ErrorBoundary>
            </div>
          </Panel>
          <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-accent transition-colors cursor-col-resize" />
          <Panel defaultSize={34} minSize={22} maxSize={55} className="h-full min-h-0">
            <div className="h-full min-h-0 overflow-hidden">
              <ErrorBoundary fallback={<InlineErrorFallback name="Details Panel" />}>
                <RightPanel />
              </ErrorBoundary>
            </div>
          </Panel>
        </PanelGroup>
      </div>
      <BottomBar />

      {/* Dialog overlays */}
      {dialogOverlay}
      <OnboardingWizard open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}

function WelcomeScreen({ onOpen }: { onOpen: () => void }) {
  const openRepo = useRepoStore((s) => s.openRepo);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const removeRecentRepo = useRepoStore((s) => s.removeRecentRepo);

  return (
    <div className="h-full flex items-center justify-center bg-surface-0">
      <div className="text-center space-y-6 max-w-md w-[320px]">
        <div className="text-4xl font-semibold text-text-secondary">GitFlow Desktop</div>
        <p className="text-text-muted text-sm">
          Open a local Git repository to get started
        </p>
        <button
          onClick={onOpen}
          className="px-6 py-2 bg-accent text-accent-fg rounded-mac text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open Repository
        </button>
        {recentRepos.length > 0 && (
          <div className="mt-8">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 text-left px-2">
              Recent Repositories
            </div>
            <div className="space-y-1">
              {recentRepos.map((repo) => (
                <div
                  key={repo}
                  className="group flex items-center justify-between px-3 py-1.5 text-sm rounded-mac hover:bg-surface-2 transition-all gap-2"
                >
                  <button
                    onClick={() => openRepo(repo)}
                    className="flex-1 text-left text-text-secondary hover:text-text-primary transition-colors truncate text-xs font-medium cursor-pointer"
                    title={repo}
                  >
                    {repo.split(/[/\\]/).filter(Boolean).pop() || repo}
                  </button>
                  <button
                    onClick={() => removeRecentRepo(repo)}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-surface-3 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    title="Remove from list"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
