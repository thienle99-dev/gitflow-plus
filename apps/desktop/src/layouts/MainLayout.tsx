import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import Toolbar from "@/components/common/Toolbar";
import Sidebar from "@/components/sidebar/Sidebar";
import CommitGraph from "@/components/graph/CommitGraph";
import RightPanel from "@/components/detail/RightPanel";
import BottomBar from "@/components/common/BottomBar";
import SearchDialog from "@/components/phase2/SearchDialog";
import StashPanel from "@/components/phase2/StashPanel";
import TagPanel from "@/components/phase2/TagPanel";
import { CherryPickDialog, SettingsDialog } from "@/components/phase2";

export default function MainLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeDialog = useUIStore((s) => s.activeDialog);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const repoPath = useRepoStore((s) => s.repoPath);
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
      } else if (type === "refs") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
      } else if (type === "head") {
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "info"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "branches"] });
        queryClient.invalidateQueries({ queryKey: ["git", repoPath, "log"] });
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, [repoPath, queryClient]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      // Escape closes dialogs
      if (e.key === "Escape" && activeDialog) {
        e.preventDefault();
        closeDialog();
      }
    },
    [toggleSidebar, activeDialog, closeDialog],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!repoPath) {
    return <WelcomeScreen />;
  }

  // Dialog overlay components
  const dialogComponents: Record<string, React.ReactNode> = {
    search: <SearchDialog open={true} onClose={closeDialog} />,
    stash: <StashPanel onClose={closeDialog} />,
    tag: <TagPanel onClose={closeDialog} />,
    settings: <SettingsDialog onClose={closeDialog} />,
    "ai-settings": <SettingsDialog onClose={closeDialog} />,
    "cherry-pick": (
      <CherryPickDialog
        open={true}
        commitHash={selectedCommit || ""}
        onClose={closeDialog}
      />
    ),
  };

  return (
    <div className="h-full flex flex-col">
      <Toolbar />
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="main-layout">
          {sidebarOpen && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={35}>
                <div className="vibrancy h-full border-r border-border overflow-hidden">
                  <Sidebar />
                </div>
              </Panel>
              <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-accent transition-colors cursor-col-resize" />
            </>
          )}
          <Panel defaultSize={sidebarOpen ? 50 : 70} minSize={30}>
            <div className="h-full overflow-hidden bg-surface-0">
              <CommitGraph />
            </div>
          </Panel>
          <PanelResizeHandle className="w-[3px] bg-transparent hover:bg-accent transition-colors cursor-col-resize" />
          <Panel defaultSize={30} minSize={20} maxSize={45}>
            <RightPanel />
          </Panel>
        </PanelGroup>
      </div>
      <BottomBar />

      {/* Dialog overlays */}
      {activeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-0 rounded-mac shadow-xl border border-border min-w-[480px] max-w-[600px] max-h-[80vh] overflow-hidden">
            {dialogComponents[activeDialog] || (
              <div className="p-4 text-text-muted text-sm">
                Unknown dialog: {activeDialog}
                <button className="ghost text-xs ml-4" onClick={closeDialog}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeScreen() {
  const openRepo = useRepoStore((s) => s.openRepo);
  const recentRepos = useRepoStore((s) => s.recentRepos);

  const handleOpenRepo = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        openRepo(selected as string);
      }
    } catch (e) {
      // Fallback: prompt path
      const path = prompt("Enter repository path:");
      if (path) openRepo(path);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-surface-0">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-4xl font-semibold text-text-secondary">GitFlow Desktop</div>
        <p className="text-text-muted text-sm">
          Open a local Git repository to get started
        </p>
        <button
          onClick={handleOpenRepo}
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
