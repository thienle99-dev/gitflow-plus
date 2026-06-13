import { useState, useEffect, useCallback, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import {
  useRebaseTodoList,
  useRebaseStart,
  useRebaseContinue,
  useRebaseSkip,
  useRebaseAbort,
  useRebaseStatus,
  usePausedCommitInfo,
  useAmendAndContinue,
} from "@/queries/useGitRebase";
import type { RebaseTodo } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import {
  GitCommit,
  AlertTriangle,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Pencil,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface InteractiveRebaseDialogProps {
  open: boolean;
  baseCommit: string;
  onClose: () => void;
  prefilledTodos?: RebaseTodo[];
}

type RebaseAction = "pick" | "squash" | "fixup" | "reword" | "edit" | "drop";

const ACTION_OPTIONS: { value: RebaseAction; label: string; description: string }[] = [
  { value: "pick", label: "Pick", description: "Keep commit as-is" },
  { value: "reword", label: "Reword", description: "Keep changes, edit message" },
  { value: "edit", label: "Edit", description: "Pause for amending" },
  { value: "squash", label: "Squash", description: "Meld into previous commit" },
  { value: "fixup", label: "Fixup", description: "Like squash, discard message" },
  { value: "drop", label: "Drop", description: "Remove commit entirely" },
];

const ACTION_COLORS: Record<RebaseAction, string> = {
  pick: "bg-accent/10 text-accent border-accent/20",
  reword: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  edit: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  squash: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  fixup: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  drop: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function InteractiveRebaseDialog({
  open,
  baseCommit,
  onClose,
  prefilledTodos,
}: InteractiveRebaseDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const prefilledFromStore = useUIStore((s) => s.prefilledRebaseTodos);
  const amendTargetHash = useUIStore((s) => s.amendTargetHash);
  const setAmendTargetHash = useUIStore((s) => s.setAmendTargetHash);
  const { data: apiTodos, isLoading: isLoadingTodos, error: todoError } =
    useRebaseTodoList(repoPath, baseCommit);
  const rebaseStart = useRebaseStart(repoPath);
  const rebaseContinue = useRebaseContinue(repoPath);
  const rebaseSkip = useRebaseSkip(repoPath);
  const rebaseAbort = useRebaseAbort(repoPath);
  const { data: rebaseStatus } = useRebaseStatus(repoPath);

  const [todos, setTodos] = useState<RebaseTodo[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [conflictMode, setConflictMode] = useState(false);
  const [conflictedFiles, setConflictedFiles] = useState<string[]>([]);
  const [editPauseMode, setEditPauseMode] = useState(false);
  const [amendMessage, setAmendMessage] = useState("");
  const messageInputRef = useRef<HTMLInputElement>(null);

  const {
    data: pausedInfo,
    isLoading: isLoadingPausedInfo,
  } = usePausedCommitInfo(editPauseMode ? repoPath : null);
  const amendAndContinue = useAmendAndContinue(repoPath);

  // When paused info loads, pre-fill the amend message
  useEffect(() => {
    if (pausedInfo) {
      setAmendMessage(pausedInfo.message);
    }
  }, [pausedInfo]);

  // Sync initial todos — prefer prefilledTodos prop, then store, then API
  useEffect(() => {
    const source = prefilledTodos || prefilledFromStore || apiTodos;
    if (source) {
      const next = source.map((t) => ({ ...t }));
      // If amending a specific commit, auto-mark it as "edit"
      if (amendTargetHash) {
        const idx = next.findIndex(
          (t) => t.commit_hash === amendTargetHash
        );
        if (idx !== -1) {
          next[idx] = { ...next[idx], action: "edit" };
        }
        setAmendTargetHash(null);
      }
      setTodos(next);
    }
  }, [prefilledTodos, prefilledFromStore, apiTodos, amendTargetHash, setAmendTargetHash]);

  // Detect state from rebase status: conflict vs edit-pause
  useEffect(() => {
    if (rebaseStatus && rebaseStatus[0]) {
      const files = rebaseStatus[1];
      if (files.length > 0) {
        setConflictMode(true);
        setConflictedFiles(files);
        setEditPauseMode(false);
      } else {
        // Rebase in progress but no conflicts → edit-pause
        setEditPauseMode(true);
        setConflictMode(false);
        setConflictedFiles([]);
      }
    }
  }, [rebaseStatus]);

  // Focus message input when editing
  useEffect(() => {
    if (editingIndex !== null) {
      messageInputRef.current?.focus();
    }
  }, [editingIndex]);

  const updateAction = useCallback((index: number, action: RebaseAction) => {
    setTodos((prev) =>
      prev.map((t, i) => (i === index ? { ...t, action } : t))
    );
  }, []);

  const updateMessage = useCallback((index: number, message: string) => {
    setTodos((prev) =>
      prev.map((t, i) => (i === index ? { ...t, message } : t))
    );
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setTodos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      reorder(fromIndex, toIndex);
      setDragIndex(null);
    },
    [reorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const startEditMessage = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditMessage(todos[index].message);
    },
    [todos]
  );

  const commitEditMessage = useCallback(() => {
    if (editingIndex !== null) {
      updateMessage(editingIndex, editMessage);
    }
    setEditingIndex(null);
    setEditMessage("");
  }, [editingIndex, editMessage, updateMessage]);

  const handleStartRebase = async () => {
    const activeTodos = todos.filter((t) => t.action !== "drop");
    if (activeTodos.length === 0) {
      showToast("Cannot rebase with all commits dropped", "error");
      return;
    }
    try {
      const result = await rebaseStart.mutateAsync({
        base: baseCommit,
        todos,
      });
      if (result.success) {
        if (result.conflicted_files?.length > 0) {
          setConflictMode(true);
          setConflictedFiles(result.conflicted_files);
        } else {
          showToast(result.message || "Rebase completed successfully");
          onClose();
        }
      } else {
        if (result.conflicted_files?.length > 0) {
          setConflictMode(true);
          setConflictedFiles(result.conflicted_files);
        } else if (result.message?.includes("Stopped at")) {
          // Rebase paused at an "edit" commit — enter edit-pause mode
          setEditPauseMode(true);
        } else {
          showToast(result.message || "Rebase failed", "error");
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Rebase failed: ${msg}`, "error");
    }
  };

  const handleContinue = async () => {
    try {
      await rebaseContinue.mutateAsync();
      showToast("Rebase continued");
      setConflictMode(false);
      setConflictedFiles([]);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("conflict")) {
        // Still in conflict — re-check status
        showToast("Conflicts still present — resolve them first", "error");
      } else {
        showToast(`Continue failed: ${msg}`, "error");
      }
    }
  };

  const handleSkip = async () => {
    try {
      await rebaseSkip.mutateAsync();
      showToast("Commit skipped");
      setConflictMode(false);
      setConflictedFiles([]);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Skip failed: ${msg}`, "error");
    }
  };

  const handleAbort = async () => {
    try {
      await rebaseAbort.mutateAsync();
      showToast("Rebase aborted");
      setConflictMode(false);
      setConflictedFiles([]);
      setEditPauseMode(false);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Abort failed: ${msg}`, "error");
    }
  };

  const handleAmendAndContinue = async () => {
    try {
      const result = await amendAndContinue.mutateAsync({
        message: amendMessage || undefined,
      });
      if (result.success) {
        showToast("Commit amended, rebase continued");
        setEditPauseMode(false);
        onClose();
      } else if (result.conflicted_files?.length > 0) {
        // Subsequent commits hit conflicts
        setEditPauseMode(false);
        setConflictMode(true);
        setConflictedFiles(result.conflicted_files);
      } else {
        showToast(result.message || "Amend failed", "error");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Amend failed: ${msg}`, "error");
    }
  };

  if (!open) return null;

  const isPending =
    rebaseStart.isPending ||
    rebaseContinue.isPending ||
    rebaseSkip.isPending ||
    rebaseAbort.isPending ||
    amendAndContinue.isPending;

  const allDropped = todos.every((t) => t.action === "drop");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center anim-overlay-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="absolute inset-0 bg-[#000000]/45" />
      <div className="relative w-[min(580px,92vw)] max-h-[min(720px,85vh)] bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden flex flex-col anim-dialog-enter">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-1-40 shrink-0">
          {conflictMode ? (
            <AlertTriangle size={15} className="text-[#ff9500] shrink-0" />
          ) : editPauseMode ? (
            <Pencil size={15} className="text-[#ff9f0a] shrink-0" />
          ) : (
            <RotateCcw size={15} className="text-accent shrink-0" />
          )}
          <span className="text-xs font-semibold text-text-primary flex-1">
            {conflictMode
              ? "Rebase — Conflicts Detected"
              : editPauseMode
                ? "Amend Commit"
                : "Interactive Rebase"}
          </span>
          <button
            onClick={onClose}
            disabled={isPending}
            className="ghost p-1 text-text-muted hover:text-text-primary"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {conflictMode ? (
            /* Conflict Resolution UI */
            <div className="p-4 space-y-4">
              <div className="bg-red-500/5 border border-red-500/10 rounded-mac p-3.5 space-y-2">
                <div className="text-2xs font-semibold text-[#ff453a] flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  <span>
                    Conflicted Files ({conflictedFiles.length})
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {conflictedFiles.map((f) => (
                    <div
                      key={f}
                      className="text-2xs text-text-muted font-mono bg-surface-1-30 border border-border-40 rounded px-2 py-1 truncate"
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-2xs text-text-muted leading-normal">
                Resolve the conflicts in your editor, stage the resolved files,
                then click <strong>Continue</strong>. Or skip this commit / abort
                the rebase entirely.
              </p>
            </div>
          ) : editPauseMode ? (
            /* Edit Pause / Amend UI */
            <div className="p-4 space-y-4">
              {isLoadingPausedInfo ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-xs text-text-muted animate-pulse flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    Loading commit info...
                  </div>
                </div>
              ) : (
                <>
                  {/* Commit message editor */}
                  <div className="space-y-2">
                    <label className="text-2xs font-medium text-text-muted flex items-center gap-1.5">
                      <Pencil size={10} />
                      Commit Message
                    </label>
                    <textarea
                      value={amendMessage}
                      onChange={(e) => setAmendMessage(e.target.value)}
                      className="w-full h-32 px-3 py-2 text-sm bg-surface-1 border border-border rounded-mac outline-none focus:border-[#ff9f0a] resize-none text-text-primary font-mono leading-relaxed placeholder:text-text-muted"
                      placeholder="Edit commit message..."
                    />
                  </div>

                  {/* Files in current commit */}
                  {pausedInfo?.staged_files && pausedInfo.staged_files.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-2xs font-medium text-text-muted flex items-center gap-1.5">
                        <GitCommit size={10} />
                        Files in Commit ({pausedInfo.staged_files.length})
                      </div>
                      <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                        {pausedInfo.staged_files.map((f) => (
                          <div
                            key={f.path}
                            className="flex items-center gap-2 text-2xs font-mono text-text-muted bg-surface-1-30 border border-border-40 rounded px-2 py-1 truncate"
                          >
                            <span className={`shrink-0 w-[24px] px-1 py-0.5 rounded-sm text-center font-bold ${
                              f.status === "A" ? "text-[#30d158] bg-[#30d158]/10" :
                              f.status === "D" ? "text-[#ff453a] bg-[#ff453a]/10" :
                              f.status === "M" ? "text-[#ff9f0a] bg-[#ff9f0a]/10" :
                              "text-text-muted bg-surface-2"
                            }`}>
                              {f.status}
                            </span>
                            <span className="truncate">{f.path}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hint */}
                  <div className="p-3 rounded-mac bg-yellow-500/5 border border-yellow-500/20 text-2xs text-text-muted leading-normal">
                    <p>
                      Edit the commit message above. You can also stage additional
                      files from the working tree panel, then click <strong>Continue Amend</strong>.
                    </p>
                    <p className="mt-1">
                      Click <strong>Abort</strong> to cancel the rebase entirely.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : isLoadingTodos ? (
            /* Loading State */
            <div className="p-6 flex items-center justify-center">
              <div className="text-xs text-text-muted animate-pulse">
                Loading commits...
              </div>
            </div>
          ) : todoError ? (
            /* Error State */
            <div className="p-4 space-y-2">
              <div className="text-xs text-[#ff453a] flex items-center gap-1.5">
                <AlertTriangle size={12} />
                <span>Failed to load commits</span>
              </div>
              <p className="text-2xs text-text-muted">
                {todoError instanceof Error
                  ? todoError.message
                  : String(todoError)}
              </p>
            </div>
          ) : (
            /* Commit List (Edit Mode) */
            <div className="p-4 space-y-3">
              {/* Base commit indicator */}
              <div className="flex items-center gap-2 text-2xs text-text-muted bg-surface-1-30 border border-border-40 rounded-mac px-3 py-2">
                <GitCommit size={12} className="text-accent shrink-0" />
                <span>
                  Rebase onto{" "}
                  <code className="font-mono text-accent bg-accent-10 px-1 py-0.5 rounded-sm">
                    {baseCommit.slice(0, 7)}
                  </code>
                </span>
              </div>

              {/* Commit rows */}
              <ul className="space-y-1">
                {todos.map((todo, index) => {
                  const isDrop = todo.action === "drop";
                  const isEditing = editingIndex === index;
                  const showMsgEdit =
                    todo.action === "reword" || todo.action === "squash";
                  const isDragging = dragIndex === index;

                  return (
                    <li
                      key={todo.commit_hash}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`
                        group rounded-mac border transition-all duration-150
                        ${isDragging ? "border-accent/50 bg-accent/5 scale-[1.01] shadow-md" : "border-border-40 bg-surface-1-30 hover:border-border"}
                        ${isDrop ? "opacity-50" : ""}
                      `}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        {/* Drag handle */}
                        <GripVertical
                          size={12}
                          className="text-text-muted/40 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        />

                        {/* Action selector */}
                        <div className="relative shrink-0">
                          <select
                            value={todo.action}
                            onChange={(e) =>
                              updateAction(index, e.target.value as RebaseAction)
                            }
                            className={`
                              appearance-none pr-5 pl-1.5 py-0.5 text-2xs font-bold uppercase tracking-wider
                              rounded border cursor-pointer outline-none
                              ${ACTION_COLORS[todo.action as RebaseAction] || ACTION_COLORS.pick}
                            `}
                            title={
                              ACTION_OPTIONS.find(
                                (o) => o.value === todo.action
                              )?.description
                            }
                          >
                            {ACTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={10}
                            className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50"
                          />
                        </div>

                        {/* Short hash */}
                        <code className="text-2xs font-mono text-text-muted shrink-0 w-[52px]">
                          {todo.commit_hash.slice(0, 7)}
                        </code>

                        {/* Message */}
                        <span
                          className={`text-xs truncate flex-1 min-w-0 ${
                            isDrop
                              ? "line-through text-text-muted"
                              : "text-text-primary"
                          }`}
                        >
                          {todo.message}
                        </span>

                        {/* Edit message button (for reword/squash) */}
                        {showMsgEdit && !isDrop && (
                          <button
                            onClick={() => startEditMessage(index)}
                            className="ghost p-0.5 text-text-muted hover:text-text-primary text-2xs shrink-0"
                            title="Edit message"
                          >
                            ✎
                          </button>
                        )}
                      </div>

                      {/* Inline message editor */}
                      {isEditing && (
                        <div className="px-3 pb-2 pt-0 anim-slide-down-enter">
                          <input
                            ref={messageInputRef}
                            type="text"
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEditMessage();
                              if (e.key === "Escape") {
                                setEditingIndex(null);
                                setEditMessage("");
                              }
                            }}
                            onBlur={commitEditMessage}
                            className="w-full h-7 px-2 text-xs bg-surface-0 border border-border-60 rounded-mac outline-none focus:border-accent-60 text-text-primary"
                            placeholder="Commit message..."
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Legend toggle */}
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {showLegend ? (
                  <ChevronDown size={10} />
                ) : (
                  <ChevronRight size={10} />
                )}
                Action Legend
              </button>
              {showLegend && (
                <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3 space-y-1.5 anim-slide-down-enter">
                  {ACTION_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wider rounded border ${
                          ACTION_COLORS[opt.value]
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-2xs text-text-muted">
                        {opt.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border-60 bg-surface-1 shrink-0">
          {conflictMode ? (
            <>
              <span className="text-2xs text-text-muted flex-1 leading-normal">
                Resolve conflicts in your working tree, then continue.
              </span>
              <button
                onClick={handleAbort}
                disabled={isPending}
                className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              >
                {rebaseAbort.isPending ? "Aborting..." : "Abort"}
              </button>
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              >
                {rebaseSkip.isPending ? "Skipping..." : "Skip"}
              </button>
              <button
                onClick={handleContinue}
                disabled={isPending}
                className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity min-w-[64px] flex items-center justify-center"
              >
                {rebaseContinue.isPending ? "Continuing..." : "Continue"}
              </button>
            </>
          ) : editPauseMode ? (
            <>
              <span className="text-2xs text-text-muted flex-1 leading-normal">
                Amend commit, then continue rebase.
              </span>
              <button
                onClick={handleAbort}
                disabled={isPending}
                className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              >
                {rebaseAbort.isPending ? "Aborting..." : "Abort"}
              </button>
              <button
                onClick={handleAmendAndContinue}
                disabled={isPending || isLoadingPausedInfo}
                className="h-8 px-4 bg-[#ff9f0a] text-black text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity min-w-[64px] flex items-center justify-center gap-1.5"
              >
                {amendAndContinue.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Continue Amend
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isPending}
                className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRebase}
                disabled={isPending || allDropped || todos.length === 0}
                className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity min-w-[64px] flex items-center justify-center"
              >
                {rebaseStart.isPending ? "Rebasing..." : "Start Rebase"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
