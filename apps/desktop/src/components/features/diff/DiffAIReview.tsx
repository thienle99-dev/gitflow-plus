import { useState, useMemo } from "react";
import { Sparkles, RefreshCw, MessageSquare, Check, X, Filter, ChevronDown } from "lucide-react";
import AIMarkdown from "@/components/ui/feedback/AIMarkdown";
import type { InlineReviewComment } from "@/lib/ai";

export interface DiffAIReviewProps {
  showReview: boolean;
  reviewResult: string;
  reviewLoading: boolean;
  reviewError: Error | null;
  showInlineComments: boolean;
  inlineComments: InlineReviewComment[];
  inlineCommentsLoading: boolean;
  inlineCommentsError: Error | null;
  onClose: () => void;
  onRetry: () => void;
  onScrollToLine?: (line: number, side: "old" | "new") => void;
}

const SEVERITY_ORDER = ["error", "warning", "info"] as const;
const SEVERITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  error: { label: "Error", color: "text-[#ff453a]", bg: "bg-[#ff453a]/10 border-[#ff453a]/20" },
  warning: { label: "Warning", color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/10 border-[#ff9f0a]/20" },
  info: { label: "Info", color: "text-[#0a84ff]", bg: "bg-[#0a84ff]/10 border-[#0a84ff]/20" },
};

export default function DiffAIReview({
  showReview,
  reviewResult,
  reviewLoading,
  reviewError,
  showInlineComments,
  inlineComments,
  inlineCommentsLoading,
  inlineCommentsError,
  onClose,
  onRetry,
  onScrollToLine,
}: DiffAIReviewProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const filteredComments = useMemo(() => {
    return inlineComments.filter((_, i) => !dismissed.has(i));
  }, [inlineComments, dismissed]);

  const visibleComments = useMemo(() => {
    if (filterSeverity === "all") return filteredComments;
    return filteredComments.filter((c) => c.severity === filterSeverity);
  }, [filteredComments, filterSeverity]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { error: 0, warning: 0, info: 0 };
    for (const c of filteredComments) {
      counts[c.severity]++;
    }
    return counts;
  }, [filteredComments]);

  const hasComments = showInlineComments && (inlineComments.length > 0 || inlineCommentsLoading);
  const activeFilterCount = filterSeverity !== "all" ? severityCounts[filterSeverity] || 0 : filteredComments.length;

  if (!showReview && !hasComments) return null;

  return (
    <div className="w-[360px] border-l border-border flex flex-col bg-surface-1 overflow-hidden shrink-0 anim-slide-right-enter">
      {/* Header */}
      <div className="h-9 px-3 border-b border-border flex items-center justify-between bg-surface-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary min-w-0">
          {hasComments ? (
            <MessageSquare size={13} className="text-accent shrink-0" />
          ) : (
            <Sparkles size={13} className="text-accent shrink-0" />
          )}
          <span className="truncate">
            {hasComments ? "Inline Comments" : "AI Code Review"}
          </span>
          {hasComments && inlineComments.length > 0 && (
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-accent-10 text-accent text-[9px] font-bold">
              {inlineComments.length - dismissed.size + dismissed.size > 0 ? `${filteredComments.length}` : "0"}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-2xs text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface-3 transition-colors shrink-0"
        >
          Close
        </button>
      </div>

      {/* Inline Comments Summary */}
      {hasComments && (
        <div className="border-b border-border">
          {/* Severity filter tabs */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface-1-40 border-b border-border-40">
            {(["all", ...SEVERITY_ORDER] as const).map((s) => {
              const count = s === "all" ? filteredComments.length : severityCounts[s] || 0;
              const isActive = filterSeverity === s;
              const sev = s === "all" ? null : SEVERITY_LABELS[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterSeverity(s)}
                  className={`h-6 px-2 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${
                    isActive
                      ? `${sev?.bg || "bg-accent-10 border-accent-20"} text-text-primary`
                      : "text-text-muted hover:text-text-primary hover:bg-surface-2"
                  }`}
                >
                  {s !== "all" && (
                    <span className={`w-1.5 h-1.5 rounded-full ${sev?.color.replace("text-", "bg-")}`} />
                  )}
                  <span className="capitalize">{s === "all" ? "All" : s}</span>
                  <span className={`text-[9px] ${isActive ? "opacity-80" : "text-text-muted"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Comment list */}
          <div className="max-h-[300px] overflow-y-auto">
            {inlineCommentsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-2xs text-text-muted">
                <RefreshCw size={12} className="animate-spin" />
                Generating inline comments...
              </div>
            ) : inlineCommentsError ? (
              <div className="p-3 text-2xs text-[#ff453a]">
                {inlineCommentsError.message}
                <button onClick={onRetry} className="text-accent underline ml-1">Retry</button>
              </div>
            ) : visibleComments.length === 0 ? (
              <div className="py-8 text-center text-2xs text-text-muted">
                {dismissed.size > 0 ? "All comments dismissed" : "No comments"}
              </div>
            ) : (
              <div className="py-1 space-y-0.5">
                {visibleComments.map((comment, idx) => {
                  const i = inlineComments.indexOf(comment);
                  const sev = SEVERITY_LABELS[comment.severity] || SEVERITY_LABELS.info;
                  const lineRef = comment.side === "new" ? `${comment.line}+` : `${comment.line}-`;

                  return (
                    <div
                      key={`${comment.side}:${comment.line}:${comment.category}:${idx}`}
                      className="mx-1.5 px-2 py-1.5 rounded-mac border border-transparent hover:border-border-40 hover:bg-surface-2-40 transition-all cursor-pointer group"
                      onClick={() => onScrollToLine?.(comment.line, comment.side)}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${sev.bg} ${sev.color}`}>
                          {comment.category}
                        </span>
                        <span className={`text-[9px] font-medium capitalize ${sev.color}`}>
                          {comment.severity}
                        </span>
                        <span className="ml-auto flex items-center gap-1">
                          <span className="text-[9px] font-mono text-text-muted">{lineRef}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDismissed((prev) => new Set(prev).add(i)); }}
                            className="opacity-0 group-hover:opacity-100 h-4 w-4 inline-flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-3 transition-all shrink-0"
                            title="Dismiss"
                          >
                            <X size={9} />
                          </button>
                        </span>
                      </div>
                      <p className="text-2xs text-text-primary leading-relaxed">{comment.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Review panel (below comments) */}
      {showReview && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
          {reviewLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 text-text-muted py-10">
              <RefreshCw size={24} className="animate-spin text-accent" />
              <span className="text-xs">Analyzing and reviewing changes...</span>
            </div>
          ) : reviewError ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-mac space-y-2">
              <div className="text-xs font-semibold text-[#ff453a]">Review Failed</div>
              <div className="text-2xs text-text-secondary break-words whitespace-pre-wrap">
                {reviewError.message}
              </div>
              <button onClick={onRetry} className="text-2xs text-accent underline block">
                Retry Analysis
              </button>
            </div>
          ) : (
            <AIMarkdown content={reviewResult} />
          )}
        </div>
      )}
    </div>
  );
}
