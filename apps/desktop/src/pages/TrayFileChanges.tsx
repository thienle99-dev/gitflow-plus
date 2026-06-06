import { useState, useMemo } from "react";
import {
  File,
  CheckSquare,
  Square,
  Check,
  Loader2,
  Archive,
  History,
  Search,
} from "lucide-react";
import type { FileChange, StashEntry } from "@/api/tauri";

export interface TrayFileChangesProps {
  staged: FileChange[];
  unstaged: FileChange[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  selectedFile: string | null;
  selectedFileStage: "staged" | "unstaged" | null;
  onSelectFile: (path: string, stage: "staged" | "unstaged") => void;
  isLoading: boolean;
  stashes: StashEntry[] | undefined;
  stashLoading: boolean;
  popLoading: boolean;
  onStashPush: () => void;
  onStashPop: () => void;
}

export function TrayFileChanges({
  staged,
  unstaged,
  searchQuery,
  setSearchQuery,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
  selectedFile,
  selectedFileStage,
  onSelectFile,
  isLoading,
  stashes,
  stashLoading,
  popLoading,
  onStashPush,
  onStashPop,
}: TrayFileChangesProps) {
  const allChanges = useMemo(() => [...staged, ...unstaged], [staged, unstaged]);

  const filteredChanges = useMemo(() => {
    if (!searchQuery.trim()) return allChanges;
    const q = searchQuery.toLowerCase();
    return allChanges.filter((f) => f.path.toLowerCase().includes(q));
  }, [allChanges, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-[170px] border border-border-40 bg-surface-1-40 rounded-mac p-2.5">
      <div className="flex items-center justify-between gap-2 border-b border-border-40 pb-1.5 shrink-0">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Changes ({allChanges.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onStashPush}
            disabled={stashLoading || allChanges.length === 0}
            className="h-6 w-6 rounded border border-transparent text-text-secondary transition-all hover:border-border-40 hover:bg-surface-2 hover:text-accent disabled:opacity-40 flex items-center justify-center cursor-pointer"
            title="Stash changes"
          >
            {stashLoading ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
          </button>
          {stashes && stashes.length > 0 && (
            <button
              onClick={onStashPop}
              disabled={popLoading}
              className="relative h-6 w-6 rounded border border-transparent text-text-secondary transition-all hover:border-border-40 hover:bg-surface-2 hover:text-accent disabled:opacity-40 flex items-center justify-center cursor-pointer"
              title={`Pop latest stash (${stashes.length})`}
            >
              {popLoading ? <Loader2 size={11} className="animate-spin" /> : <History size={11} />}
              <span className="absolute -right-1 -top-1 min-w-[13px] rounded bg-accent px-0.5 text-[7px] font-bold leading-[13px] text-accent-fg">
                {stashes.length}
              </span>
            </button>
          )}
          {unstaged.length > 0 && (
            <button
              onClick={onStageAll}
              className="h-6 w-6 rounded border border-transparent text-accent transition-all hover:border-border-40 hover:bg-surface-2 flex items-center justify-center cursor-pointer"
              title="Stage all changes"
            >
              <CheckSquare size={11} />
            </button>
          )}
          {staged.length > 0 && (
            <button
              onClick={onUnstageAll}
              className="h-6 w-6 rounded border border-transparent text-text-secondary transition-all hover:border-border-40 hover:bg-surface-2 hover:text-text-primary flex items-center justify-center cursor-pointer"
              title="Unstage all changes"
            >
              <Square size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-1.5 mt-1.5 mb-1 px-1">
        <Search size={10} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Filter files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-[9px] text-text-primary outline-none placeholder-text-muted"
        />
      </div>

      {/* Scrollable File List */}
      <div className="flex-1 overflow-y-auto mt-1 space-y-1 pr-1">
        {isLoading ? (
          <div className="h-full flex items-center justify-center py-4 text-text-muted gap-1.5">
            <Loader2 size={12} className="animate-spin text-accent" />
            <span className="text-[10px]">Loading status...</span>
          </div>
        ) : filteredChanges.length > 0 ? (
          filteredChanges.map((file) => {
            const stageType = file.staged ? "staged" : "unstaged";
            const isSelected = selectedFile === file.path && selectedFileStage === stageType;

            return (
              <div
                key={`${file.staged ? "S" : "U"}:${file.path}`}
                className={`flex items-center justify-between py-1 px-1.5 rounded transition-all text-[10px] ${
                  isSelected ? "bg-accent-10 border border-accent-20" : "hover:bg-surface-2 border border-transparent"
                }`}
              >
                <button
                  onClick={() => (file.staged ? onUnstage(file.path) : onStage(file.path))}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  {file.staged ? (
                    <CheckSquare size={12} className="text-accent shrink-0" />
                  ) : (
                    <Square size={12} className="text-text-muted shrink-0" />
                  )}
                  <File size={11} className="text-text-secondary shrink-0" />
                  <span
                    className="text-text-primary truncate font-medium cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFile(file.path, stageType);
                    }}
                  >
                    {file.path}
                  </span>
                </button>
                <span
                  className={`text-[8px] font-bold uppercase px-1 rounded shrink-0 ${
                    file.status === "added" || file.status === "untracked"
                      ? "text-[#30d158]/80"
                      : file.status === "deleted"
                        ? "text-[#ff453a]/80"
                        : "text-[#ff9f0a]/80"
                  }`}
                >
                  {file.status.slice(0, 1).toUpperCase()}
                </span>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center text-text-muted space-y-1.5">
            <Check size={16} className="text-[#30d158]" />
            <span className="text-[10px] font-medium">
              {searchQuery ? "No matching files" : "Working directory clean"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
