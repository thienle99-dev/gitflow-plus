import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitBranches } from "@/queries/useGitLog";
import { useTagList } from "@/queries/useGitTag";
import { useSubmoduleList } from "@/queries/useSubmoduleList";
import SubmoduleEntry from "./SubmoduleEntry";
import { api } from "@/api/tauri";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  ChevronRight,
  GitBranch,
  Tag,
  Package,
  Search,
  Archive,
  Folder,
  ChevronDown,
  Plus,
  LogOut,
  Trash2,
  GitPullRequest,
  Download,
} from "lucide-react";

export default function Sidebar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedRef = useRepoStore((s) => s.selectedRef);
  const selectRef = useRepoStore((s) => s.selectRef);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const openDialogState = useUIStore((s) => s.openDialog);
  const { data: branches } = useGitBranches(repoPath);
  const { data: tags } = useTagList(repoPath);
  const { data: submodules } = useSubmoduleList(repoPath);
  const [branchesOpen, setBranchesOpen] = useState(true);
  const [remotesOpen, setRemotesOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");

  const openRepo = useRepoStore((s) => s.openRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const removeRecentRepo = useRepoStore((s) => s.removeRecentRepo);
  const recentRepos = useRepoStore((s) => s.recentRepos);

  if (!repoPath) return null;

  const repoName = repoPath.split(/[/\\]/).filter(Boolean).pop() || repoPath;

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

  const localBranches = branches?.filter((b) => !b.remote) || [];
  const remoteBranches = branches?.filter((b) => b.remote) || [];

  const handleCheckout = async (name: string) => {
    try {
      await api.branches.checkout(repoPath, name);
      selectRef(name);
    } catch (e) {
      console.error("Checkout failed:", e);
    }
  };

  return (
    <div className="h-full overflow-y-auto py-2">
      {/* Repository Selector */}
      <div className="relative px-4 mb-3 flex items-center gap-1.5">
        <button
          onClick={() => setRepoMenuOpen(!repoMenuOpen)}
          className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-mac bg-surface-2-40 hover:bg-surface-2 border border-border-40 hover:border-border transition-all text-left min-w-0"
        >
          <Folder size={14} className="text-accent shrink-0" />
          <span className="flex-1 text-xs font-semibold truncate text-text-primary">
            {repoName}
          </span>
          <ChevronDown size={12} className="text-text-muted shrink-0" />
        </button>
        <button
          onClick={() => {
            closeRepo();
            useUIStore.setState({
              selectedCommit: null,
              selectedFile: null,
              selectedFileStage: null,
              activeDialog: null,
            });
          }}
          className="h-8 w-8 flex items-center justify-center rounded-mac bg-surface-2-40 hover:bg-surface-2 border border-border-40 hover:border-border text-text-muted hover:text-text-primary transition-all shrink-0 cursor-pointer"
          title="Close Repository"
        >
          <LogOut size={13} />
        </button>

        {repoMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setRepoMenuOpen(false);
                setRepoSearchQuery("");
              }}
            />
            <div className="absolute top-full left-2 right-2 mt-1 z-50 py-1 bg-surface-1 border border-border rounded-mac shadow-lg overflow-hidden animate-toast-in">
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-accent hover:text-accent-fg text-left"
                onClick={() => {
                  handleOpenRepo();
                  setRepoMenuOpen(false);
                  setRepoSearchQuery("");
                }}
              >
                <Plus size={12} />
                <span>Open Repository...</span>
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-accent hover:text-accent-fg text-left"
                onClick={() => {
                  openDialogState("clone");
                  setRepoMenuOpen(false);
                  setRepoSearchQuery("");
                }}
              >
                <Download size={12} />
                <span>Clone Repository...</span>
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-accent hover:text-accent-fg text-left"
                onClick={() => {
                  closeRepo();
                  useUIStore.setState({
                    selectedCommit: null,
                    selectedFile: null,
                    selectedFileStage: null,
                    activeDialog: null,
                  });
                  setRepoMenuOpen(false);
                  setRepoSearchQuery("");
                }}
              >
                <LogOut size={12} />
                <span>Close Repository</span>
              </button>

              {recentRepos.length > 1 && (
                <>
                  <div className="h-[1px] bg-border my-1" />
                  <div className="px-2 py-1">
                    <input
                      type="text"
                      value={repoSearchQuery}
                      onChange={(e) => setRepoSearchQuery(e.target.value)}
                      placeholder="Search recent repos..."
                      className="w-full h-7 px-2.5 bg-surface-2 border border-border-40 focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="h-[1px] bg-border my-1" />
                  <div className="px-3 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                    Recent Repositories
                  </div>
                  <div className="max-h-[220px] overflow-y-auto">
                    {recentRepos
                      .filter(path => path !== repoPath)
                      .filter(path => {
                        const name = path.split(/[/\\]/).filter(Boolean).pop() || path;
                        return name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
                               path.toLowerCase().includes(repoSearchQuery.toLowerCase());
                      })
                      .map((path) => {
                        const name = path.split(/[/\\]/).filter(Boolean).pop() || path;
                        return (
                          <div
                            key={path}
                            className="group flex items-center justify-between px-3 py-1 text-xs text-text-secondary hover:bg-surface-2"
                          >
                            <button
                              title={path}
                              className="flex-1 flex items-center gap-2 py-1 text-left truncate hover:text-text-primary transition-colors cursor-pointer"
                              onClick={() => {
                                openRepo(path);
                                setRepoMenuOpen(false);
                                setRepoSearchQuery("");
                              }}
                            >
                              <Folder size={12} className="opacity-75 shrink-0" />
                              <span className="truncate flex-1">{name}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecentRepo(path);
                              }}
                              className="h-5 w-5 flex items-center justify-center rounded hover:bg-surface-3 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                              title="Remove from list"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        );
                      })}
                    {recentRepos.filter(path => path !== repoPath).filter(path => {
                      const name = path.split(/[/\\]/).filter(Boolean).pop() || path;
                      return name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
                             path.toLowerCase().includes(repoSearchQuery.toLowerCase());
                    }).length === 0 && (
                      <div className="px-3 py-2 text-xs text-text-muted italic">
                        No repositories found
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Branches */}
      <SectionHeader 
        title="Branches" 
        open={branchesOpen} 
        onToggle={() => setBranchesOpen(!branchesOpen)} 
        action={
          <button 
            className="ghost p-0.5 hover:bg-surface-3 rounded"
            onClick={() => openDialogState("create-branch")}
            title="Create New Branch"
          >
            <Plus size={12} className="text-text-secondary hover:text-text-primary" />
          </button>
        }
      />

      {branchesOpen && (
        <div className="space-y-[1px]">
          <div
            className={`tree-item flex items-center gap-2 px-3 py-[3px] mx-1 ${!selectedRef ? "selected" : ""}`}
            onClick={() => selectRef(null)}
          >
            <GitBranch size={12} className={!selectedRef ? "text-accent-fg" : "text-accent"} />
            <span className="min-w-0 flex-1 truncate text-xs">All Branches</span>
          </div>
          {localBranches.map((b) => (
            <div
              key={b.name}
              className={`tree-item flex items-center gap-2 px-3 py-[3px] mx-1 ${selectedRef === b.name ? "selected" : ""}`}
              onClick={() => selectRef(b.name)}
              onDoubleClick={() => handleCheckout(b.name)}
            >
              <GitBranch size={12} className={selectedRef === b.name ? "text-accent-fg" : "text-accent"} />
              <span className="min-w-0 flex-1 truncate text-xs">{b.name}</span>
              {b.current && (
                <span className="shrink-0 rounded bg-surface-3 px-1 py-0.5 text-[9px] font-semibold text-text-secondary">
                  HEAD
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <SectionHeader title="Actions" open={true} onToggle={() => {}} />
      <div className="space-y-[1px] px-4 pb-2">
        <button
          className="tree-item w-full flex items-center gap-2 px-2 py-[3px]"
          onClick={() => openDialogState("search")}
        >
          <Search size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Search Commits</span>
        </button>
        <button
          className="tree-item w-full flex items-center gap-2 px-2 py-[3px]"
          onClick={() => openDialogState("stash")}
        >
          <Archive size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Stash</span>
        </button>
        <button
          className="tree-item w-full flex items-center gap-2 px-2 py-[3px]"
          onClick={() => openDialogState("tag")}
        >
          <Package size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Manage Tags</span>
        </button>
        <button
          className="tree-item w-full flex items-center gap-2 px-2 py-[3px]"
          onClick={() => openDialogState("merge-request")}
        >
          <GitPullRequest size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Merge Requests</span>
        </button>
      </div>

      <div className="my-1 mx-4 border-t border-border" />

      {/* Remotes */}
      <SectionHeader title="Remotes" open={remotesOpen} onToggle={() => setRemotesOpen(!remotesOpen)} />
      {remotesOpen && (
        <div className="space-y-[1px]">
          {remoteBranches.map((b) => (
            <div
              key={b.name}
              className={`tree-item flex items-center gap-2 px-3 py-[3px] mx-1 ${selectedRef === b.name ? "selected" : ""}`}
              onClick={() => selectRef(b.name)}
              onDoubleClick={() => handleCheckout(b.name)}
            >
              <GitBranch size={12} className={selectedRef === b.name ? "text-accent-fg" : "text-text-muted"} />
              <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{b.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      <SectionHeader title="Tags" open={tagsOpen} onToggle={() => setTagsOpen(!tagsOpen)} />
      {tagsOpen && (
        <div className="space-y-[1px]">
          {tags && tags.length > 0 ? (
            tags.map((t) => (
              <div
                key={t.name}
                className="tree-item flex items-center gap-2 px-3 py-[3px] mx-1 cursor-pointer"
                onClick={() => selectRef(t.name)}
              >
                <Tag size={12} className="text-purple-400" />
                <span className="min-w-0 flex-1 truncate text-xs">{t.name}</span>
                {t.annotated && (
                  <span className="shrink-0 rounded bg-surface-3 px-1 py-0.5 text-[9px] text-text-muted">
                    A
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 px-3 py-[3px] mx-1 text-text-muted">
              <Tag size={12} />
              <span className="text-xs">No tags</span>
            </div>
          )}
        </div>
      )}

      {/* Submodules Section */}
      {submodules && submodules.length > 0 && (
        <div className="px-4 mt-3 space-y-1">
          <div className="text-xs font-semibold text-text-muted px-2 py-1">
            Submodules ({submodules.length})
          </div>
          {submodules.map((sub) => (
            <SubmoduleEntry
              key={sub.path}
              submodule={sub}
              isSelected={selectedFile === sub.path}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
  action,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 cursor-pointer hover:bg-surface-2 select-none group"
      onClick={onToggle}
    >
      <div className="flex items-center gap-1">
        <ChevronRight
          size={10}
          className={`disclosure ${open ? "open" : ""} text-text-muted`}
        />
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {title}
        </span>
      </div>
      {action && (
        <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
          {action}
        </div>
      )}
    </div>
  );
}
