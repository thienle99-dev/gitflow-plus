import { useState, useEffect, useRef } from "react";
import Dialog from "@/components/ui/overlay/Dialog";
import { api, type CommitGroupProgress } from "@/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { showToast } from "@/lib/toast";
import { trackCommit, trackAICommitSplit } from "@/lib/analytics";
import { RefreshCw, X, ChevronDown, ChevronRight, GitCommit, Sparkles } from "lucide-react";
import type { CommitScopeSuggestion, CommitGroup } from "@/lib/ai";

interface CommitSplitDialogProps {
  open: boolean;
  suggestion: CommitScopeSuggestion | null;
  repoPath: string;
  onClose: () => void;
  onCommitted: () => void;
}

const GROUP_COLORS = [
  { border: "border-l-[#0a84ff]", bg: "bg-[#0a84ff]/8", badge: "bg-[#0a84ff]/15 text-[#0a84ff]", ring: "ring-[#0a84ff]/30" },
  { border: "border-l-[#30d158]", bg: "bg-[#30d158]/8", badge: "bg-[#30d158]/15 text-[#30d158]", ring: "ring-[#30d158]/30" },
  { border: "border-l-[#ff9f0a]", bg: "bg-[#ff9f0a]/8", badge: "bg-[#ff9f0a]/15 text-[#ff9f0a]", ring: "ring-[#ff9f0a]/30" },
  { border: "border-l-[#bf5af2]", bg: "bg-[#bf5af2]/8", badge: "bg-[#bf5af2]/15 text-[#bf5af2]", ring: "ring-[#bf5af2]/30" },
];

