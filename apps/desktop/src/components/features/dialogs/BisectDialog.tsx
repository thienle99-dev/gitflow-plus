import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useBisectStatus, useBisectStart, useBisectStep, useBisectReset } from "@/queries/useGitBisect";
import { analyzeBisectCandidate, type BisectAnalysis } from "@/lib/ai";
import { showToast } from "@/lib/toast";
import { api } from "@/api/tauri";
import {
  GitCommitHorizontal,
  RotateCcw,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertTriangle,
  FileText,
  Search,
  Check,
  X,
} from "lucide-react";
import Dialog from "@/components/ui/overlay/Dialog";

export default function BisectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: bisectStatus } = useBisectStatus(repoPath);
  const bisectStart = useBisectStart(repoPath);
  const bisectGood = useBisectStep(repoPath, "good");
  const bisectBad = useBisectStep(repoPath, "bad");
  const bisectSkip = useBisectStep(repoPath, "skip");
  const bisectReset = useBisectReset(repoPath);

  const [badCommit, setBadCommit] = useState("HEAD");
  const [goodCommit, setGoodCommit] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<BisectAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const currentStep = !bisectStatus || (!bisectStatus.running && !bisectStatus.first_bad)
    ? "start"
    : bisectStatus.running && !bisectStatus.first_bad
      ? "running"
      : "result";

  const currentMessage = bisectStatus?.log?.slice(-1)[0] || "";

  const isPending =
    bisectStart.isPending ||
    bisectGood.isPending ||
    bisectBad.isPending ||
    bisectSkip.isPending ||
    bisectReset.isPending;

  const handleStart = async () => {
    if (!goodCommit.trim()) {
      showToast("Good commit is required", "error");
      return;
    }
    try {
      await bisectStart.mutateAsync({ bad: badCommit, good: goodCommit });
      showToast("Bisect started");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Bisect failed: ${msg}`, "error");
    }
  };

  const handleStep = async (type: "good" | "bad" | "skip") => {
    try {
      const mutation = type === "good" ? bisectGood : type === "bad" ? bisectBad : bisectSkip;
      const result = await mutation.mutateAsync();
      if (result.first_bad) {
        showToast(`First bad commit: ${result.first_bad.slice(0, 7)}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Bisect ${type} failed: ${msg}`, "error");
    }
  };

  const handleReset = async () => {
    try {
      await bisectReset.mutateAsync();
      showToast("Bisect reset");
      setAiAnalysis(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Reset failed: ${msg}`, "error");
    }
  };

  const handleAiAnalyze = async () => {
    if (!repoPath || !bisectStatus?.current_commit) return;
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const diff = await api.bisect.candidateDiff(repoPath);
      const result = await analyzeBisectCandidate(
        bisectStatus.current_commit,
        diff,
        bisectStatus.current_commit,
        repoPath,
      );
      setAiAnalysis(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`AI analysis failed: ${msg}`, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleViewDiff = () => {
    showToast("Diff available in terminal", "info");
  };

  const renderVerdictBadge = (verdict: BisectAnalysis["verdict"]) => {
    const config = {
      likely: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", label: "Likely culprit" },
      unlikely: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Unlikely" },
      "needs-review": { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Needs review" },
    };
    const c = config[verdict];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold rounded ${c.bg} ${c.color} ${c.border} border`}>
        <Icon size={10} />
        {c.label}
      </span>
    );
  };

  const renderConfidenceBadge = (confidence: BisectAnalysis["confidence"]) => {
    const config = {
      high: { color: "text-green-400", bg: "bg-green-500/10" },
      medium: { color: "text-yellow-400", bg: "bg-yellow-500/10" },
      low: { color: "text-red-400", bg: "bg-red-500/10" },
    };
    const c = config[confidence];
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 text-2xs font-semibold rounded ${c.bg} ${c.color}`}>
        {confidence}
      </span>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title="Git Bisect">
      {currentStep === "start" && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-2xs font-medium text-text-muted mb-1">
                Bad commit
              </label>
              <input
                type="text"
                value={badCommit}
                onChange={(e) => setBadCommit(e.target.value)}
                className="w-full h-8 px-3 text-xs bg-surface-1 border border-border-60 rounded-mac outline-none focus:border-accent-60 text-text-primary placeholder:text-text-muted/50"
                placeholder="e.g. HEAD"
              />
            </div>
            <div>
              <label className="block text-2xs font-medium text-text-muted mb-1">
                Good commit
              </label>
              <input
                type="text"
                value={goodCommit}
                onChange={(e) => setGoodCommit(e.target.value)}
                className="w-full h-8 px-3 text-xs bg-surface-1 border border-border-60 rounded-mac outline-none focus:border-accent-60 text-text-primary placeholder:text-text-muted/50"
                placeholder="e.g. abc1234"
              />
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={!goodCommit.trim() || bisectStart.isPending}
            className="w-full h-8 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            {bisectStart.isPending ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Search size={12} />
                Start Bisect
              </>
            )}
          </button>
        </div>
      )}

      {currentStep === "running" && (
        <div className="space-y-4">
          {/* Current commit info */}
          <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <GitCommitHorizontal size={14} className="text-accent shrink-0" />
              <code className="text-xs font-mono text-accent font-semibold">
                {bisectStatus?.current_commit?.slice(0, 7) || "---"}
              </code>
            </div>
            {currentMessage && (
              <p className="text-2xs text-text-muted leading-normal pl-6">
                {currentMessage.length > 120 ? currentMessage.slice(0, 120) + "..." : currentMessage}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-2xs text-text-muted pl-6">
              <span className="font-medium">{bisectStatus?.remaining ?? "?"}</span>
              <span>commits remaining</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleStep("good")}
              disabled={isPending}
              className="h-8 text-xs font-semibold rounded-mac bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
            >
              <Check size={12} />
              Good
            </button>
            <button
              onClick={() => handleStep("bad")}
              disabled={isPending}
              className="h-8 text-xs font-semibold rounded-mac bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
            >
              <X size={12} />
              Bad
            </button>
            <button
              onClick={() => handleStep("skip")}
              disabled={isPending}
              className="h-8 text-xs font-semibold rounded-mac bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
            >
              <SkipForward size={12} />
              Skip
            </button>
            <button
              onClick={handleReset}
              disabled={isPending}
              className="h-8 text-xs font-semibold rounded-mac bg-surface-2 text-text-secondary border border-border-60 hover:bg-surface-3 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          {/* AI Analysis section */}
          <div className="border-t border-border-40 pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAiAnalyze}
                disabled={aiLoading || !bisectStatus?.current_commit}
                className="h-7 px-3 text-2xs font-semibold rounded-mac bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {aiLoading ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Sparkles size={10} />
                )}
                AI Analyze
              </button>
              <button
                onClick={handleViewDiff}
                className="h-7 px-3 text-2xs font-semibold rounded-mac bg-surface-2 text-text-secondary border border-border-60 hover:bg-surface-3 transition-colors flex items-center gap-1.5"
              >
                <FileText size={10} />
                View Diff
              </button>
            </div>

            {aiLoading && (
              <div className="flex items-center gap-2 text-2xs text-text-muted animate-pulse">
                <RefreshCw size={10} className="animate-spin" />
                Analyzing commit...
              </div>
            )}

            {aiAnalysis && (
              <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {renderVerdictBadge(aiAnalysis.verdict)}
                  {renderConfidenceBadge(aiAnalysis.confidence)}
                </div>
                <p className="text-2xs text-text-secondary leading-normal">
                  {aiAnalysis.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === "result" && (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-mac p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle2 size={14} />
              <span className="text-xs font-semibold">Bisect complete!</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-2xs text-text-muted">
                <span>First bad commit:</span>
                <code className="font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs font-semibold">
                  {bisectStatus?.first_bad?.slice(0, 7) || "---"}
                </code>
              </div>
              <div className="flex items-center gap-2 text-2xs text-text-muted">
                <span>Steps taken:</span>
                <span className="font-medium">{bisectStatus?.step ?? "?"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="w-full h-8 bg-surface-2 text-text-secondary border border-border-60 text-xs font-semibold rounded-mac hover:bg-surface-3 transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={12} />
            Reset Bisect
          </button>
        </div>
      )}
    </Dialog>
  );
}
