import { useState, useRef, useMemo, useEffect, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitBranches, useGitSyncStatus, useGitRemotes } from "@/queries/useGitLog";
import { useTagList } from "@/queries/useGitTag";
import { useSubmoduleList } from "@/queries/useSubmoduleList";
import { useGitFlowDetect } from "@/queries/useGitFlow";
import { useWorktrees, useWorktreeRemove, useWorktreeLock, useWorktreeUnlock, useWorktreePrune } from "@/queries/useWorktrees";
import { classifyBranch, gitflowBranchColor } from "@/lib/gitflow-helpers";
import type { GitFlowConfig } from "@/api/tauri";
import SubmoduleEntry from "./SubmoduleEntry";
import { api } from "@/api/tauri";
import ContextMenu from "@/components/ui/overlay/ContextMenu";
import { showToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import { EmptyStateInline } from "@/components/ui/feedback/EmptyState";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { usePreflightGate } from "@/hooks/usePreflightGate";
import { getDragSourceProps, useDropTarget, type DragPayload } from "@/hooks/useDragAndDrop";
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
  Edit3,
  Activity,
  Lock,
  Unlock,
  FolderTree,
  Sparkles,
  Cloud,
  Settings,
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
  const setBranchToRename = useUIStore((s) => s.setBranchToRename);
  const setRebaseTargetCommit = useUIStore((s) => s.setRebaseTargetCommit);
  const { data: branches } = useGitBranches(repoPath);
  const { data: tags } = useTagList(repoPath);
  const { data: submodules } = useSubmoduleList(repoPath);
  const { data: gitflowConfig } = useGitFlowDetect(repoPath);
  const { data: syncStatus } = useGitSyncStatus(repoPath);
  const { data: remotes } = useGitRemotes(repoPath);
  const { data: worktrees } = useWorktrees(repoPath);
  const worktreeRemove = useWorktreeRemove(repoPath);
  const worktreeLockMut = useWorktreeLock(repoPath);
  const worktreeUnlockMut = useWorktreeUnlock(repoPath);
  const worktreePruneMut = useWorktreePrune(repoPath);
  const [branchesOpen, setBranchesOpen] = useState(true);
  const [remotesOpen, setRemotesOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [worktreesOpen, setWorktreesOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);
  const [confirmRemoveWorktree, setConfirmRemoveWorktree] = useState<string | null>(null);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const [branchCtxMenu, setBranchCtxMenu] = useState<{ branch: string; x: number; y: number } | null>(null);
  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState<string | null>(null);
  /** Inline-rename state — keyed by `fullName` so only one row edits at a time. */
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [editingError, setEditingError] = useState<string | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);

  // Preflight gates for risky operations
  const checkoutGate = usePreflightGate("checkout branch");
  const deleteBranchGate = usePreflightGate("delete branch");
  const mergeGate = usePreflightGate("merge branch");

  const openRepo = useRepoStore((s) => s.openRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const removeRecentRepo = useRepoStore((s) => s.removeRecentRepo);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const queryClient = useQueryClient();

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

  const localBranches = useMemo(() => branches?.filter((b) => !b.remote) || [], [branches]);
  const remoteBranches = useMemo(() => branches?.filter((b) => b.remote) || [], [branches]);

  // Group remote branches by remote name
  const branchesByRemote = useMemo(() => {
    const map = new Map<string, typeof remoteBranches>();
    for (const b of remoteBranches) {
      const key = b.remote || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [remoteBranches]);

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
    const ok = await checkoutGate.runPreflight();
    if (!ok) return;
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
    const ok = await deleteBranchGate.runPreflight();
    if (!ok) return;
    try {
      await api.branches.delete(repoPath, branch);
      showToast(`Branch "${branch}" deleted`);
    } catch (e) {
      console.error(e);
      showToast(`Failed to delete branch: ${e}`, "error");
    }
  };

  /**
   * Drop a branch or commit onto a branch row. Two paths:
   * - branch → branch: opens MergePreviewDialog with the dragged branch as
   *   the source (equivalent to the context menu "Merge into current branch…").
   * - commit → branch: opens InteractiveRebaseDialog with the branch as the
   *   new base (rebase current branch's commits onto this branch).
   * Both go through `mergeGate.runPreflight()` to honor
   * "this git op might lose work" semantics.
   */
  const handleBranchDrop = async (
    targetBranch: string,
    payload: DragPayload,
  ) => {
    if (payload.kind === "branch") {
      if (payload.current) {
        showToast("Cannot merge a branch into itself", "error");
        return;
      }
      const ok = await mergeGate.runPreflight();
      if (!ok) return;
      setMergeTargetBranch(payload.name);
      openDialogState("merge");
    } else {
      // commit → branch: rebase current onto this branch.
      const ok = await mergeGate.runPreflight();
      if (!ok) return;
      setRebaseTargetCommit(targetBranch);
      openDialogState("interactive-rebase");
    }
  };

  /**
   * Inline rename handlers. `editingBranch` is the full branch name; only
   * one row can be in edit mode at a time, which means we don't have to
   * worry about two inputs fighting for focus. The branch is pre-filled
   * with `fullName` (NOT the visible leaf name) so users can rename
   * `feature/auth` → `feature/login-page` and keep the prefix.
   */
  const startBranchEdit = (fullName: string) => {
    if (editingLoading) return;
    setEditingBranch(fullName);
    setEditingDraft(fullName);
    setEditingError(null);
  };

  const cancelBranchEdit = () => {
    if (editingLoading) return;
    setEditingBranch(null);
    setEditingDraft("");
    setEditingError(null);
  };

  const commitBranchRename = async () => {
    if (!editingBranch || !repoPath) return;
    const trimmed = editingDraft.trim();
    if (!trimmed) {
      setEditingError("Branch name cannot be empty");
      return;
    }
    if (/\s/.test(trimmed)) {
      setEditingError("Branch name cannot contain spaces");
      return;
    }
    if (trimmed === editingBranch) {
      setEditingError("New name is the same as the current name");
      return;
    }

    setEditingLoading(true);
    setEditingError(null);
    try {
      await api.branches.rename(repoPath, editingBranch, trimmed);
      if (selectedRef === editingBranch) {
        selectRef(trimmed);
      }
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      showToast(`Renamed branch "${editingBranch}" to "${trimmed}"`);
      setEditingBranch(null);
      setEditingDraft("");
    } catch (err: any) {
      setEditingError(String(err?.message || err));
    } finally {
      setEditingLoading(false);
    }
  };

  const aheadCount = syncStatus?.ahead || 0;
  const behindCount = syncStatus?.behind || 0;

  const handleRename = (branch: string) => {
    setBranchToRename(branch);
    openDialogState("rename-branch");
  };

  return (
    <>
    <div className="h-full flex flex-col">
    <nav className="flex-1 overflow-y-auto py-2 sidebar-panel" role="navigation" aria-label="Repository sidebar">
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
                      <EmptyStateInline variant="repo" title="No repositories found" />
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
            gitflowConfig={gitflowConfig ?? null}
            handleBranchDrop={handleBranchDrop}
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
        count={remotes?.length || 0}
        action={
          <button
            className="ghost p-0.5 hover:bg-surface-3 rounded"
            onClick={() => openDialogState("remote-manager")}
            title="Manage Remotes"
          >
            <Settings size={12} className="text-text-secondary hover:text-text-primary" />
          </button>
        }
      />
      {remotesOpen && (
        <div className="space-y-1" role="tree" aria-label="Remotes">
          {remotes && remotes.length > 0 ? (
            remotes.map((remote) => {
              const remoteName = remote.name;
              const remoteBranchList = branchesByRemote.get(remoteName) || [];
              const isCollapsed = collapsedBranchFolders.has(`remote:${remoteName}`);
              const remoteTree = buildBranchTree(remoteBranchList);

              return (
                <div key={remoteName} role="treeitem" aria-expanded={!isCollapsed}>
                  {/* Remote header */}
                  <div
                    className="tree-item group flex items-center gap-1.5 px-3 py-[5px] mx-1 rounded-md cursor-pointer hover:bg-surface-2-60 select-none"
                    onClick={() => handleToggleBranchFolder(`remote:${remoteName}`)}
                  >
                    <ChevronDown
                      size={12}
                      className={`text-text-muted transition-transform duration-150 shrink-0 ${isCollapsed ? "-rotate-90" : ""}`}
                    />
                    <Cloud size={12} className="text-accent shrink-0" />
                    <span className="text-xs font-semibold text-text-primary truncate flex-1">
                      {remoteName}
                    </span>
                    <span className="inline-flex h-4 min-w-5 shrink-0 items-center justify-center rounded-full border border-border-30 bg-surface-2-40 px-1.5 text-[9px] font-semibold leading-none text-text-secondary tabular-nums">
                      {remoteBranchList.length}
                    </span>
                  </div>
                  {/* Remote URL */}
                  {!isCollapsed && (
                    <div className="px-6 pb-0.5">
                      <span className="text-[10px] text-text-muted font-mono truncate block" title={remote.url}>
                        {remote.url}
                      </span>
                    </div>
                  )}
                  {/* Branches under this remote */}
                  {!isCollapsed && remoteBranchList.length > 0 && (
                    <div className="ml-2">
                      <BranchTreeRenderer
                        node={remoteTree}
                        depth={0}
                        selectedRef={selectedRef}
                        selectRef={selectRef}
                        handleCheckout={handleCheckout}
                        setBranchCtxMenu={() => {}}
                        collapsedFolders={collapsedBranchFolders}
                        onToggleFolder={handleToggleBranchFolder}
                        handleBranchDrop={handleBranchDrop}
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyStateInline variant="repo" title="No remotes configured" />
          )}
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
            <EmptyStateInline variant="tags" title="No tags" />
          )}
        </div>
      )}

      {/* Worktrees */}
      <div className="my-2 mx-4 border-t border-border-50" />
      <SectionHeader
        title="Worktrees"
        open={worktreesOpen}
        onToggle={() => setWorktreesOpen(!worktreesOpen)}
        count={worktrees?.length || 0}
        action={
          <div className="flex items-center gap-0.5">
            <button
              className="ghost p-0.5 hover:bg-surface-3 rounded"
              onClick={() => openDialogState("add-worktree")}
              title="Add Worktree"
            >
              <Plus size={12} className="text-text-secondary hover:text-text-primary" />
            </button>
            {worktrees && worktrees.some((w) => w.is_prunable) && (
              <button
                className="ghost p-0.5 hover:bg-surface-3 rounded"
                onClick={() => worktreePruneMut.mutate()}
                title="Prune stale worktrees"
              >
                <Sparkles size={12} className="text-text-secondary hover:text-text-primary" />
              </button>
            )}
          </div>
        }
      />
      {worktreesOpen && (
        <div className="space-y-[1px]" role="list" aria-label="Worktrees">
          {worktrees && worktrees.length > 0 ? (
            worktrees.map((wt) => {
              const name = wt.path.split(/[/\\]/).filter(Boolean).pop() || wt.path;
              return (
                <div
                  key={wt.path}
                  role="listitem"
                  className={`tree-item group flex items-center gap-2 px-3 py-[3px] mx-1 rounded-md ${wt.is_current ? "selected" : ""}`}
                >
                  <FolderTree size={12} className={wt.is_current ? "text-accent" : wt.is_locked ? "text-[#ff9f0a]" : "text-text-secondary"} />
                  <div className="min-w-0 flex-1 truncate">
                    <span className={`text-xs ${wt.is_current ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                      {name}
                    </span>
                    {wt.branch && (
                      <span className="ml-1.5 text-[10px] text-text-muted">
                        ({wt.branch})
                      </span>
                    )}
                  </div>
                  {wt.is_locked && (
                    <Lock size={10} className="text-[#ff9f0a] shrink-0" />
                  )}
                  {wt.is_prunable && (
                    <span className="shrink-0 rounded bg-[#ff9f0a]/15 px-1 py-0.5 text-[9px] font-bold text-[#ff9f0a]">
                      stale
                    </span>
                  )}
                  {wt.is_current && (
                    <span className="shrink-0 rounded bg-[#30d158]/10 px-1 py-0.5 text-[9px] font-bold text-[#30d158] border border-[#30d158]/20">
                      current
                    </span>
                  )}
                  {/* Actions (visible on hover, not for current) */}
                  {!wt.is_current && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-surface-3 text-text-muted hover:text-text-primary cursor-pointer"
                        title={wt.is_locked ? "Unlock" : "Lock"}
                        onClick={() => {
                          if (wt.is_locked) {
                            worktreeUnlockMut.mutate(wt.path);
                          } else {
                            worktreeLockMut.mutate(wt.path);
                          }
                        }}
                      >
                        {wt.is_locked ? <Unlock size={10} /> : <Lock size={10} />}
                      </button>
                      <button
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-[#ff453a]/15 text-text-muted hover:text-[#ff453a] cursor-pointer"
                        title="Remove worktree"
                        onClick={() => setConfirmRemoveWorktree(wt.path)}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyStateInline variant="repo" title="No worktrees" />
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
              label: "Rename…",
              icon: <Edit3 size={12} />,
              action: () => handleRename(branchCtxMenu.branch),
            },
            {
              label: "Delete branch…",
              icon: <Trash2 size={12} />,
              action: () => {
                setConfirmDeleteBranch(branchCtxMenu.branch);
              },
            },
            {
              label: "Delete remote branch…",
              icon: <Trash2 size={12} />,
              action: async () => {
                try {
                  await api.branches.deleteRemote(repoPath, branchCtxMenu.branch);
                  showToast(`Remote branch "${branchCtxMenu.branch}" deleted`);
                } catch (e) {
                  showToast(`Failed: ${e}`, "error");
                }
              },
            },
          ]}
          onClose={() => setBranchCtxMenu(null)}
        />
      )}
    </nav>
    </div>

    {checkoutGate.preflightDialog}
    {deleteBranchGate.preflightDialog}
    {mergeGate.preflightDialog}
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
    <ConfirmDialog
      open={!!confirmRemoveWorktree}
      title="Remove Worktree"
      message={`Remove the worktree at "${confirmRemoveWorktree?.split(/[/\\]/).filter(Boolean).pop()}"? The directory will be deleted.`}
      impactItems={[
        {
          label: "The worktree directory and its contents will be deleted",
          severity: "irreversible",
          details: confirmRemoveWorktree ? [confirmRemoveWorktree] : undefined,
        },
        {
          label: "Uncommitted changes in the worktree will be lost",
          severity: "warning",
        },
        {
          label: "The branch is not affected — only the working copy is removed",
          severity: "info",
        },
      ]}
      confirmLabel="Remove"
      cancelLabel="Cancel"
      variant="destructive"
      onConfirm={() => {
        if (confirmRemoveWorktree) {
          worktreeRemove.mutate({ worktreePath: confirmRemoveWorktree });
        }
        setConfirmRemoveWorktree(null);
      }}
      onCancel={() => setConfirmRemoveWorktree(null)}
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
  gitflowConfig?: GitFlowConfig | null;
  handleBranchDrop?: (targetBranch: string, payload: DragPayload) => void;
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
  gitflowConfig,
  handleBranchDrop,
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
                  gitflowConfig={gitflowConfig}
                  handleBranchDrop={handleBranchDrop}
                />
              )}
            </div>
          );
        } else {
          const isSelected = selectedRef === child.fullName;
          return (
            <BranchLeaf
              key={child.fullName}
              fullName={child.fullName}
              name={child.name}
              current={child.current}
              remote={child.remote}
              isSelected={isSelected}
              depth={depth}
              aheadCount={aheadCount}
              behindCount={behindCount}
              gitflowConfig={gitflowConfig}
              selectRef={selectRef}
              handleCheckout={handleCheckout}
              setBranchCtxMenu={setBranchCtxMenu}
              handleBranchDrop={handleBranchDrop}
              isEditing={editingBranch === child.fullName}
              editingDraft={editingDraft}
              editingError={editingError}
              editingLoading={editingLoading}
              onEditDraftChange={setEditingDraft}
              onStartEdit={startBranchEdit}
              onCommitEdit={commitBranchRename}
              onCancelEdit={cancelBranchEdit}
            />
          );
        }
      })}
    </div>
  );
}

function BranchLeaf({
  fullName,
  name,
  current,
  remote,
  isSelected,
  isEditing,
  editingDraft,
  editingError,
  editingLoading,
  onEditDraftChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  depth,
  aheadCount,
  behindCount,
  gitflowConfig,
  selectRef,
  handleCheckout,
  setBranchCtxMenu,
  handleBranchDrop,
}: {
  fullName: string;
  name: string;
  current: boolean;
  remote: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingDraft: string;
  editingError: string | null;
  editingLoading: boolean;
  onEditDraftChange: (v: string) => void;
  onStartEdit: (fullName: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  depth: number;
  aheadCount: number;
  behindCount: number;
  gitflowConfig: GitFlowConfig | null | undefined;
  selectRef: (ref: string | null) => void;
  handleCheckout: (name: string) => void;
  setBranchCtxMenu: (menu: { branch: string; x: number; y: number } | null) => void;
  handleBranchDrop?: (targetBranch: string, payload: DragPayload) => void;
}) {
  const onDrop = (payload: DragPayload) => {
    if (!handleBranchDrop) return;
    handleBranchDrop(fullName, payload);
  };
  const { isOver, dropProps } = useDropTarget(onDrop);
  const dragProps = remote || isEditing
    ? {}
    : getDragSourceProps({ kind: "branch", name: fullName, current });
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  // When the row enters edit mode, focus + select the input so the user
  // can immediately type the new name.
  useEffect(() => {
    if (isEditing) {
      cancelledRef.current = false;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing]);

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      style={{ paddingLeft: `${depth * 16}px` }}
    >
      <div
        className={`tree-item flex items-center gap-2 px-3 py-[3px] mx-1 rounded-md ${isSelected ? "selected" : ""} ${isOver ? "drag-over" : ""}`}
        tabIndex={isEditing ? -1 : 0}
        onClick={() => { if (!isEditing) selectRef(fullName); }}
        onDoubleClick={() => { if (!isEditing && !remote) onStartEdit(fullName); }}
        onKeyDown={(e) => { if (!isEditing && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectRef(fullName); } }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!remote && !isEditing) {
            setBranchCtxMenu({ branch: fullName, x: e.clientX, y: e.clientY });
          }
        }}
        {...dragProps}
        {...dropProps}
      >
        <GitBranch size={12} className={isSelected ? "text-accent" : current ? "text-[#30d158]" : "text-text-secondary"} />
        {gitflowConfig && (() => {
          const branchType = classifyBranch(fullName, gitflowConfig);
          const color = gitflowBranchColor(branchType);
          if (branchType === "feature" || branchType === "release" || branchType === "hotfix") {
            return (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
                title={`${branchType} branch`}
              />
            );
          }
          return null;
        })()}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editingDraft}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            disabled={editingLoading}
            onChange={(e) => onEditDraftChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                onCommitEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelledRef.current = true;
                onCancelEdit();
              }
            }}
            onBlur={() => {
              // Enter / Escape handle their own paths. Blur (clicking
              // elsewhere) commits — but we honor an explicit cancel flag
              // so an Escape-then-blur doesn't double-fire.
              if (cancelledRef.current) return;
              if (editingDraft.trim() && editingDraft.trim() !== fullName) {
                onCommitEdit();
              } else {
                onCancelEdit();
              }
            }}
            className="min-w-0 flex-1 h-6 px-2 text-xs font-mono bg-surface-1 border border-accent rounded-mac text-text-primary outline-none"
          />
        ) : (
          <span className={`min-w-0 flex-1 truncate text-xs ${current ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
            {name}
          </span>
        )}
        {!isEditing && current && aheadCount > 0 && (
          <span className="shrink-0 flex items-center gap-0.5 rounded bg-accent-10 px-1 py-0.5 text-[9px] font-bold text-accent" title={`${aheadCount} ahead`}>
            <ArrowUp size={8} />
            {aheadCount}
          </span>
        )}
        {!isEditing && current && behindCount > 0 && (
          <span className="shrink-0 flex items-center gap-0.5 rounded bg-[#ff9f0a]/15 px-1 py-0.5 text-[9px] font-bold text-[#ff9f0a]" title={`${behindCount} behind`}>
            <ArrowDown size={8} />
            {behindCount}
          </span>
        )}
        {!isEditing && current && (
          <span className="shrink-0 rounded bg-[#30d158]/10 px-1 py-0.5 text-[9px] font-bold text-[#30d158] border border-[#30d158]/20">
            HEAD
          </span>
        )}
      </div>
      {isEditing && editingError && (
        <div
          className="mx-2 mt-0.5 px-2 py-1 text-2xs text-[#ff453a] bg-red-500/10 border border-red-500/20 rounded select-text"
          role="alert"
        >
          {editingError}
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
