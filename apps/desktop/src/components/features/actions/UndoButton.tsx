import { useState, useRef, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useReflogList, useUndoLast } from "@/queries/useGitReflog";
import { Undo2, GitCommit, RotateCcw, History } from "lucide-react";

interface UndoButtonProps {
  /** If true, the dropdown with reflog entries is always visible */
  expanded?: boolean;
  onUndoComplete?: () => void;
}

export default function UndoButton({ expanded: controlledExpanded, onUndoComplete }: UndoButtonProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: reflog } = useReflogList(repoPath, 10);
  const undoLast = useUndoLast(repoPath);

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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
      showToast(`Error: ${e}`);
    }
  };

  const displayOpen = controlledExpanded ?? open;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={!repoPath}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-text-primary border border-border rounded-mac disabled:opacity-30 transition-colors"
        title="Undo last commit"
      >
        <Undo2 size={12} />
        <span>Undo</span>
      </button>

      {/* Dropdown with reflog */}
      {displayOpen && reflog && reflog.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-[320px] bg-surface-0 border border-border rounded-mac shadow-xl z-40 overflow-hidden">
          {/* Header with undo action */}
          <div className="px-2 py-1.5 border-b border-border bg-surface-1">
            <button
              onClick={handleUndo}
              disabled={undoLast.isPending}
              className="w-full flex items-center gap-1.5 px-2 py-1 bg-accent text-accent-fg text-2xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <RotateCcw size={10} />
              <span>{undoLast.isPending ? "Undoing..." : "Undo Last Commit (git reset --soft HEAD~1)"}</span>
            </button>
          </div>

          {/* Reflog entries */}
          <div className="max-h-[200px] overflow-y-auto">
            <div className="flex items-center gap-1 px-2 py-1 text-2xs text-text-muted bg-surface-1 border-b border-border">
              <History size={9} />
              <span>Recent reflog</span>
            </div>
            {reflog.map((entry) => (
              <div
                key={entry.index}
                className="flex items-center gap-1.5 px-2 py-1 border-b border-border/50 hover:bg-surface-1 transition-colors"
              >
                <GitCommit size={9} className="shrink-0 text-text-muted" />
                <span className="text-2xs font-mono text-text-muted w-[52px] shrink-0">
                  {entry.commit_hash?.slice(0, 7)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-2xs text-text-primary truncate">
                    {entry.action}: {entry.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-2 py-1 border-t border-border bg-surface-1 text-2xs text-text-muted">
            HEAD@{reflog.length - 1} is the most recent entry
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 toast">{toast}</div>}
    </div>
  );
}
