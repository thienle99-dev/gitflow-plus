import { Sparkles, RefreshCw, MessageSquare, Undo2 } from "lucide-react";
import { AI_REVIEW_MODE_OPTIONS, type AIReviewMode, type InlineReviewComment } from "@/lib/ai";
import type { DiffHunk } from "@/lib/parse-diff";

export interface DiffToolbarProps {
  filePath: string;
  source: "working" | "staged" | "commit";
  diffViewMode: "split" | "unified";
  setDiffViewMode: (mode: "split" | "unified") => void;
  showFullContext: boolean;
  setShowFullContext: (v: boolean) => void;
  deletedCount: number;
  addedCount: number;
  showReview: boolean;
  onToggleAiReview: () => void;
  showInlineComments: boolean;
  onToggleInlineComments: () => void;
  reviewMode: AIReviewMode;
  onReviewModeChange: (mode: AIReviewMode) => void;
  reviewLoading: boolean;
  inlineCommentsLoading: boolean;
  inlineCommentsCount: number;
  onClose?: () => void;
  // Hunk actions
  hunks: DiffHunk[];
  canPatch: boolean;
  applying: number | null;
  onApplyHunk: (hunk: DiffHunk, index: number, action: "stage" | "unstage" | "discard") => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  batchingAll?: boolean;
  error: string | null;
  inlineCommentsError: string | null;
  onRetryInlineComments: () => void;
  // Undo and applied state
  canUndo: boolean;
  onUndo: () => void;
  appliedHunks: Set<number>;
  appliedLines: Set<string>;
}

