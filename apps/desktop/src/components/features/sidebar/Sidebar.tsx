import { useState, useRef, useMemo, lazy, Suspense } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitBranches, useGitSyncStatus } from "@/queries/useGitLog";
import { useTagList } from "@/queries/useGitTag";
import { useSubmoduleList } from "@/queries/useSubmoduleList";
import SubmoduleEntry from "./SubmoduleEntry";
import { api } from "@/api/tauri";
import ContextMenu from "@/components/ui/overlay/ContextMenu";
import { showToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
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
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";

const LazyActivityHeatmap = lazy(() => import("@/components/features/activity/ActivityHeatmap"));

export default function Sidebar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedRef = useRepoStore((s) => s.selectedRef);
  const selectRef = useRepoStore((s) => s.selectRef);
  const selectedFile = useUIStore((s) => s.selectedFile);
  const openDialogState = useUIStore((s) => s.openDialog);
  const setMergeTargetBranch = useUIStore((s) => s.setMergeTargetBranch);
  const setCompareBranchTarget = useUIStore((s) => s.setCompareBranchTarget);
  const { data: branches } = useGitBranches(repoPath);
  const { data: tags } = useTagList(repoPath);
  const { data: submodules } = useSubmoduleList(repoPath);
  const { data: syncStatus } = useGitSyncStatus(repoPath);
  const [branchesOpen, setBranchesOpen] = useState(true);
  const [remotesOpen, setRemotesOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const [branchCtxMenu, setBranchCtxMenu] = useState<{ branch: string; x: number; y: number } | null>(null);
  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState<string | null>(null);

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

  const [collapsedBranchFolders, setCollapsedBranchFolders] = useState<Set<string>>(new Set());

  const handleToggleBranchFolder = (folderPath: string) => {
    setCollapsedBranchFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const localBranchTree = useMemo(() => {
    return buildBranchTree(localBranches);
  }, [localBranches]);

  const remoteBranchTree = useMemo(() => {
    return buildBranchTree(remoteBranches);
  }, [remoteBranches]);

  const handleCheckout = async (name: string) => {
    try {
      await api.branches.checkout(repoPath, name);
      selectRef(name);
    } catch (e) {
      console.error("Checkout failed:", e);
    }
  };

  const doDeleteBranch = async () => {
    const branch = confirmDeleteBranch;
    setConfirmDeleteBranch(null);
    if (!branch || !repoPath) return;
    try {
      await api.branches.delete(repoPath, branch);
      showToast(`Branch "${branch}" deleted`);
    } catch (e) {
      console.error(e);
      showToast(`Failed to delete branch: ${e}`, "error");
    }
  };

  const aheadCount = syncStatus?.ahead || 0;
  const behindCount = syncStatus?.behind || 0;

  return (
    <>
    <nav className="h-full overflow-y-auto py-2 sidebar-panel" role="navigation" aria-label="Repository sidebar">
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
        count={localBranches.length}
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
        <div className="space-y-[1px]" role="tree" aria-label="Local branches">
          <div
            role="treeitem"
            aria-selected={!selectedRef}
            tabIndex={0}
            className={`tree-item flex items-center gap-2 px-3 py-[3px] mx-1 rounded-md ${!selectedRef ? "selected" : ""}`}
            onClick={() => selectRef(null)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRef(null); } }}
          >
            <GitBranch size={12} className={!selectedRef ? "text-accent" : "text-text-secondary"} />
            <span className="min-w-0 flex-1 truncate text-xs">All Branches</span>
          </div>
          <BranchTreeRenderer
            node={localBranchTree}
            depth={0}
            selectedRef={selectedRef}
            selectRef={selectRef}
            handleCheckout={handleCheckout}
            setBranchCtxMenu={setBranchCtxMenu}
            collapsedFolders={collapsedBranchFolders}
            onToggleFolder={handleToggleBranchFolder}
            aheadCount={aheadCount}
            behindCount={behindCount}
          />
        </div>
      )}

      {/* Divider */}
      <div className="my-2 mx-4 border-t border-border-50" />

      {/* Quick actions */}
      <SectionHeader title="Actions" open={true} onToggle={() => {}} />
      <div className="space-y-[1px] px-4 pb-2">
        <button
          className="tree-item group w-full flex items-center gap-2 px-2 py-[3px] rounded-md"
          onClick={() => openDialogState("search")}
        >
          <Search size={12} className="text-text-secondary transition-colors group-hover:text-[#0a84ff]" />
          <span className="text-xs text-text-secondary">Search Commits</span>
        </button>
        <button
          className="tree-item group w-full flex items-center gap-2 px-2 py-[3px] rounded-md"
          onClick={() => openDialogState("stash")}
        >
          <Archive size={12} className="text-text-secondary transition-colors group-hover:text-[#ff9f0a]" />
          <span className="text-xs text-text-secondary">Stash</span>
        </button>
        <button
          className="tree-item group w-full flex items-center gap-2 px-2 py-[3px] rounded-md"
          onClick={() => openDialogState("tag")}
        >
          <Package size={12} className="text-text-secondary transition-colors group-hover:text-[#bf5af2]" />
          <span className="text-xs text-text-secondary">Manage Tags</span>
        </button>
        <button
          className="tree-item group w-full flex items-center gap-2 px-2 py-[3px] rounded-md"
          onClick={() => openDialogState("merge-request")}
        >
          <GitPullRequest size={12} className="text-text-secondary transition-colors group-hover:text-[#30d158]" />
          <span className="text-xs text-text-secondary">Merge Requests</span>
        </button>
      </div>

      {/* Divider */}
      <div className="my-2 mx-4 border-t border-border-50" />

      {/* Remotes */}
      <SectionHeader
        title="Remotes"
        open={remotesOpen}
        onToggle={() => setRemotesOpen(!remotesOpen)}
        count={remoteBranches.length}
      />
      {remotesOpen && (
        <div className="space-y-[1px]" role="tree" aria-label="Remote branches">
          <BranchTreeRenderer
            node={remoteBranchTree}
            depth={0}
            selectedRef={selectedRef}
            selectRef={selectRef}
            handleCheckout={handleCheckout}
            setBranchCtxMenu={() => {}}
            collapsedFolders={collapsedBranchFolders}
            onToggleFolder={handleToggleBranchFolder}
          />
        </div>
      )}

      {/* Divider */}
      <div className="my-2 mx-4 border-t border-border-50" />

      {/* Tags */}
      <SectionHeader
        title="Tags"
        open={tagsOpen}
        onToggle={() => setTagsOpen(!tagsOpen)}
        count={tags?.length || 0}
      />
      {tagsOpen && (
        <div className="space-y-[1px]" role="list" aria-label="Tags">
          {tags && tags.length > 0 ? (
            tags.map((t) => (
              <div
                key={t.name}
                role="listitem"
                tabIndex={0}
                className={`tree-item group flex items-center gap-2 px-3 py-[3px] mx-1 rounded-md cursor-pointer ${selectedRef === t.name ? "selected" : ""}`}
                onClick={() => selectRef(t.name)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRef(t.name); } }}
              >
                <Tag size={12} className={selectedRef === t.name ? "text-accent" : "text-text-secondary transition-colors group-hover:text-[#bf5af2]"} />
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
        <>
          <div className="my-2 mx-4 border-t border-border-50" />
          <div className="px-4 mt-2 space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Submodules</span>
              <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold text-text-muted tabular-nums">
                {submodules.length}
              </span>
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
        </>
      )}

      {/* Activity Heatmap */}
      <div className="my-2 mx-4 border-t border-border-50" />
      <SectionHeader
        title="Activity"
        open={activityOpen}
        onToggle={() => setActivityOpen(!activityOpen)}
        action={
          <Activity size={11} className="text-text-muted" />
        }
      />
      {activityOpen && (
        <Suspense fallback={<div className="px-4 py-3 text-[10px] text-text-muted animate-pulse">Loading activity...</div>}>
          <LazyActivityHeatmap />
        </Suspense>
      )}

      {branchCtxMenu && (
        <ContextMenu
          x={branchCtxMenu.x}
          y={branchCtxMenu.y}
          items={[
            {
              label: "Checkout",
              icon: <GitBranch size={12} />,
              action: () => handleCheckout(branchCtxMenu.branch),
            },
            {
              label: "Merge into current branch…",
              icon: <ArrowLeftRight size={12} />,
              action: () => {
                setMergeTargetBranch(branchCtxMenu.branch);
                openDialogState("merge");
              },
            },
            {
              label: "Compare with current branch…",
              icon: <ArrowLeftRight size={12} />,
              action: () => {
                setCompareBranchTarget(branchCtxMenu.branch);
                openDialogState("branch-compare");
              },
            },
            { separator: true, label: "", action: () => {} },
            {
              label: "Delete branch…",
              icon: <Trash2 size={12} />,
              action: () => {
                setConfirmDeleteBranch(branchCtxMenu.branch);
              },
            },
          ]}
          onClose={() => setBranchCtxMenu(null)}
        />
      )}
    </nav>

    <ConfirmDialog
      open={!!confirmDeleteBranch}
      title="Delete Branch"
      message={`Are you sure you want to delete the branch "${confirmDeleteBranch}"?`}
      impactItems={[
        {
          label: "The branch reference will be permanently removed",
          severity: "irreversible",
          details: confirmDeleteBranch ? [confirmDeleteBranch] : undefined,
        },
        {
          label: "Commits unique to this branch may become unreachable",
          severity: "warning",
        },
        {
          label: "Remote tracking branch (if any) is not affected",
          severity: "info",
        },
      ]}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="destructive"
      onConfirm={doDeleteBranch}
      onCancel={() => setConfirmDeleteBranch(null)}
    />
    </>
  );
}

