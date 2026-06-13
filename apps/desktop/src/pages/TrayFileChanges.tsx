import { useMemo } from "react";
import {
  File,
  CheckSquare,
  Square,
  Check,
  Loader2,
  Search,
} from "lucide-react";
import type { FileChange } from "@/api/tauri";

export interface TrayFileChangesProps {
  staged: FileChange[];
  unstaged: FileChange[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  isLoading: boolean;
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
  isLoading,
}: TrayFileChangesProps) {
  const allChanges = useMemo(() => [...staged, ...unstaged], [staged, unstaged]);

  const filteredChanges = useMemo(() => {
    if (!searchQuery.trim()) return allChanges;
    const q = searchQuery.toLowerCase();
    return allChanges.filter((f) => f.path.toLowerCase().includes(q));
  }, [allChanges, searchQuery]);

  return (
    <div className="flex flex-col border border-border-40 bg-surface-1 rounded-lg overflow-hidden" style={{ maxHeight: "260px" }}>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-border-40 shrink-0">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Files ({allChanges.length})
        </span>
        <div className="flex items-center gap-1">
          {unstaged.length > 0 && (
            <button
              onClick={onStageAll}
              className="h-6 px-1.5 text-[9px] font-semibold rounded-md border border-transparent text-accent hover:border-border-40 hover:bg-surface-2 transition-all flex items-center gap-1"
              title="Stage all"
            >
              <CheckSquare size={10} />
              Stage All
            </button>
          )}
          {staged.length > 0 && (
            <button
              onClick={onUnstageAll}
              className="h-6 px-1.5 text-[9px] font-semibold rounded-md border border-transparent text-text-secondary hover:border-border-40 hover:bg-surface-2 transition-all flex items-center gap-1"
              title="Unstage all"
            >
              <Square size={10} />
              Unstage
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 border-b border-border-40">
        <Search size={10} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Filter files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-[10px] text-text-primary outline-none placeholder-text-muted"
        />
      </div>

      {/* File List */}
      <div className="overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-text-muted gap-1.5">
            <Loader2 size={11} className="animate-spin text-accent" />
            <span className="text-[10px]">Loading...</span>
          </div>
        ) : filteredChanges.length > 0 ? (
          filteredChanges.map((file) => (
            <div
              key={`${file.staged ? "S" : "U"}:${file.path}`}
              className="flex items-center justify-between py-1.5 px-2.5 hover:bg-surface-2 transition-colors border-b border-border-20 last:border-b-0"
            >
              <button
                onClick={() => (file.staged ? onUnstage(file.path) : onStage(file.path))}
                className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
              >
                {file.staged ? (
                  <CheckSquare size={12} className="text-accent shrink-0" />
                ) : (
                  <Square size={12} className="text-text-muted shrink-0" />
                )}
                <File size={11} className="text-text-secondary shrink-0" />
                <span className="text-[10px] text-text-primary truncate font-medium">
                  {file.path}
                </span>
              </button>
              <span
                className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded shrink-0 ml-1.5 ${
                  file.status === "added" || file.status === "untracked"
                    ? "text-[#30d158]"
                    : file.status === "deleted"
                      ? "text-[#ff453a]"
                      : "text-[#ff9f0a]"
                }`}
              >
                {file.status.slice(0, 1).toUpperCase()}
              </span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-text-muted gap-1.5">
            <Check size={14} className="text-[#30d158]" />
            <span className="text-[10px] font-medium">
              {searchQuery ? "No matching files" : "Working directory clean"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
