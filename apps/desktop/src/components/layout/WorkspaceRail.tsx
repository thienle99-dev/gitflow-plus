import { useState, useRef, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useWorkspaceStore } from "@/stores/workspace";
import { showToast } from "@/lib/toast";
import { useGitBranches } from "@/queries/useGitLog";
import { X, Plus, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";

const COLORS = ["#0a84ff","#30d158","#ff9f0a","#bf5af2","#ff453a","#64d2ff","#ff375f","#00c7be","#5e5ce6","#ff6482"];
function colorForPath(path: string): string {
  let h = 5381;
  for (let i = 0; i < path.length; i++) h = ((h << 5) + h) + path.charCodeAt(i);
  return COLORS[Math.abs(h) % COLORS.length];
}
function initials(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, " ");
  const parts = cleaned.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "R").toUpperCase();
}

export default function WorkspaceRail() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const openRepo = useRepoStore((s) => s.openRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const removeTab = useWorkspaceStore((s) => s.removeTab);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const railCollapsed = useWorkspaceStore((s) => s.railCollapsed);
  const toggleRailCollapsed = useWorkspaceStore((s) => s.toggleRailCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: branches } = useGitBranches(repoPath);

  useEffect(() => {
    if (repoPath && tabs.every((t) => t.path !== repoPath)) addTab(repoPath);
  }, [repoPath]);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  const handleSwitch = (path: string) => { setActive(path); openRepo(path); };
  const handleClose = (path: string) => { if (path === repoPath) closeRepo(); removeTab(path); };
  const handleOpenNew = async () => {
    try {
      const { open: native } = await import("@tauri-apps/plugin-dialog");
      const sel = await native({ directory: true, multiple: false });
      if (sel) { addTab(sel as string); openRepo(sel as string); }
    } catch { showToast("Failed to open repo", "error"); }
    setMenuOpen(false);
  };

  const currentBranch = branches?.find((b) => b.current)?.name || "";

  return (
    <div className={`flex flex-col bg-surface-1-50 border-r border-border-50 select-none ${railCollapsed ? "w-9" : "w-40"}`}>
      {!railCollapsed && (
        <div className="flex items-center justify-between px-2 h-7 border-b border-border-40 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Repos</span>
          <button onClick={toggleRailCollapsed} className="h-4 w-4 inline-flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all" title="Collapse">
            <ChevronLeft size={9} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1 space-y-0.5 px-1">
        {tabs.map((tab) => {
          const isActive = tab.path === repoPath;
          const color = colorForPath(tab.path);
          return (
            <div key={tab.path}>
              <div
                onClick={() => handleSwitch(tab.path)}
                className={`group relative flex items-center rounded cursor-pointer transition-all ${
                  railCollapsed ? "justify-center h-7 w-7 mx-auto" : "gap-2 px-2 h-7"
                } ${isActive ? "bg-accent-10" : "hover:bg-surface-2"}`}
                title={railCollapsed ? `${tab.name}${tab.path === repoPath && currentBranch ? ` • ${currentBranch}` : ""}\n${tab.path}` : tab.path}
              >
                {isActive && !railCollapsed && <div className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-full bg-accent" />}
                {railCollapsed ? (
                  <span className="h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                    {initials(tab.name)}
                  </span>
                ) : (
                  <>
                    <span className="h-4 w-4 rounded flex items-center justify-center text-[6px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                      {initials(tab.name)}
                    </span>
                    <span className="truncate text-xs text-text-primary flex-1">{tab.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClose(tab.path); }}
                      className="shrink-0 h-4 w-4 inline-flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={7} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative px-1 pb-1 shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex items-center justify-center rounded transition-all w-full hover:bg-surface-2 ${railCollapsed ? "h-7 w-7 mx-auto" : "h-7 px-2"} text-text-muted hover:text-text-primary`}
          title="Add repository"
        >
          <Plus size={12} />
        </button>

        {menuOpen && (
          <div className="absolute left-0 bottom-full mb-1 w-56 bg-surface-0 border border-border-60 rounded-mac shadow-xl z-50 py-1 anim-palette-enter">
            <div className="px-3 py-1 text-[9px] font-semibold text-text-muted uppercase tracking-wider">Recent Repos</div>
            {recentRepos.filter((r) => !tabs.some((t) => t.path === r)).slice(0, 8).length === 0 && tabs.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] text-text-muted italic">All repos already open</div>
            )}
            {recentRepos.filter((r) => !tabs.some((t) => t.path === r)).slice(0, 8).map((repo) => {
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
