import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { useAIDiffReview, useAIInlineComments } from "@/queries/useAI";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import { parseDiff, type DiffHunk, type DiffLine } from "@/lib/parse-diff";
import { readLastAIReviewMode, saveLastAIReviewMode, type AIReviewMode, type InlineReviewComment } from "@/lib/ai";
import { buildHunkPatch, buildSingleLinePatch, getPatchPrefix } from "./diff-utils";
import DiffToolbar from "./DiffToolbar";
import DiffSplitView from "./DiffSplitView";
import DiffUnifiedView from "./DiffUnifiedView";
import DiffAIReview from "./DiffAIReview";
import { trackDiffOpen, trackDiffHunkAction, trackAIReview, trackAIInlineComments } from "@/lib/analytics";
import { showToast } from "@/lib/toast";
import { Undo2 } from "lucide-react";

interface UndoEntry {
  type: "hunk" | "line";
  action: "stage" | "unstage" | "discard";
  hunkIndex: number;
  lineIndex?: number;
  timestamp: number;
}

interface DiffViewerProps {
  diff: string;
  filePath: string;
  source?: "working" | "staged" | "commit";
  onPatchApplied?: () => void;
  autoInlineReview?: boolean;
}

export default function DiffViewer({
  diff,
  filePath,
  source = "commit",
  onPatchApplied,
  autoInlineReview = false,
}: DiffViewerProps) {
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const repoPath = useRepoStore((s) => s.repoPath);
  const appTheme = useRepoStore((s) => s.theme);
  const [applying, setApplying] = useState<number | null>(null);
  const [batchingAll, setBatchingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscardHunk, setConfirmDiscardHunk] = useState<{ hunk: DiffHunk; index: number } | null>(null);
  const [confirmDiscardLine, setConfirmDiscardLine] = useState<{ hunk: DiffHunk; lineIndex: number } | null>(null);
  const [confirmRejectAll, setConfirmRejectAll] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [appliedHunks, setAppliedHunks] = useState<Set<number>>(new Set());
  const [appliedLines, setAppliedLines] = useState<Set<string>>(new Set());

  const [showReview, setShowReview] = useState(false);
  const [reviewResult, setReviewResult] = useState<string>("");
  const [reviewMode, setReviewMode] = useState<AIReviewMode>(() => readLastAIReviewMode());
  const aiReview = useAIDiffReview();

  const [showInlineComments, setShowInlineComments] = useState(false);
  const [inlineComments, setInlineComments] = useState<InlineReviewComment[]>([]);
  const inlineCommentsMutation = useAIInlineComments();
  const autoFiredRef = useRef(false);

  useEffect(() => {
    trackDiffOpen(diffViewMode);
  }, [diffViewMode]);

  useEffect(() => {
    setReviewResult("");
    setShowReview(false);
    aiReview.reset();
    setInlineComments([]);
    setShowInlineComments(false);
    inlineCommentsMutation.reset();
    autoFiredRef.current = false;
  }, [filePath, diff]);

  useEffect(() => {
    if (autoInlineReview && diff && !autoFiredRef.current) {
      autoFiredRef.current = true;
      handleToggleInlineComments();
    }
  }, [autoInlineReview, diff]);

  const handleToggleAiReview = async () => {
    if (showReview) {
      setShowReview(false);
      return;
    }
    
    setShowReview(true);
    trackAIReview(reviewMode);
    if (reviewResult) return;

    try {
      setReviewResult(await aiReview.mutateAsync({ filePath, diff, repoPath: repoPath ?? undefined, mode: reviewMode }));
    } catch {
      // Error is rendered from the mutation state.
    }
  };

  const handleToggleInlineComments = async () => {
    if (showInlineComments) {
      setShowInlineComments(false);
      return;
    }

    setShowInlineComments(true);
    if (inlineComments.length > 0) return;

    try {
      const comments = await inlineCommentsMutation.mutateAsync({
        filePath,
        diff,
        repoPath: repoPath ?? undefined,
        mode: reviewMode,
      });
      setInlineComments(comments);
      trackAIInlineComments(comments.length);
    } catch {
      // Error is rendered from the mutation state.
    }
  };

  const handleReviewModeChange = (mode: AIReviewMode) => {
    setReviewMode(mode);
    saveLastAIReviewMode(mode);
    setReviewResult("");
    aiReview.reset();
  };

  const hunks = useMemo(() => parseDiff(diff), [diff]);
  const { deletedCount, addedCount } = useMemo(
    () => hunks.reduce(
      (counts, hunk) => {
        for (const line of hunk.lines) {
          if (line.type === "delete") counts.deletedCount++;
          if (line.type === "add") counts.addedCount++;
        }
        return counts;
      },
      { deletedCount: 0, addedCount: 0 },
    ),
    [hunks],
  );
  const patchPrefix = useMemo(() => getPatchPrefix(diff), [diff]);
  const canPatch = source === "working" || source === "staged";

  const applyHunk = useCallback(async (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => {
    if (!repoPath) return;
    if (action === "discard") {
      setConfirmDiscardHunk({ hunk, index });
      return;
    }

    setApplying(index);
    setError(null);
    try {
      await api.diff.applyHunk(repoPath, buildHunkPatch(patchPrefix, hunk), action);
      trackDiffHunkAction(action);
      setAppliedHunks((prev) => new Set(prev).add(index));
      setUndoStack((prev) => [
        { type: "hunk", action, hunkIndex: index, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      onPatchApplied?.();
    } catch (e: any) {
      const errorStr = String(e);
      if (errorStr.includes("patch does not apply")) {
        setError(`Patch failed: The hunk context doesn't match the current file state. Try refreshing the diff or manually editing the file.`);
      } else if (errorStr.includes("corrupt patch")) {
        setError(`Patch failed: The patch is malformed. This may be due to binary content or encoding issues.`);
      } else {
        setError(`Patch failed: ${errorStr}`);
      }
    } finally {
      setApplying(null);
    }
  }, [repoPath, patchPrefix, onPatchApplied]);

  const doDiscardHunk = async (hunk: DiffHunk, index: number) => {
    setConfirmDiscardHunk(null);
    if (!repoPath) return;
    setApplying(index);
    setError(null);
    try {
      await api.diff.applyHunk(repoPath, buildHunkPatch(patchPrefix, hunk), "discard");
      trackDiffHunkAction("discard");
      setAppliedHunks((prev) => new Set(prev).add(index));
      setUndoStack((prev) => [
        { type: "hunk", action: "discard", hunkIndex: index, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      onPatchApplied?.();
    } catch (e: any) {
      const errorStr = String(e);
      if (errorStr.includes("patch does not apply")) {
        setError(`Discard failed: The hunk context doesn't match the current file state. The file may have been modified since the diff was generated.`);
      } else {
        setError(`Discard failed: ${errorStr}`);
      }
    } finally {
      setApplying(null);
    }
  };

  const applyLine = useCallback(async (
    hunk: DiffHunk,
    lineIndex: number,
    action: "stage" | "unstage" | "discard",
  ) => {
    if (!repoPath) return;
    if (action === "discard") {
      setConfirmDiscardLine({ hunk, lineIndex });
      return;
    }

    setApplying(lineIndex);
    setError(null);
    try {
      const line = hunk.lines[lineIndex];
      const patch = buildSingleLinePatch(patchPrefix, hunk, line);
      await api.diff.applyHunk(repoPath, patch, action);
      trackDiffHunkAction(action);
      const lineKey = `${hunk.header}:${lineIndex}`;
      setAppliedLines((prev) => new Set(prev).add(lineKey));
      setUndoStack((prev) => [
        { type: "line", action, hunkIndex: hunks.indexOf(hunk), lineIndex, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      onPatchApplied?.();
    } catch (e: any) {
      const errorStr = String(e);
      if (errorStr.includes("patch does not apply")) {
        setError(`Line patch failed: The line context doesn't match. This can happen when surrounding lines have changed.`);
      } else if (errorStr.includes("corrupt patch")) {
        setError(`Line patch failed: Could not create a valid patch for this single line. Try staging the entire hunk instead.`);
      } else {
        setError(`Line patch failed: ${errorStr}`);
      }
    } finally {
      setApplying(null);
    }
  }, [repoPath, patchPrefix, hunks, onPatchApplied]);

  const doDiscardLine = async (hunk: DiffHunk, lineIndex: number) => {
    setConfirmDiscardLine(null);
    if (!repoPath) return;
    setApplying(lineIndex);
    setError(null);
    try {
      const line = hunk.lines[lineIndex];
      const patch = buildSingleLinePatch(patchPrefix, hunk, line);
      await api.diff.applyHunk(repoPath, patch, "discard");
      trackDiffHunkAction("discard");
      const lineKey = `${hunk.header}:${lineIndex}`;
      setAppliedLines((prev) => new Set(prev).add(lineKey));
      setUndoStack((prev) => [
        { type: "line", action: "discard", hunkIndex: hunks.indexOf(hunk), lineIndex, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      onPatchApplied?.();
    } catch (e: any) {
      const errorStr = String(e);
      if (errorStr.includes("patch does not apply")) {
        setError(`Line discard failed: The line context doesn't match. The file may have been modified since the diff was generated.`);
      } else {
        setError(`Line discard failed: ${errorStr}`);
      }
    } finally {
      setApplying(null);
    }
  };

  const handleAcceptAll = useCallback(async () => {
    if (!repoPath || hunks.length === 0) return;
    setBatchingAll(true);
    setError(null);
    try {
      for (let i = 0; i < hunks.length; i++) {
        await api.diff.applyHunk(repoPath, buildHunkPatch(patchPrefix, hunks[i]), "stage");
      }
      onPatchApplied?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setBatchingAll(false);
    }
  }, [repoPath, patchPrefix, hunks, onPatchApplied]);

  const handleRejectAll = useCallback(() => {
    setConfirmRejectAll(true);
  }, []);

  const doRejectAll = useCallback(async () => {
    setConfirmRejectAll(false);
    if (!repoPath || hunks.length === 0) return;
    setBatchingAll(true);
    setError(null);
    try {
      for (let i = 0; i < hunks.length; i++) {
        await api.diff.applyHunk(repoPath, buildHunkPatch(patchPrefix, hunks[i]), "discard");
      }
      onPatchApplied?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setBatchingAll(false);
    }
  }, [repoPath, patchPrefix, hunks, onPatchApplied]);

  const handleRetryInlineComments = () => {
    setInlineComments([]);
    inlineCommentsMutation.reset();
    handleToggleInlineComments();
  };

  const handleRetryAiReview = () => {
    setReviewResult("");
    aiReview.reset();
    handleToggleAiReview();
  };

  const handleScrollToLine = (line: number, side: "old" | "new") => {
    window.dispatchEvent(new CustomEvent("gitflow-scroll-to-line", { detail: { filePath, line, side } }));
  };

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0 || !repoPath) return;
    
    const lastEntry = undoStack[0];
    const reverseAction = lastEntry.action === "stage" ? "unstage" : lastEntry.action === "unstage" ? "stage" : null;
    
    if (!reverseAction) {
      showToast("Cannot undo discard actions", "info");
      return;
    }

    setApplying(lastEntry.hunkIndex);
    setError(null);
    try {
      const hunk = hunks[lastEntry.hunkIndex];
      if (!hunk) {
        showToast("Hunk no longer available", "error");
        return;
      }

      let patch: string;
      if (lastEntry.type === "line" && lastEntry.lineIndex !== undefined) {
        const line = hunk.lines[lastEntry.lineIndex];
        if (!line) {
          showToast("Line no longer available", "error");
          return;
        }
        patch = buildSingleLinePatch(patchPrefix, hunk, line);
      } else {
        patch = buildHunkPatch(patchPrefix, hunk);
      }

      await api.diff.applyHunk(repoPath, patch, reverseAction);
      trackDiffHunkAction(reverseAction);
      
      setUndoStack((prev) => prev.slice(1));
      
      if (lastEntry.type === "hunk") {
        setAppliedHunks((prev) => {
          const next = new Set(prev);
          next.delete(lastEntry.hunkIndex);
          return next;
        });
      } else {
        const lineKey = `${hunk.header}:${lastEntry.lineIndex}`;
        setAppliedLines((prev) => {
          const next = new Set(prev);
          next.delete(lineKey);
          return next;
        });
      }
      
      showToast(`Undid ${reverseAction} action`, "success");
      onPatchApplied?.();
    } catch (e: any) {
      setError(`Undo failed: ${String(e)}`);
    } finally {
      setApplying(null);
    }
  }, [undoStack, repoPath, hunks, patchPrefix, onPatchApplied]);

  return (
    <>
    <div className="flex-1 flex overflow-hidden bg-surface-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        <DiffToolbar
          filePath={filePath}
          source={source}
          diffViewMode={diffViewMode}
          setDiffViewMode={setDiffViewMode}
          showFullContext={false}
          setShowFullContext={() => {}}
          deletedCount={deletedCount}
          addedCount={addedCount}
          showReview={showReview}
          onToggleAiReview={handleToggleAiReview}
          showInlineComments={showInlineComments}
          onToggleInlineComments={handleToggleInlineComments}
          reviewMode={reviewMode}
          onReviewModeChange={handleReviewModeChange}
          reviewLoading={aiReview.isPending}
          inlineCommentsLoading={inlineCommentsMutation.isPending}
          inlineCommentsCount={inlineComments.length}
          hunks={hunks}
          canPatch={canPatch}
          applying={applying}
          onApplyHunk={applyHunk}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          batchingAll={batchingAll}
          error={error}
          inlineCommentsError={inlineCommentsMutation.isError ? (inlineCommentsMutation.error instanceof Error ? inlineCommentsMutation.error.message : "Unknown error") : null}
          onRetryInlineComments={handleRetryInlineComments}
          canUndo={undoStack.length > 0}
          onUndo={handleUndo}
          appliedHunks={appliedHunks}
          appliedLines={appliedLines}
        />
        {diffViewMode === "split" ? (
          <DiffSplitView
            hunks={hunks}
            filePath={filePath}
            appTheme={appTheme}
            source={source}
            onAction={applyHunk}
            onLineAction={applyLine}
            inlineComments={inlineComments}
            showInlineComments={showInlineComments}
          />
        ) : (
          <DiffUnifiedView
            hunks={hunks}
            filePath={filePath}
            appTheme={appTheme}
            source={source}
            onAction={applyHunk}
            onLineAction={applyLine}
            inlineComments={inlineComments}
            showInlineComments={showInlineComments}
          />
        )}
      </div>

      <DiffAIReview
        showReview={showReview}
        reviewResult={reviewResult}
        reviewLoading={aiReview.isPending}
        reviewError={aiReview.error instanceof Error ? aiReview.error : aiReview.error ? new Error(String(aiReview.error)) : null}
        showInlineComments={showInlineComments}
        inlineComments={inlineComments}
        inlineCommentsLoading={inlineCommentsMutation.isPending}
        inlineCommentsError={inlineCommentsMutation.error instanceof Error ? inlineCommentsMutation.error : inlineCommentsMutation.error ? new Error(String(inlineCommentsMutation.error)) : null}
        onClose={() => setShowReview(false)}
        onRetry={handleRetryAiReview}
        onScrollToLine={handleScrollToLine}
      />
    </div>
    <ConfirmDialog
      open={!!confirmDiscardHunk}
      title="Discard Hunk"
      message="Discard this hunk from the working tree? The selected code block will be reverted to its committed state."
      impactItems={[
        {
          label: "Lines in this hunk will be reverted to the committed version",
          severity: "irreversible",
        },
        {
          label: "Other changes in the same file are preserved",
          severity: "info",
        },
      ]}
      confirmLabel="Discard Hunk"
      variant="destructive"
      onConfirm={() => confirmDiscardHunk && doDiscardHunk(confirmDiscardHunk.hunk, confirmDiscardHunk.index)}
      onCancel={() => setConfirmDiscardHunk(null)}
    />
    <ConfirmDialog
      open={!!confirmDiscardLine}
      title="Discard Line"
      message="Discard this line from the working tree? The selected line will be reverted to its committed state."
      impactItems={[
        {
          label: "This line will be reverted to the committed version",
          severity: "irreversible",
        },
        {
          label: "Other changes in the same file are preserved",
          severity: "info",
        },
      ]}
      confirmLabel="Discard Line"
      variant="destructive"
      onConfirm={() => confirmDiscardLine && doDiscardLine(confirmDiscardLine.hunk, confirmDiscardLine.lineIndex)}
      onCancel={() => setConfirmDiscardLine(null)}
    />
    <ConfirmDialog
      open={confirmRejectAll}
      title="Reject All Hunks"
      message={`Discard all ${hunks.length} hunks from the working tree? All changes in this file will be reverted to its committed state.`}
      impactItems={[
        {
          label: `All ${hunks.length} hunks will be reverted to the committed version`,
          severity: "irreversible",
        },
      ]}
      confirmLabel="Reject All"
      variant="destructive"
      onConfirm={doRejectAll}
      onCancel={() => setConfirmRejectAll(false)}
    />
    </>
  );
}
