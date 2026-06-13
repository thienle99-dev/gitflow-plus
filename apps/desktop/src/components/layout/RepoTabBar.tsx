import { useRepoStore } from "@/stores/repo";
import { showToast } from "@/lib/toast";
import { X, Plus, FolderOpen } from "lucide-react";

export default function RepoTabBar() {
  const repos = useRepoStore((s) => s.repos);
  const activeRepoId = useRepoStore((s) => s.activeRepoId);
  const switchRepo = useRepoStore((s) => s.switchRepo);
  const closeTab = useRepoStore((s) => s.closeTab);
  const openRepo = useRepoStore((s) => s.openRepo);
  const recentRepos = useRepoStore((s) => s.recentRepos);

  const openPaths = new Set(repos.filter((r) => r.repoPath).map((r) => r.repoPath));

  const handleOpenNew = async () => {
    try {
      const { open: native } = await import("@tauri-apps/plugin-dialog");
      const sel = await native({ directory: true, multiple: false });
      if (sel) openRepo(sel as string);
    } catch { showToast("Failed to open repo", "error"); }
  };

  if (repos.length === 0) return null;

  return (
    <div className="flex items-center h-8 bg-surface-1 border-b border-border shrink-0">
      <div className="flex items-center h-full overflow-x-auto">
        {repos.map((tab) => {
          const isActive = tab.id === activeRepoId;
          const name = tab.repoPath?.split("/").pop() || "untitled";

          return (
            <div
              key={tab.id}
              onClick={() => switchRepo(tab.id)}
              className={`group flex items-center gap-1.5 px-3 h-full cursor-pointer border-r border-border-40 select-none shrink-0 transition-colors ${
                isActive
                  ? "bg-surface-1 text-text-primary border-b-2 border-b-[#0a84ff]"
                  : "bg-surface-2-40 text-text-muted hover:bg-surface-2 hover:text-text-secondary"
              }`}
            >
              <span className="text-2xs font-medium max-w-24 truncate">{name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-2 transition-opacity"
              >
                <X size={10} className="text-text-muted hover:text-text-primary" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent repos dropdown */}
      <div className="relative h-full shrink-0">
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1 px-2 h-full text-text-muted hover:text-text-primary hover:bg-surface-2-40 transition-colors"
          title="Open another repository"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}