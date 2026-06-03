import { useEffect, useMemo, useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscardHunk, setConfirmDiscardHunk] = useState<{ hunk: DiffHunk; index: number } | null>(null);
  const [confirmDiscardLine, setConfirmDiscardLine] = useState<{ hunk: DiffHunk; lineIndex: number } | null>(null);

  const [showReview, setShowReview] = useState(false);
  const [reviewResult, setReviewResult] = useState<string>("");
  const [reviewMode, setReviewMode] = useState<AIReviewMode>(() => readLastAIReviewMode());
  const aiReview = useAIDiffReview();

  const [showInlineComments, setShowInlineComments] = useState(false);
  const [inlineComments, setInlineComments] = useState<InlineReviewComment[]>([]);
  const inlineCommentsMutation = useAIInlineComments();
  const autoFiredRef = useRef(false);

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

  const applyHunk = async (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => {
    if (!repoPath) return;
    if (action === "discard") {
      setConfirmDiscardHunk({ hunk, index });
      return;
    }

    setApplying(index);
    setError(null);
    try {
      await api.diff.applyHunk(repoPath, buildHunkPatch(patchPrefix, hunk), action);
      onPatchApplied?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setApplying(null);
    }
  };

  const doDiscardHunk = async (hunk: DiffHunk, index: number) => {
    setConfirmDiscardHunk(null);
    if (!repoPath) return;
    setApplying(index);
    setError(null);
    try {
      await api.diff.applyHunk(repoPath, buildHunkPatch(patchPrefix, hunk), "discard");
      onPatchApplied?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setApplying(null);
    }
  };

  const applyLine = async (
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
      onPatchApplied?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setApplying(null);
    }
  };

  const doDiscardLine = async (hunk: DiffHunk, lineIndex: number) => {
    setConfirmDiscardLine(null);
    if (!repoPath) return;
    setApplying(lineIndex);
    setError(null);
    try {
      const line = hunk.lines[lineIndex];
      const patch = buildSingleLinePatch(patchPrefix, hunk, line);
      await api.diff.applyHunk(repoPath, patch, "discard");
      onPatchApplied?.();
    } catch (e: any) {
      setError(String(e));
    } finally {
      setApplying(null);
    }
  };

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
          error={error}
          inlineCommentsError={inlineCommentsMutation.isError ? (inlineCommentsMutation.error instanceof Error ? inlineCommentsMutation.error.message : "Unknown error") : null}
          onRetryInlineComments={handleRetryInlineComments}
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
      />
    </div>
    <ConfirmDialog
      open={!!confirmDiscardHunk}
      title="Discard Hunk"
      message="Discard this hunk from the working tree?"
      confirmLabel="Discard"
      variant="destructive"
      onConfirm={() => confirmDiscardHunk && doDiscardHunk(confirmDiscardHunk.hunk, confirmDiscardHunk.index)}
      onCancel={() => setConfirmDiscardHunk(null)}
    />
    <ConfirmDialog
      open={!!confirmDiscardLine}
      title="Discard Line"
      message="Discard this line from the working tree?"
      confirmLabel="Discard"
      variant="destructive"
      onConfirm={() => confirmDiscardLine && doDiscardLine(confirmDiscardLine.hunk, confirmDiscardLine.lineIndex)}
      onCancel={() => setConfirmDiscardLine(null)}
    />
    </>
  );
}
