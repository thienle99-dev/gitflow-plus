import { Sparkles, RefreshCw } from "lucide-react";
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
}

export default function DiffAIReview({
  showReview,
  reviewResult,
  reviewLoading,
  reviewError,
  onClose,
  onRetry,
}: DiffAIReviewProps) {
  if (!showReview) return null;

  return (
    <div className="w-[360px] border-l border-border flex flex-col bg-surface-1 overflow-hidden shrink-0 animate-in slide-in-from-right duration-200">
      <div className="h-9 px-3 border-b border-border flex items-center justify-between bg-surface-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
          <Sparkles size={13} className="text-accent" />
          <span>AI Code Review</span>
        </div>
        <button
          onClick={onClose}
          className="text-2xs text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface-3 transition-colors"
        >
          Close
        </button>
      </div>
      
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
            <button
              onClick={onRetry}
              className="text-2xs text-accent underline block"
            >
              Retry Analysis
            </button>
          </div>
        ) : (
          <AIMarkdown content={reviewResult} />
        )}
      </div>
    </div>
  );
}