export default function CommitSplitDialog({
  open,
  suggestion,
  repoPath,
  onClose,
  onCommitted,
}: CommitSplitDialogProps) {
  const [groups, setGroups] = useState<CommitGroup[]>([]);
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [expandedFiles, setExpandedFiles] = useState<Record<number, boolean>>({});
  const [committing, setCommitting] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);
  const [currentGroupIdx, setCurrentGroupIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState<CommitGroupProgress | null>(null);
  const [skipHooks, setSkipHooks] = useState(false);
  const prevSuggestionRef = useRef<CommitScopeSuggestion | null>(null);
  const committedCountRef = useRef(0);

  // Initialize groups when suggestion changes
  useEffect(() => {
    if (suggestion && suggestion !== prevSuggestionRef.current) {
      prevSuggestionRef.current = suggestion;
      setGroups([...suggestion.groups]);
      const msgs: Record<number, string> = {};
      suggestion.groups.forEach((g, i) => { msgs[i] = g.message; });
      setMessages(msgs);
      setExpandedFiles({});
      setCommittedCount(0);
      committedCountRef.current = 0;
      setCurrentGroupIdx(null);
      setProgress(null);
    }
  }, [suggestion]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;

    listen<CommitGroupProgress>("commit-groups-progress", (event) => {
      if (disposed) return;
      setProgress(event.payload);
      setCurrentGroupIdx(event.payload.current - 1);
      const completed = Math.max(0, event.payload.current - 1);
      committedCountRef.current = completed;
      setCommittedCount(completed);
    }).then((fn) => {
      if (disposed) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setCommitting(false);
      setCurrentGroupIdx(null);
      setProgress(null);
    }
  }, [open]);

  const getMessage = (idx: number) => messages[idx] ?? groups[idx]?.message ?? "";
  const updateMessage = (idx: number, value: string) => setMessages((prev) => ({ ...prev, [idx]: value }));
  const toggleFiles = (idx: number) => setExpandedFiles((prev) => ({ ...prev, [idx]: !prev[idx] }));
  const removeGroup = (idx: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== idx));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setExpandedFiles((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const handleCommitAll = async () => {
    if (committing || groups.length === 0) return;
    setCommitting(true);
    setCommittedCount(0);
    committedCountRef.current = 0;
    setCurrentGroupIdx(null);
    setProgress(null);

    try {
      const groupsToCommit = groups.map((group, i) => ({
        files: group.files,
        message: getMessage(i) || group.message,
      }));
      const result = await api.commit.commitGroups(repoPath, groupsToCommit, skipHooks);
      committedCountRef.current = result.committed;
      setCommittedCount(result.committed);
      for (const group of groups) {
        trackCommit(group.files.length);
      }
      trackAICommitSplit(groups.length);
      showToast(result.message || `Committed ${result.committed} ${result.committed === 1 ? "commit" : "commits"}`);
      onCommitted();
      onClose();
    } catch (e: any) {
      if (committedCountRef.current > 0) {
        showToast(`Committed ${committedCountRef.current} of ${groups.length} groups: ${e}`, "info");
        onCommitted();
      } else {
        showToast(`Commit failed: ${e}`, "error");
      }
    } finally {
      setCommitting(false);
      setCurrentGroupIdx(null);
      setProgress(null);
    }
  };

  const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);

  return (
    <Dialog
      open={open}
      onClose={committing ? () => {} : onClose}
      title="AI Commit Split"
      maxWidth="560px"
    >
      {!suggestion ? (
        <div className="flex items-center gap-2 py-4 text-sm text-text-muted">
          <RefreshCw size={14} className="animate-spin" />
          <span>Analyzing changes...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="py-4 text-sm text-text-secondary text-center">
          All groups have been removed. Close to dismiss.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Sparkles size={12} className="text-accent shrink-0" />
            <span>
              {suggestion.explanation || `AI suggests splitting ${totalFiles} files into ${groups.length} commits`}
            </span>
          </div>

          {/* Groups */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {groups.map((group, i) => {
              const color = GROUP_COLORS[i % GROUP_COLORS.length];
              const isExpanded = expandedFiles[i];
              const isCurrentGroup = committing && currentGroupIdx === i;
              const isDone = committing && currentGroupIdx !== null && i < currentGroupIdx;

              return (
                <div
                  key={`${group.message}-${i}`}
                  className={`rounded-mac border-l-[3px] ${color.border} border border-border-20 ${color.bg} p-3 space-y-2 transition-all ${
                    isDone ? "opacity-50" : ""
                  } ${isCurrentGroup ? `ring-2 ${color.ring}` : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {/* Group number */}
                    <span className="shrink-0 w-5 h-5 rounded-full bg-surface-2 border border-border-40 flex items-center justify-center text-2xs font-bold text-text-secondary mt-0.5">
                      {isDone ? "✓" : i + 1}
                    </span>

                    {/* Message input */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={getMessage(i)}
                        onChange={(e) => updateMessage(i, e.target.value)}
                        disabled={committing}
                        className="w-full text-xs font-mono font-semibold text-text-primary bg-surface-0 border border-border-30 rounded px-2 py-1.5 outline-none focus:border-accent-50 transition-colors disabled:opacity-60"
                        placeholder="Commit message..."
                      />

                      {/* Reason */}
                      <p className="mt-1 text-2xs text-text-muted italic leading-relaxed">{group.reason}</p>

                      {/* File count + expand */}
                      <button
                        type="button"
                        onClick={() => toggleFiles(i)}
                        disabled={committing}
                        className="mt-1 flex items-center gap-1 text-2xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>{group.files.length} file{group.files.length !== 1 ? "s" : ""}</span>
                      </button>

                      {/* Expanded file list */}
                      {isExpanded && (
                        <div className="mt-1.5 space-y-0.5 max-h-32 overflow-y-auto">
                          {group.files.map((f, fi) => (
                            <div key={fi} className="font-mono text-2xs text-text-secondary bg-surface-0/50 rounded px-2 py-0.5 truncate">
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    {!committing && (
                      <button
                        type="button"
                        onClick={() => removeGroup(i)}
                        className="shrink-0 w-5 h-5 inline-flex items-center justify-center rounded text-text-muted hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors cursor-pointer"
                        title="Remove this group"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-border-40">
            <button
              type="button"
              onClick={handleCommitAll}
              disabled={committing || groups.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-accent-fg py-2 cursor-pointer bg-accent hover:opacity-90 rounded-mac border border-accent transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {committing ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Committing {progress?.current ?? committedCount + 1} of {progress?.total ?? groups.length}...</span>
                </>
              ) : (
                <>
                  <GitCommit size={12} />
                  <span>Commit all {groups.length} groups</span>
                </>
              )}
            </button>
            <label
              className="inline-flex items-center gap-1.5 text-2xs text-text-muted hover:text-text-secondary cursor-pointer select-none"
              title="Skip Git pre-commit hooks for split commits (--no-verify)"
            >
              <input
                type="checkbox"
                checked={skipHooks}
                onChange={(e) => setSkipHooks(e.target.checked)}
                disabled={committing}
                className="h-3 w-3 accent-accent cursor-pointer disabled:cursor-not-allowed"
              />
              <span>Skip hooks</span>
            </label>
            {!committing && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-text-muted hover:text-text-primary py-2 px-3 cursor-pointer bg-surface-2-30 hover:bg-surface-2 rounded-mac border border-border-30 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
