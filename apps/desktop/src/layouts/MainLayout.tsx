import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
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
import { SearchDialog, KeyboardShortcutsModal, CherryPickDialog, SettingsDialog, AnalyticsDialog, CreateBranchDialog } from "@/components/features/dialogs";
import ErrorBoundary from "@/components/ui/feedback/ErrorBoundary";
import { AlertOctagon, RefreshCw } from "lucide-react";

export default function MainLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeDialog = useUIStore((s) => s.activeDialog);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const repoPath = useRepoStore((s) => s.repoPath);
  const openRepo = useRepoStore((s) => s.openRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const toggleTheme = useRepoStore((s) => s.toggleTheme);
  const openDialogState = useUIStore((s) => s.openDialog);
  const queryClient = useQueryClient();

  // Start/stop file watcher when repo changes
  useEffect(() => {
    if (!repoPath) return;
    api.watcher.start(repoPath).catch(console.error);
    return () => {
      api.watcher.stop().catch(console.error);
    };
  }, [repoPath]);

  // Listen for file watcher events and invalidate queries
  useEffect(() => {
    const unlisten = listen<{ event_type: string }>("repo:changed", (event) => {
      if (!repoPath) return;
      const type = event.payload.event_type;
      if (type === "worktree") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "status"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "submodules"] });
      } else if (type === "refs") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "sync-status"] });
      } else if (type === "head") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "info"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "sync-status"] });
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, [repoPath, queryClient]);

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
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "status"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "sync-status"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [repoPath, queryClient]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Stage/unstage shortcuts (only when no dialog is open)
      if (!activeDialog) {
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

  if (!repoPath) {
    return <WelcomeScreen onOpen={handleOpenRepo} />;
  }

  const overlayDialog = activeDialog && activeDialog !== "stash" && activeDialog !== "tag"
    ? activeDialog
    : null;

  // Dialog overlay components
  const dialogComponents: Record<string, React.ReactNode> = {
    search: <SearchDialog open={true} onClose={closeDialog} />,
    settings: <SettingsDialog onClose={closeDialog} />,
    "ai-settings": <SettingsDialog onClose={closeDialog} />,
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
  };

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
              <Panel defaultSize={20} minSize={15} maxSize={35} className="min-h-0">
                <div className="vibrancy h-full border-r border-border overflow-hidden">
                  <ErrorBoundary fallback={<InlineErrorFallback name="Sidebar" />}>
                    <Sidebar />
                  </ErrorBoundary>
                </div>
              </Panel>
              <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-accent transition-colors cursor-col-resize" />
            </>
          )}
          <Panel defaultSize={sidebarOpen ? 50 : 70} minSize={30} className="min-h-0">
            <div className="h-full min-h-0 overflow-hidden bg-surface-0">
              <ErrorBoundary fallback={<InlineErrorFallback name="Commit Graph" />}>
                <CommitGraph />
              </ErrorBoundary>
            </div>
          </Panel>
          <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-accent transition-colors cursor-col-resize" />
          <Panel defaultSize={30} minSize={20} maxSize={45} className="min-h-0">
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
      {overlayDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-0 rounded-mac shadow-xl border border-border min-w-[480px] max-w-[600px] max-h-[80vh] overflow-hidden">
            {dialogComponents[overlayDialog] || (
              <div className="p-4 text-text-muted text-sm">
                Unknown dialog: {overlayDialog}
                <button className="ghost text-xs ml-4" onClick={closeDialog}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({ onOpen }: { onOpen: () => void }) {
  const openRepo = useRepoStore((s) => s.openRepo);
  const recentRepos = useRepoStore((s) => s.recentRepos);

  return (
    <div className="h-full flex items-center justify-center bg-surface-0">
      <div className="text-center space-y-6 max-w-md">
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
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Recent Repositories
            </div>
            <div className="space-y-1">
              {recentRepos.map((repo) => (
                <button
                  key={repo}
                  onClick={() => openRepo(repo)}
                  className="w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-2 rounded-mac transition-colors"
                >
                  {repo}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
