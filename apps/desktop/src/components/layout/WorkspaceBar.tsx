import { useRepoStore } from "@/stores/repo";
import { useWorkspaceStore, type WorkspaceTab } from "@/stores/workspace";
import { showToast } from "@/lib/toast";
import { X, Plus, FolderOpen, GitBranch, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function WorkspaceBar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const openRepo = useRepoStore((s) => s.openRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activePath = useWorkspaceStore((s) => s.activePath);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const removeTab = useWorkspaceStore((s) => s.removeTab);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync: when repoPath changes externally, update workspace active tab
  useEffect(() => {
    if (repoPath && activePath !== repoPath) {
      addTab(repoPath);
    }
  }, [repoPath]);

  // Handle closing the active repo
  const handleCloseTab = (path: string) => {
    if (path === repoPath) {
      closeRepo();
    }
    removeTab(path);
  };

  // Handle switching to a tab
  const handleSwitchTab = (path: string) => {
    setActive(path);
    openRepo(path);
  };

  // Open a new repo from filesystem
  const handleOpenNew = async () => {
    try {
      const { open: openNativeDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openNativeDialog({ directory: true, multiple: false });
      if (selected) {
        addTab(selected as string);
        openRepo(selected as string);
      }
    } catch (e) {
      showToast("Failed to open repo", "error");
    }
    setMenuOpen(false);
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac");

  return (
    <div className={`flex items-center gap-0.5 px-2 overflow-x-auto shrink-0 bg-surface-1-60 border-b border-border-50 select-none ${isMac ? "h-[34px]" : "h-[30px]"}`} data-tauri-drag-region>
      {/* Tab list */}
      <div className="flex items-center gap-0.5 flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.path === repoPath;
          return (
            <div
              key={tab.path}
              onClick={() => handleSwitchTab(tab.path)}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-t-md text-[11px] font-medium cursor-pointer transition-all max-w-[160px] shrink-0 ${
                isActive
                  ? "bg-surface-0 text-text-primary border-t-2 border-t-accent -mb-[1px]"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-2-40"
              }`}
              title={tab.path}
            >
              <GitBranch size={10} className={isActive ? "text-accent" : "text-text-muted"} />
              <span className="truncate">{tab.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.path); }}
                className="shrink-0 h-4 w-4 inline-flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-all"
                title="Close tab"
              >
                <X size={8} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Repo switcher / Add button */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="h-6 w-6 inline-flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
          title="Open or switch repository"
        >
          <Plus size={12} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-0.5 w-56 bg-surface-0 border border-border-60 rounded-mac shadow-xl z-50 py-1 anim-palette-enter">
            {/* Recent repos */}
            <div className="px-3 py-1 text-[9px] font-semibold text-text-muted uppercase tracking-wider">
              Recent Repos
            </div>
            {recentRepos.filter((r) => !tabs.some((t) => t.path === r)).length === 0 && (
              <div className="px-3 py-1.5 text-[10px] text-text-muted italic">All repos already open</div>
            )}
            {recentRepos
              .filter((r) => !tabs.some((t) => t.path === r))
              .slice(0, 8)
              .map((repo) => {
                const name = repo.split(/[/\\]/).filter(Boolean).pop() || repo;
                return (
                  <button
                    key={repo}
                    onClick={() => { addTab(repo); openRepo(repo); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-text-secondary hover:bg-accent hover:text-accent-fg transition-colors cursor-pointer"
                  >
                    <FolderOpen size={11} />
                    <span className="truncate flex-1">{name}</span>
                  </button>
                );
              })}
            <div className="border-t border-border-40 my-1" />
            <button
              onClick={handleOpenNew}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-text-secondary hover:bg-accent hover:text-accent-fg transition-colors cursor-pointer"
            >
              <FolderOpen size={11} />
              <span>Open another repository...</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