export default function DiffToolbar({
  filePath,
  source,
  diffViewMode,
  setDiffViewMode,
  showFullContext,
  setShowFullContext,
  deletedCount,
  addedCount,
  showReview,
  onToggleAiReview,
  showInlineComments,
  onToggleInlineComments,
  reviewMode,
  onReviewModeChange,
  reviewLoading,
  inlineCommentsLoading,
  inlineCommentsCount,
  hunks,
  canPatch,
  applying,
  onApplyHunk,
  onAcceptAll,
  onRejectAll,
  batchingAll = false,
  error,
  inlineCommentsError,
  onRetryInlineComments,
  canUndo,
  onUndo,
  appliedHunks,
  appliedLines,
}: DiffToolbarProps) {
  return (
    <>
      <div className="border-b border-border px-3 py-1 text-2xs text-text-muted flex items-center gap-3 bg-surface-1-40 shrink-0">
        <span>{filePath}</span>
        <span className="text-[#ff375f]">-{deletedCount}</span>
        <span className="text-[#30d158]">+{addedCount}</span>
        {source !== "commit" && (
          <span className="capitalize">{source} diff</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {canUndo && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs text-[#ff9f0a] hover:bg-[#ff9f0a]/10 transition-colors"
              title="Undo last staging action"
            >
              <Undo2 size={10} />
              <span>Undo</span>
            </button>
          )}
          <button
            onClick={() => setDiffViewMode("split")}
            className={`px-1.5 py-0.5 rounded text-2xs transition-colors ${
              diffViewMode === "split"
                ? "bg-surface-3 text-text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setDiffViewMode("unified")}
            className={`px-1.5 py-0.5 rounded text-2xs transition-colors ${
              diffViewMode === "unified"
                ? "bg-surface-3 text-text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
            }`}
          >
            Unified
          </button>
        </div>
        <button
          onClick={() => setShowFullContext(!showFullContext)}
          className={`px-1.5 py-0.5 rounded text-2xs transition-colors ${
            showFullContext
              ? "bg-surface-3 text-text-primary"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
          }`}
          title="Show full file context"
        >
          Full
        </button>
        <select
          value={reviewMode}
          onChange={(event) => onReviewModeChange(event.target.value as AIReviewMode)}
          className="h-6 max-w-[136px] rounded border border-border-40 bg-surface-1 px-1.5 text-2xs text-text-secondary outline-none hover:bg-surface-2 focus:border-accent"
          title="Choose AI review focus"
        >
          {AI_REVIEW_MODE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <button
          onClick={onToggleAiReview}
          disabled={reviewLoading}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-2 transition-all ${
            reviewLoading
              ? "bg-accent-10 text-accent"
              : "text-accent hover:text-accent-hover"
          }`}
          title={reviewLoading ? "Analyzing changes…" : "Analyze and explain code changes with AI"}
        >
          {reviewLoading ? (
            <RefreshCw size={11} className="animate-spin" />
          ) : (
            <Sparkles size={11} />
          )}
          <span>{reviewLoading ? "Analyzing…" : "AI Explain & Review"}</span>
        </button>
        <button
          onClick={onToggleInlineComments}
          disabled={inlineCommentsLoading}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-2 transition-all ${
            inlineCommentsLoading
              ? "bg-accent-10 text-accent"
              : showInlineComments
                ? "text-[#ff9f0a] bg-[#ff9f0a]/10"
                : "text-text-muted hover:text-text-secondary"
          }`}
          title={inlineCommentsLoading ? "Generating inline comments…" : "Generate AI inline review comments on diff lines"}
        >
          {inlineCommentsLoading ? (
            <RefreshCw size={11} className="animate-spin" />
          ) : (
            <MessageSquare size={11} />
          )}
          <span>{inlineCommentsLoading ? "Generating…" : "Inline Comments"}</span>
          {inlineCommentsCount > 0 && (
            <span className="ml-0.5 rounded bg-[#ff9f0a]/20 px-1 text-[9px] font-bold text-[#ff9f0a]">
              {inlineCommentsCount}
            </span>
          )}
        </button>
      </div>
      {canPatch && hunks.length > 0 && (
        <div className="border-b border-border bg-surface-1 max-h-[120px] overflow-y-auto">
          {hunks.map((hunk, index) => {
            const add = hunk.lines.filter((line) => line.type === "add").length;
            const del = hunk.lines.filter((line) => line.type === "delete").length;
            const isApplied = appliedHunks.has(index);
            return (
              <div
                key={`${hunk.header}:${index}`}
                className={`min-h-7 px-3 py-1 flex items-center gap-2 border-b border-border-60 last:border-b-0 ${isApplied ? "bg-[#30d158]/5" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-2xs text-text-muted">
                  {hunk.header}
                </span>
                {isApplied && (
                  <span className="text-[9px] font-semibold text-[#30d158] bg-[#30d158]/10 border border-[#30d158]/20 rounded px-1 py-0.5 leading-none">
                    Applied
                  </span>
                )}
                <span className="text-2xs text-[#ff375f]">-{del}</span>
                <span className="text-2xs text-[#30d158]">+{add}</span>
                {source === "working" ? (
                  <>
                    <button
                      className={`ghost text-2xs px-2 ${applying === index ? "opacity-60" : isApplied ? "opacity-50" : "text-[#30d158] hover:bg-[#30d158]/10"}`}
                      onClick={() => onApplyHunk(hunk, index, "stage")}
                      disabled={applying !== null || batchingAll}
                      title={applying === index ? "Applying hunk…" : isApplied ? "Hunk already applied" : "Accept all changes in this hunk (stage)"}
                    >
                      {applying === index ? (
                        <><RefreshCw size={10} className="animate-spin inline" /> Applying…</>
                      ) : "✓ Accept Hunk"}
                    </button>
                    <button
                      className={`ghost text-2xs px-2 ${applying === index ? "opacity-60" : "text-[#ff375f] hover:bg-[#ff375f]/10"}`}
                      onClick={() => onApplyHunk(hunk, index, "discard")}
                      disabled={applying !== null || batchingAll}
                      title={applying === index ? "Applying hunk…" : "Reject and discard all changes in this hunk"}
                    >
                      {applying === index ? (
                        <><RefreshCw size={10} className="animate-spin inline" /> Applying…</>
                      ) : "✗ Reject Hunk"}
                    </button>
                  </>
                ) : (
                  <button
                    className={`ghost text-2xs px-2 ${applying === index ? "opacity-60" : isApplied ? "opacity-50" : "hover:text-[#ff9f0a]"}`}
                    onClick={() => onApplyHunk(hunk, index, "unstage")}
                    disabled={applying !== null || batchingAll}
                    title={applying === index ? "Applying hunk…" : isApplied ? "Hunk already applied" : "Unstage this hunk"}
                  >
                    {applying === index ? (
                      <><RefreshCw size={10} className="animate-spin inline" /> Applying…</>
                    ) : "↩ Unstage Hunk"}
                  </button>
                )}
              </div>
            );
          })}
          {source === "working" && hunks.length > 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border-60 bg-surface-1-20">
              <button
                className={`ghost text-2xs px-2 font-medium ${batchingAll ? "opacity-60" : "text-[#30d158] hover:bg-[#30d158]/10"}`}
                onClick={() => onAcceptAll?.()}
                disabled={applying !== null || batchingAll}
                title={batchingAll ? "Accepting all hunks…" : "Accept all hunks at once (stage)"}
              >
                {batchingAll ? (
                  <><RefreshCw size={10} className="animate-spin inline" /> Accepting…</>
                ) : `✓ Accept All (${hunks.length})`}
              </button>
              <button
                className={`ghost text-2xs px-2 font-medium ${batchingAll ? "opacity-60" : "text-[#ff375f] hover:bg-[#ff375f]/10"}`}
                onClick={() => onRejectAll?.()}
                disabled={applying !== null || batchingAll}
                title={batchingAll ? "Rejecting all hunks…" : "Reject all hunks at once (discard)"}
              >
                {batchingAll ? (
                  <><RefreshCw size={10} className="animate-spin inline" /> Rejecting…</>
                ) : `✗ Reject All (${hunks.length})`}
              </button>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="border-b border-border px-3 py-1 text-2xs text-[#ff375f] bg-surface-1">
          {error}
        </div>
      )}
      {inlineCommentsError && showInlineComments && (
        <div className="border-b border-border px-3 py-1 text-2xs text-[#ff375f] bg-surface-1 flex items-center gap-2">
          <span>Inline comments failed: {inlineCommentsError}</span>
          <button
            onClick={onRetryInlineComments}
            className="text-accent underline"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
}
