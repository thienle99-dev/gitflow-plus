import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitBranches } from "@/queries/useGitLog";
import { useTagList } from "@/queries/useGitTag";
import { api } from "@/api/tauri";
import {
  ChevronRight,
  GitBranch,
  Tag,
  Package,
  Search,
  Archive,
} from "lucide-react";

export default function Sidebar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectedRef = useRepoStore((s) => s.selectedRef);
  const selectRef = useRepoStore((s) => s.selectRef);
  const openDialog = useUIStore((s) => s.openDialog);
  const { data: branches } = useGitBranches(repoPath);
  const { data: tags } = useTagList(repoPath);
  const [branchesOpen, setBranchesOpen] = useState(true);
  const [remotesOpen, setRemotesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);

  if (!repoPath) return null;

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
      {/* Branches */}
      <SectionHeader title="Branches" open={branchesOpen} onToggle={() => setBranchesOpen(!branchesOpen)} />
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

      {/* Quick actions spacer */}
      <div className="my-1 mx-2 border-t border-border" />

      {/* Quick actions */}
      <SectionHeader title="Actions" open={true} onToggle={() => {}} />
      <div className="space-y-[1px] px-2">
        <button
          className="tree-item w-full flex items-center gap-2 px-2 py-[3px]"
          onClick={() => openDialog("search")}
        >
          <Search size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Search Commits</span>
        </button>
        <button
          className="tree-item w-full flex items-center gap-2 px-2 py-[3px]"
          onClick={() => openDialog("stash")}
        >
          <Archive size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Stash</span>
        </button>
        <button
          className="tree-item w-full flex items-center gap-2 px-2 py-[3px]"
          onClick={() => openDialog("tag")}
        >
          <Package size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Manage Tags</span>
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-surface-2 select-none"
      onClick={onToggle}
    >
      <ChevronRight
        size={10}
        className={`disclosure ${open ? "open" : ""} text-text-muted`}
      />
      <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}
