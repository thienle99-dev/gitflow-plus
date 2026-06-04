import { useState, useMemo, useCallback } from "react";
import { X, Loader2, Copy, Check, Calendar, Sparkles, GitCommit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Commit } from "@/api/tauri";
import { useRepoStore } from "@/stores/repo";
import { useAICommitSummary } from "@/queries/useAI";
import { readAISettings } from "@/lib/ai";
import { showToast } from "@/lib/toast";

interface CommitSummaryDialogProps {
  onClose: () => void;
}

type TimeRange = "today" | "week" | "month" | "custom";

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

function filterByTimeRange(commits: Commit[], range: TimeRange, customFrom?: string, customTo?: string): Commit[] {
  const now = new Date();

  if (range === "custom") {
    const from = customFrom ? new Date(customFrom) : new Date(0);
    const to = customTo ? new Date(customTo + "T23:59:59") : now;
    return commits.filter((c) => {
      const d = new Date(c.date);
      return d >= from && d <= to;
    });
  }

  let cutoff: Date;
  switch (range) {
    case "today":
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoff = new Date(0);
  }

  return commits.filter((c) => new Date(c.date) >= cutoff);
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CommitSummaryDialog({ onClose }: CommitSummaryDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [copied, setCopied] = useState(false);

  const summaryMutation = useAICommitSummary();
  const aiConfigured = useMemo(() => {
    try {
      const s = readAISettings();
      return !!s.apiKey;
    } catch {
      return false;
    }
  }, []);

  // Fetch all commits (first page of 200 is usually enough)
  const { data: allCommits, isLoading: commitsLoading } = useQuery({
    queryKey: ["git", repoPath, "log", "all"],
    queryFn: () => api.log(repoPath!, 0, 200),
    enabled: !!repoPath,
    staleTime: 30_000,
  });

  const filteredCommits = useMemo(() => {
    if (!allCommits) return [];
    return filterByTimeRange(allCommits, timeRange, customFrom, customTo);
  }, [allCommits, timeRange, customFrom, customTo]);

  const handleGenerate = useCallback(() => {
    if (filteredCommits.length === 0) return;

    const commitData = filteredCommits.map((c) => ({
      hash: c.hash,
      message: c.message,
      date: c.date,
      author: c.author,
    }));

    const rangeLabel = timeRange === "custom"
      ? `${customFrom || "start"} to ${customTo || "now"}`
      : TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.label || timeRange;

    summaryMutation.mutate(
      { commits: commitData, timeRange: rangeLabel },
      {
        onError: (err) => {
          showToast(err.message || "Failed to generate summary", "error");
        },
      },
    );
  }, [filteredCommits, timeRange, customFrom, customTo, summaryMutation]);

  const handleCopy = useCallback(async () => {
    if (!summaryMutation.data?.summary) return;
    try {
      await navigator.clipboard.writeText(summaryMutation.data.summary);
      setCopied(true);
      showToast("Summary copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
  }, [summaryMutation.data]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-0 rounded-mac shadow-xl border border-border w-[620px] max-h-[80vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-40">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Commit History Summary</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-2 transition-colors text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Time Range Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Calendar size={12} />
              Time Range
            </label>
            <div className="flex items-center gap-1.5">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeRange(opt.value)}
                  className={`px-3 py-1 text-xs rounded-mac border transition-all ${
                    timeRange === opt.value
                      ? "bg-accent text-white border-accent"
                      : "bg-surface-1-30 text-text-secondary border-border-40 hover:border-accent-40 hover:text-text-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom date range inputs */}
            {timeRange === "custom" && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-surface-1-30 border border-border-40 rounded-mac text-text-primary focus:outline-none focus:border-accent"
                />
                <span className="text-xs text-text-muted">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-surface-1-30 border border-border-40 rounded-mac text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            )}
          </div>

          {/* Commit count badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <GitCommit size={12} />
              {filteredCommits.length} commit{filteredCommits.length !== 1 ? "s" : ""} in range
            </span>
            {commitsLoading && <Loader2 size={12} className="animate-spin text-accent" />}
          </div>

          {/* Commit list (collapsed preview) */}
          {filteredCommits.length > 0 && (
            <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3 max-h-[140px] overflow-y-auto">
              <div className="space-y-1">
                {filteredCommits.slice(0, 30).map((commit) => (
                  <div key={commit.hash} className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted font-mono text-2xs shrink-0 w-[52px]">
                      {commit.hash.slice(0, 7)}
                    </span>
                    <span className="text-text-primary truncate flex-1">{commit.message}</span>
                    <span className="text-text-muted text-2xs shrink-0">{formatRelativeDate(commit.date)}</span>
                  </div>
                ))}
                {filteredCommits.length > 30 && (
                  <div className="text-2xs text-text-muted pt-1">
                    … and {filteredCommits.length - 30} more commits
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredCommits.length === 0 && !commitsLoading && (
            <div className="text-center py-8 text-text-muted text-xs">
              No commits found for this time range. Try a different range.
            </div>
          )}

          {/* AI Summary */}
          {summaryMutation.isPending && (
            <div className="flex items-center justify-center gap-2 py-6 text-accent">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs font-medium">Generating standup summary…</span>
            </div>
          )}

          {summaryMutation.data?.summary && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                  <Sparkles size={12} className="text-accent" />
                  AI Standup Summary
                </span>
                <div className="flex items-center gap-2 text-2xs text-text-muted">
                  {summaryMutation.data.stats.authors.length > 0 && (
                    <span>{summaryMutation.data.stats.authors.join(", ")}</span>
                  )}
                  <span>·</span>
                  <span>{summaryMutation.data.stats.dateRange.from} → {summaryMutation.data.stats.dateRange.to}</span>
                </div>
              </div>
              <div className="bg-surface-1-30 border border-border-40 rounded-mac p-4 text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-mono">
                {summaryMutation.data.summary}
              </div>
            </div>
          )}

          {/* AI not configured warning */}
          {!aiConfigured && (
            <div className="bg-warning/10 border border-warning/20 rounded-mac px-3 py-2 text-xs text-warning">
              AI provider not configured. Set up your API key in Settings → AI to use this feature.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-40 bg-surface-1-30">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {summaryMutation.data?.summary && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-2-30 border border-border-40 rounded-mac text-text-secondary hover:text-text-primary hover:border-accent-40 transition-all"
              >
                {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={filteredCommits.length === 0 || summaryMutation.isPending || !aiConfigured}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded-mac font-medium hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {summaryMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              Generate Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