interface BranchLeafNode {
  type: "branch";
  name: string;
  current: boolean;
  remote: string | null;
  fullName: string;
}

interface BranchFolderNode {
  type: "folder";
  name: string;
  path: string;
  children: { [key: string]: BranchLeafNode | BranchFolderNode };
}

function buildBranchTree(branches: Array<{ name: string; current: boolean; remote: string | null }>): BranchFolderNode {
  const root: BranchFolderNode = {
    type: "folder",
    name: "",
    path: "",
    children: {},
  };

  for (const branch of branches) {
    const parts = branch.name.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        current.children[part] = {
          type: "branch",
          name: part,
          current: branch.current,
          remote: branch.remote,
          fullName: branch.name,
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = {
            type: "folder",
            name: part,
            path: currentPath,
            children: {},
          };
        }
        current = current.children[part] as BranchFolderNode;
      }
    }
  }

  return root;
}

/** Count the total branch leaves inside a folder node recursively. */
function countBranchLeaves(node: BranchFolderNode): number {
  let count = 0;
  for (const child of Object.values(node.children)) {
    if (child.type === "branch") {
      count++;
    } else {
      count += countBranchLeaves(child);
    }
  }
  return count;
}

interface BranchTreeRendererProps {
  node: BranchFolderNode;
  depth: number;
  selectedRef: string | null;
  selectRef: (ref: string | null) => void;
  handleCheckout: (name: string) => void;
  setBranchCtxMenu: (menu: { branch: string; x: number; y: number } | null) => void;
  collapsedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  aheadCount?: number;
  behindCount?: number;
}

