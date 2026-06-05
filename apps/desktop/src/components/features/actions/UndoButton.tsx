import { useState, useRef, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useReflogList, useUndoLast } from "@/queries/useGitReflog";
import { showToast } from "@/lib/toast";
import { Undo2, GitCommit, RotateCcw, History } from "lucide-react";

interface UndoButtonProps {
  /** If true, the dropdown with reflog entries is always visible */
  expanded?: boolean;
  compact?: boolean;
  onUndoComplete?: () => void;
}

export default function UndoButton({ expanded: controlledExpanded, compact = false, onUndoComplete }: UndoButtonProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: reflog } = useReflogList(repoPath, 10);
  const undoLast = useUndoLast(repoPath);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleUndo = async () => {
    try {
      const msg = await undoLast.mutateAsync();
      showToast(msg || "Last commit undone");
      setOpen(false);
      onUndoComplete?.();
    } catch (e: any) {
      showToast(`Error: ${e}`, "error");
    }
  };

  const displayOpen = controlledExpanded ?? open;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={!repoPath}
        className={`${compact ? "h-7 px-2 text-3xs" : "h-8 px-3.5 text-2xs"} flex items-center gap-1.5 font-semibold text-text-muted hover:text-text-primary bg-transparent border border-transparent hover:border-border-40 hover:bg-surface-2 rounded-mac disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all cursor-pointer`}
        title="Undo last commit"
      >
        <Undo2 size={compact ? 10 : 11} className="text-text-muted" />
        <span>Undo</span>
      </button>

      {/* Dropdown with reflog */}
      {displayOpen && reflog && reflog.length > 0 && (
        <div className="absolute right-0 bottom-full mb-1.5 w-[320px] bg-surface-1-95 backdrop-blur-md border border-border-60 rounded-mac shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header with undo action */}
          <div className="px-2.5 py-2 border-b border-border-40 bg-surface-2-20">
            <button
              onClick={handleUndo}
              disabled={undoLast.isPending}
              className="w-full h-7 flex items-center justify-center gap-1.5 px-2 bg-accent text-accent-fg text-2xs font-bold rounded-mac disabled:opacity-40 hover:opacity-95 transition-all shadow-sm cursor-pointer"
            >
              <RotateCcw size={10} />
              <span>{undoLast.isPending ? "Undoing..." : "Undo Last Commit (git reset --soft)"}</span>
            </button>
          </div>

          {/* Reflog entries */}
          <div className="max-h-[180px] overflow-y-auto">
            <div className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted-70 bg-surface-2-30 border-b border-border-40">
              <History size={10} />
              <span>Recent Actions</span>
            </div>
            {reflog.map((entry) => (
              <div
                key={entry.index}
                className="flex items-center gap-2 px-3 py-2 border-b border-border-40 hover:bg-surface-2-40 transition-colors"
              >
                <GitCommit size={10} className="shrink-0 text-text-muted" />
                <span className="text-[10px] font-mono font-bold text-accent bg-accent-10 px-1 py-0.5 rounded-[3px] shrink-0">
                  {entry.commit_hash?.slice(0, 7)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-2xs text-text-primary font-medium truncate">
                    <span className="text-text-secondary">{entry.action}:</span> {entry.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-border-40 bg-surface-2-20 text-[10px] font-semibold text-text-muted">
            HEAD@{reflog.length - 1} is the most recent entry
          </div>
        </div>
      )}

    </div>
  );
}