function BranchTreeRenderer({
  node,
  depth,
  selectedRef,
  selectRef,
  handleCheckout,
  setBranchCtxMenu,
  collapsedFolders,
  onToggleFolder,
  aheadCount = 0,
  behindCount = 0,
}: BranchTreeRendererProps) {
  const sortedKeys = Object.keys(node.children).sort((a, b) => {
    const childA = node.children[a];
    const childB = node.children[b];
    if (childA.type !== childB.type) {
      return childA.type === "folder" ? -1 : 1;
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-[1px]">
      {sortedKeys.map((key) => {
        const child = node.children[key];
        if (child.type === "folder") {
          const isCollapsed = collapsedFolders.has(child.path);
          const branchCount = countBranchLeaves(child);
          return (
            <div key={child.path} role="treeitem" aria-expanded={!isCollapsed}>
              <div
                className="tree-item group w-full flex items-center gap-1.5 px-3 py-1 hover:bg-surface-2-60 cursor-pointer text-left select-none text-xs text-text-secondary rounded-md mx-1"
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={() => onToggleFolder(child.path)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleFolder(child.path); } }}
              >
                <span
                  className="h-3.5 w-3.5 flex items-center justify-center shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFolder(child.path);
                  }}
                >
                  <ChevronDown
                    size={12}
                    className={`text-text-muted transition-transform duration-150 shrink-0 ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </span>
                <Folder size={12} className="text-text-muted opacity-75 shrink-0" />
                <span className="truncate font-semibold text-text-primary flex-1">{child.name}</span>
                <span className="inline-flex h-4 min-w-5 shrink-0 items-center justify-center rounded-full border border-border-30 bg-surface-2-40 px-1.5 text-[9px] font-semibold leading-none text-text-secondary tabular-nums">
                  {branchCount}
                </span>
              </div>
              {!isCollapsed && (
                <BranchTreeRenderer
                  node={child}
                  depth={depth + 1}
                  selectedRef={selectedRef}
                  selectRef={selectRef}
                  handleCheckout={handleCheckout}
                  setBranchCtxMenu={setBranchCtxMenu}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={onToggleFolder}
                  aheadCount={aheadCount}
                  behindCount={behindCount}
                />
              )}
            </div>
          );
        } else {
          const isSelected = selectedRef === child.fullName;
          return (
            <div
              key={child.fullName}
              role="treeitem"
              aria-selected={isSelected}
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              <div
                className={`tree-item flex items-center gap-2 px-3 py-[3px] mx-1 rounded-md ${isSelected ? "selected" : ""}`}
                tabIndex={0}
                onClick={() => selectRef(child.fullName)}
                onDoubleClick={() => handleCheckout(child.fullName)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRef(child.fullName); } }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!child.remote) {
                    setBranchCtxMenu({ branch: child.fullName, x: e.clientX, y: e.clientY });
                  }
                }}
              >
                <GitBranch size={12} className={isSelected ? "text-accent" : child.current ? "text-[#30d158]" : "text-text-secondary"} />
                <span className={`min-w-0 flex-1 truncate text-xs ${child.current ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                  {child.name}
                </span>
                {/* Ahead/behind indicators on current branch */}
                {child.current && aheadCount > 0 && (
                  <span className="shrink-0 flex items-center gap-0.5 rounded bg-accent-10 px-1 py-0.5 text-[9px] font-bold text-accent" title={`${aheadCount} ahead`}>
                    <ArrowUp size={8} />
                    {aheadCount}
                  </span>
                )}
                {child.current && behindCount > 0 && (
                  <span className="shrink-0 flex items-center gap-0.5 rounded bg-[#ff9f0a]/15 px-1 py-0.5 text-[9px] font-bold text-[#ff9f0a]" title={`${behindCount} behind`}>
                    <ArrowDown size={8} />
                    {behindCount}
                  </span>
                )}
                {child.current && (
                  <span className="shrink-0 rounded bg-[#30d158]/10 px-1 py-0.5 text-[9px] font-bold text-[#30d158] border border-[#30d158]/20">
                    HEAD
                  </span>
                )}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
  action,
  count,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  count?: number;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={`${title}${count !== undefined && count > 0 ? ` (${count})` : ""}`}
      className="flex items-center justify-between px-4 py-1.5 cursor-pointer hover:bg-surface-2-40 select-none group"
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
    >
      <div className="flex items-center gap-1">
        <ChevronRight
          size={10}
          className={`disclosure ${open ? "open" : ""} text-text-muted`}
        />
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="ml-1 inline-flex h-4 min-w-5 items-center justify-center rounded-full border border-border-30 bg-surface-2-40 px-1.5 text-[9px] font-semibold leading-none text-text-secondary tabular-nums">
            {count}
          </span>
        )}
      </div>
      {action && (
        <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
          {action}
        </div>
      )}
    </div>
  );
}
