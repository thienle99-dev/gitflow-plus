import { useRef } from "react";
import { type CommitGroupProgress, type FileChange } from "@/api/tauri";
import { type CommitScopeSuggestion, type CommitGuardrailResult, type CommitReadinessResult, type FixPlanResult, type CommitCoachResult } from "@/lib/ai";
import { type CommitLintResult, autoFixCommitMessage } from "@/lib/commit-lint";
import UndoButton from "@/components/features/actions/UndoButton";
import CommitTemplatePicker from "./CommitTemplatePicker";
import { showToast } from "@/lib/toast";
import { AlertCircle, ShieldAlert, ClipboardCheck, ListChecks, MessageCircle } from "lucide-react";
import {
  AlignLeft,
  Check,
  Clipboard,
  GitCommit,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

function formatGuardrailText(result: CommitGuardrailResult): string {
  const lines: string[] = [];
  lines.push(`Pre-Commit Guardrail — ${result.verdict.toUpperCase()} (Risk: ${result.riskScore}/100)`);
  lines.push(result.summary);
  if (result.findings.length > 0) {
    lines.push("");
    lines.push("Findings:");
    for (const f of result.findings) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.category}: ${f.message}${f.file ? ` (${f.file})` : ""}`);
      if (f.action) lines.push(`    → ${f.action}`);
    }
  }
  if (result.suggestions.length > 0) {
    lines.push("");
    lines.push("Suggestions:");
    for (const s of result.suggestions) {
      lines.push(`  → ${s}`);
    }
  }
  return lines.join("\n");
}

function formatReadinessText(result: CommitReadinessResult): string {
  const lines: string[] = [];
  lines.push(`Commit Readiness — ${result.verdict.toUpperCase()} (${result.stagedCount} staged, ${result.unstagedCount} unstaged)`);
  lines.push(result.summary);
  if (result.items.length > 0) {
    lines.push("");
    lines.push("Items:");
    for (const item of result.items) {
      lines.push(`  [${item.severity.toUpperCase()}] ${item.category}: ${item.message}${item.file ? ` (${item.file})` : ""}`);
      if (item.action) lines.push(`    → ${item.action}`);
    }
  }
  return lines.join("\n");
}

function CopyButton({ text, label, hoverOnly = true }: { text: string; label?: string; hoverOnly?: boolean }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          showToast("Copied to clipboard", "success");
        } catch {
          showToast("Failed to copy", "error");
        }
      }}
      className={`${hoverOnly ? "opacity-0 group-hover:opacity-100" : ""} shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all cursor-pointer`}
      title={label || "Copy to clipboard"}
    >
      <Clipboard size={11} />
    </button>
  );
}

// ─── Module-scope constants (avoid recreation on every render) ─────────────
const MUTED_BUTTON_CLASS =
  "h-6 px-1.5 rounded-mac border border-transparent text-[10px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer bg-transparent text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-border-40 active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent";
const STATUS_BUTTON_BASE =
  "h-6 px-1.5 rounded-mac border text-[10px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed";

const DEFAULT_QUICK_PICK_TEMPLATES = [
  { label: "feat", prefix: "feat: ", color: "#0a84ff" },
  { label: "fix", prefix: "fix: ", color: "#ff453a" },
  { label: "docs", prefix: "docs: ", color: "#bf5af2" },
  { label: "refactor", prefix: "refactor: ", color: "#30d158" },
  { label: "chore", prefix: "chore: ", color: "#ff9f0a" },
  { label: "test", prefix: "test: ", color: "#64d2ff" },
];

function readQuickCommitTypes() {
  try {
    const raw = localStorage.getItem("gitflowQuickCommitTypes");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((t: any) => t.label && t.prefix && t.color)) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_QUICK_PICK_TEMPLATES;
}

export interface CommitBoxProps {
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  lintResults: CommitLintResult[];
  staged: FileChange[];
  unstaged: FileChange[];
  committing: boolean;
  lintRunning: boolean;
  amend: boolean;
  setAmend: (v: boolean) => void;
  scopeSuggestion: CommitScopeSuggestion | null;
  scopeDismissed: boolean;
  setScopeDismissed: (v: boolean) => void;
  scopeAnalyzing: boolean;
  committingGroupKey: string | null;
  commitGroupProgress: CommitGroupProgress | null;
  skipSuggestedCommitHooks: boolean;
  setSkipSuggestedCommitHooks: (v: boolean) => void;
  // Callbacks
  onCommit: () => void;
  onGenerateCommit: () => void;
  onAnalyzeScope: () => void;
  onAIReview: () => void;
  onGuardrail: () => void;
  onReadiness: () => void;
  onUseGroup: (group: { files: string[]; message: string }) => void;
  onCommitGroup: (group: { files: string[]; message: string }) => void;
  onCommitAllSuggested: () => void;
  onUndoComplete: () => void;
  onImproveMessage: () => void;
  onAddBody: () => void;
  onLintReview: () => void;
  onOpenSplitDialog: () => void;
  // AI review state
  aiReviewPending: boolean;
  // Lint review state
  lintReviewPending: boolean;
  lintReviewResult: string;
  lintReviewOpen: boolean;
  setLintReviewOpen: (open: boolean) => void;
  // Guardrail state
  guardrailPending: boolean;
  guardrailResult: CommitGuardrailResult | null;
  guardrailOpen: boolean;
  setGuardrailOpen: (open: boolean) => void;
  // Readiness state
  readinessPending: boolean;
  readinessResult: CommitReadinessResult | null;
  readinessOpen: boolean;
  setReadinessOpen: (open: boolean) => void;
  // Fix plan
  onGenerateFixPlan: () => void;
  fixPlanPending: boolean;
  fixPlanResult: FixPlanResult | null;
  fixPlanOpen: boolean;
  setFixPlanOpen: (open: boolean) => void;
  // Commit coach
  coachPending: boolean;
  coachResult: CommitCoachResult | null;
  coachOpen: boolean;
  setCoachOpen: (open: boolean) => void;
  // Mutations
  generateCommitPending: boolean;
  commitScopePending: boolean;
  improveMessagePending: boolean;
  addBodyPending: boolean;
}

export default function CommitBox({
  commitMessage,
  setCommitMessage,
  lintResults,
  onOpenSplitDialog,
  staged,
  unstaged,
  committing,
  lintRunning,
  amend,
  setAmend,
  scopeSuggestion,
  scopeDismissed,
  setScopeDismissed,
  scopeAnalyzing,
  committingGroupKey,
  commitGroupProgress,
  skipSuggestedCommitHooks,
  setSkipSuggestedCommitHooks,
  onCommit,
  onGenerateCommit,
  onAnalyzeScope,
  onAIReview,
  onGuardrail,
  onReadiness,
  onUseGroup,
  onCommitGroup,
  onCommitAllSuggested,
  onUndoComplete,
  onImproveMessage,
  onAddBody,
  onLintReview,
  aiReviewPending,
  lintReviewPending,
  lintReviewResult,
  lintReviewOpen,
  setLintReviewOpen,
  guardrailPending,
  guardrailResult,
  guardrailOpen,
  setGuardrailOpen,
  readinessPending,
  readinessResult,
  readinessOpen,
  setReadinessOpen,
  generateCommitPending,
  commitScopePending,
  improveMessagePending,
  addBodyPending,
  onGenerateFixPlan,
  fixPlanPending,
  fixPlanResult,
  fixPlanOpen,
  setFixPlanOpen,
  coachPending,
  coachResult,
  coachOpen,
  setCoachOpen,
}: CommitBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleUseGroup = async (group: { files: string[]; message: string }) => {
    await onUseGroup(group);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleGenerateCommit = async () => {
    await onGenerateCommit();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const hasAnyChanges = staged.length > 0 || unstaged.length > 0;
  const hasCommitMessage = commitMessage.trim().length > 0;

  return (
    <div className="px-3 py-3 border-t border-border-60 bg-surface-1-10 space-y-2.5 shrink-0">
      <div className="commit-box-shell flex flex-col bg-surface-2-30 border border-border-40 rounded-mac p-2.5 transition-all shadow-2xs focus-within:border-accent-40 focus-within:shadow-accent-5">
        {/* Template quick-picks — shown when textarea is empty */}
        {!commitMessage && (
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span className="text-[10px] text-text-muted mr-0.5 select-none">Quick:</span>
            {readQuickCommitTypes().map((tpl: { label: string; prefix: string; color: string }) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setCommitMessage(tpl.prefix);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
                className="h-5 px-1.5 rounded-full border text-[9px] font-semibold transition-all cursor-pointer active:scale-95 hover:opacity-80"
                style={{
                  borderColor: `${tpl.color}30`,
                  backgroundColor: `${tpl.color}10`,
                  color: tpl.color,
                }}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message"
          className="commit-message-textarea w-full min-h-[96px] max-h-[240px] text-xs bg-transparent text-text-primary placeholder:text-text-muted-60 resize-y outline-none border-none p-0 leading-relaxed font-mono focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
          style={{ outline: "none", border: "none", boxShadow: "none" }}
        />

        {/* Character count progress bar */}
        {commitMessage.length > 0 && (() => {
          const subjectLine = commitMessage.split('\n')[0];
          const len = subjectLine.length;
          const ratio = Math.min(len / 72, 1);
          const barColor = len <= 50 ? "#30d158" : len <= 72 ? "#ff9f0a" : "#ff453a";
          return (
            <div className="flex items-center gap-2 mt-1.5 select-none">
              <div className="flex-1 h-1 rounded-full bg-surface-1-60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.max(ratio * 100, 2)}%`,
                    backgroundColor: barColor,
                    opacity: 0.8,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono tabular-nums shrink-0"
                style={{ color: len > 72 ? barColor : undefined }}
              >
                {len}
                <span className="text-text-muted-60">/72</span>
              </span>
            </div>
          );
        })()}

        <div className="border-t border-border-60 pt-2.5 mt-2 select-none shrink-0 space-y-2">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {staged.length >= 3 && (
              <>
                <button
                  type="button"
                  className={`${MUTED_BUTTON_CLASS} border-border-30 bg-surface-1-50 ${scopeAnalyzing || commitScopePending ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  onClick={onAnalyzeScope}
                  disabled={scopeAnalyzing || commitScopePending}
                  title={scopeAnalyzing ? "Analyzing scope..." : "Analyze commit scope (suggest splitting)"}
                >
                  {scopeAnalyzing || commitScopePending ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <Layers size={11} />
                  )}
                  <span>Split Scope</span>
                </button>
                <button
                  type="button"
                  className={`${MUTED_BUTTON_CLASS} border-accent-30 bg-accent-5 text-accent ${commitScopePending ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  onClick={onOpenSplitDialog}
                  disabled={commitScopePending}
                  title="AI-powered commit split dialog"
                >
                  <Sparkles size={11} />
                  <span>AI Split</span>
                </button>
              </>
            )}
            {commitMessage.trim() && staged.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onImproveMessage}
                  disabled={committing || improveMessagePending}
                  className={MUTED_BUTTON_CLASS}
                  title={improveMessagePending ? "Improving..." : "Improve commit message with AI"}
                >
                  {improveMessagePending ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <Wand2 size={11} />
                  )}
                  <span>Improve</span>
                </button>
                <button
                  type="button"
                  onClick={onAddBody}
                  disabled={committing || addBodyPending}
                  className={MUTED_BUTTON_CLASS}
                  title={addBodyPending ? "Adding body..." : "Add detailed commit body with AI"}
                >
                  {addBodyPending ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <AlignLeft size={11} />
                  )}
                  <span>Add Body</span>
                </button>
              </>
            )}
            <button
              type="button"
              className={`h-7 px-3 rounded-mac text-3xs font-bold flex items-center gap-1.5 transition-all bg-accent text-accent-fg hover:opacity-95 active:scale-[0.99] cursor-pointer shadow-sm shadow-accent-15 ${generateCommitPending ? "opacity-50 cursor-not-allowed" : ""
                }`}
              onClick={handleGenerateCommit}
              disabled={generateCommitPending}
              title={generateCommitPending ? "Generating..." : "Generate commit message (AI)"}
            >
              {generateCommitPending ? (
                <RefreshCw size={11} className="animate-spin text-accent-fg" />
              ) : (
                <Sparkles size={11} />
              )}
              <span>Generate with AI</span>
            </button>

            <button
              type="button"
              onClick={onCommit}
              disabled={!hasCommitMessage || !hasAnyChanges || committing || lintRunning || scopeAnalyzing || commitScopePending || (scopeSuggestion != null && !scopeDismissed)}
              className={`h-7 px-3 rounded-mac text-3xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer select-none ${hasCommitMessage && hasAnyChanges && !scopeAnalyzing && !commitScopePending && !(scopeSuggestion != null && !scopeDismissed)
                ? "bg-[#30d158] text-[#07140a] hover:bg-[#30d158]/90 active:scale-[0.99]"
                : "bg-surface-2-40 text-text-muted opacity-35 cursor-not-allowed shadow-none"
                } ${committing || lintRunning || scopeAnalyzing || commitScopePending ? "opacity-60" : ""}`}
              title={
                scopeAnalyzing
                  ? "Analyzing commit scope..."
                  : commitScopePending
                    ? "Processing scope analysis..."
                    : scopeSuggestion != null && !scopeDismissed
                      ? "Review the split suggestion above before committing"
                      : !commitMessage.trim()
                        ? "Enter a commit message"
                        : staged.length === 0 && unstaged.length === 0
                          ? "No changes to commit"
                          : staged.length === 0
                            ? "Commit all changes"
                            : "Commit (⌘↵)"
              }
            >
              {committing || lintRunning || scopeAnalyzing || commitScopePending ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Check size={11} />
              )}
              <span>{committing ? "Committing..." : lintRunning ? "Linting..." : scopeAnalyzing ? "Analyzing..." : commitScopePending ? "Analyzing..." : unstaged.length > 0 ? "Commit All" : "Commit"}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              <div className="flex items-center gap-0.5 rounded-mac border border-border-20 bg-surface-1-35 p-0.5">
                <button
                  type="button"
                  onClick={onAIReview}
                  disabled={committing || aiReviewPending || !hasAnyChanges}
                  className={`${STATUS_BUTTON_BASE} bg-accent-10 border-transparent text-accent hover:bg-accent-15 hover:border-accent-30 disabled:bg-transparent disabled:border-transparent disabled:text-text-muted ${aiReviewPending ? "opacity-70" : ""}`}
                  title="Run AI review with custom checklist"
                >
                  {aiReviewPending ? (
                    <RefreshCw size={10} className="animate-spin text-accent" />
                  ) : (
                    <Sparkles size={10} className="text-accent" />
                  )}
                  <span>AI Review</span>
                </button>

                <button
                  type="button"
                  onClick={onGuardrail}
                  disabled={committing || guardrailPending || !hasAnyChanges}
                  className={`${STATUS_BUTTON_BASE} ${guardrailResult?.verdict === "needs-attention"
                    ? "bg-[#ff453a]/10 border-[#ff453a]/30 text-[#ff453a]"
                    : guardrailResult?.verdict === "warning"
                      ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
                      : guardrailResult?.verdict === "ready"
                        ? "bg-[#30d158]/10 border-[#30d158]/30 text-[#30d158]"
                        : "bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-border-40"
                    } disabled:bg-transparent disabled:border-transparent disabled:text-text-muted ${guardrailPending ? "opacity-70" : ""}`}
                  title="Run AI pre-commit safety check"
                >
                  {guardrailPending ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={10} />
                  )}
                  <span>Guardrail</span>
                </button>

                <button
                  type="button"
                  onClick={onReadiness}
                  disabled={committing || readinessPending || !hasAnyChanges}
                  className={`${STATUS_BUTTON_BASE} ${readinessResult?.verdict === "ready"
                    ? "bg-[#30d158]/10 border-[#30d158]/30 text-[#30d158]"
                    : readinessResult?.verdict === "not-ready"
                      ? "bg-[#ff453a]/10 border-[#ff453a]/30 text-[#ff453a]"
                      : readinessResult?.verdict === "needs-work"
                        ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
                        : "bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-border-40"
                    } disabled:bg-transparent disabled:border-transparent disabled:text-text-muted ${readinessPending ? "opacity-70" : ""}`}
                  title="Check if your staging area is ready to commit"
                >
                  {readinessPending ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <ClipboardCheck size={10} />
                  )}
                  <span>Ready?</span>
                </button>
              </div>

              <div className="flex items-center gap-0.5 rounded-mac border border-border-20 bg-surface-1-35 p-0.5">
                <UndoButton compact onUndoComplete={onUndoComplete} />

                <button
                  type="button"
                  onClick={() => setAmend(!amend)}
                  className={`${STATUS_BUTTON_BASE} ${amend
                    ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
                    : "bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-border-40"
                    }`}
                  title="Amend last commit"
                >
                  <GitCommit size={10} className={amend ? "text-[#ff9f0a]" : "text-text-muted"} />
                  <span>Amend</span>
                </button>
                <CommitTemplatePicker
                  onSelect={(msg) => setCommitMessage(msg)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-2xs px-1 text-text-muted mt-1 select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          {localStorage.getItem("gitflowCommitLintEnabled") !== "false" && lintResults.length > 0 ? (
            <>
              {lintResults[0].severity === "error" ? (
                <ShieldAlert size={11} className="text-[#ff453a] shrink-0" />
              ) : (
                <AlertCircle size={11} className="text-[#ff9f0a] shrink-0" />
              )}
              <span className="text-text-secondary truncate max-w-[280px]" title={lintResults[0].message}>
                {lintResults[0].message}
              </span>
              {lintResults.some(r => r.autoFixable) && (
                <button
                  type="button"
                  onClick={() => setCommitMessage(autoFixCommitMessage(commitMessage, lintResults))}
                  className="text-accent hover:underline font-semibold ml-1 cursor-pointer shrink-0"
                >
                  Auto-fix
                </button>
              )}
              <button
                type="button"
                onClick={onLintReview}
                disabled={lintReviewPending}
                className="text-accent hover:underline font-semibold ml-1 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lintReviewPending ? "Reviewing..." : "Ask AI"}
              </button>
            </>
          ) : localStorage.getItem("gitflowCommitLintEnabled") !== "false" && commitMessage.trim().length > 0 ? (
            <span className="text-[#30d158] flex items-center gap-1">
              <Check size={11} className="text-[#30d158]" /> Message conforms to spec
            </span>
          ) : null}
        </div>
      </div>
      {lintReviewOpen && (
        <div className="border border-accent-20 bg-accent-5 rounded-mac p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {lintReviewPending ? (
                <RefreshCw size={12} className="animate-spin text-accent" />
              ) : (
                <Sparkles size={12} className="text-accent" />
              )}
              <span className="text-xs font-semibold text-accent">AI lint review</span>
            </div>
            <div className="flex items-center gap-0.5">
              {!lintReviewPending && lintReviewResult && (
                <CopyButton text={lintReviewResult} label="Copy lint review" hoverOnly={false} />
              )}
              <button
                type="button"
                onClick={() => setLintReviewOpen(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
                title="Close AI lint review"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto rounded-mac border border-border-20 bg-surface-0-60 px-3 py-2 text-2xs leading-relaxed text-text-secondary whitespace-pre-wrap">
            {lintReviewPending ? "Reviewing lint issues with AI..." : lintReviewResult || "No lint review result yet."}
          </div>
        </div>
      )}
      {scopeSuggestion && !scopeDismissed && (
        <div className="border border-accent-20 bg-accent-5 rounded-mac p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-accent" />
              <span className="text-xs font-semibold text-accent">
                AI suggests splitting into {scopeSuggestion.groups.length} commits
              </span>
            </div>
            <button
              onClick={() => setScopeDismissed(true)}
              className="text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-2xs text-text-secondary leading-relaxed">{scopeSuggestion.explanation}</p>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {scopeSuggestion.groups.map((group, i) => {
              const groupColors = [
                { border: "border-l-[#0a84ff]", bg: "bg-[#0a84ff]/8", badge: "bg-[#0a84ff]/15 text-[#0a84ff]" },
                { border: "border-l-[#30d158]", bg: "bg-[#30d158]/8", badge: "bg-[#30d158]/15 text-[#30d158]" },
                { border: "border-l-[#ff9f0a]", bg: "bg-[#ff9f0a]/8", badge: "bg-[#ff9f0a]/15 text-[#ff9f0a]" },
                { border: "border-l-[#bf5af2]", bg: "bg-[#bf5af2]/8", badge: "bg-[#bf5af2]/15 text-[#bf5af2]" },
              ];
              const color = groupColors[i % groupColors.length];
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-2.5 ${color.bg} rounded-mac border-l-[3px] ${color.border} border border-border-20`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-text-primary leading-snug">
                      {group.message}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {group.files.map((f, fi) => (
                        <span
                          key={fi}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono ${color.badge}`}
                        >
                          {f.split("/").pop()}
                        </span>
                      ))}
                    </div>
                    <p className="text-2xs text-text-secondary italic leading-relaxed">{group.reason}</p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-1 mt-0.5">
                    <button
                      onClick={() => onCommitGroup(group)}
                      disabled={!!committingGroupKey || committing}
                      className="text-2xs font-semibold px-2.5 py-1.5 bg-accent text-accent-fg rounded-mac hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {committingGroupKey === group.message ? "Committing..." : "Commit"}
                    </button>
                    <button
                      onClick={() => handleUseGroup(group)}
                      disabled={!!committingGroupKey || committing}
                      className="text-2xs font-semibold px-2.5 py-1.5 bg-accent-10 text-accent rounded-mac hover:bg-accent-20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Use this
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={onCommitAllSuggested}
              disabled={!!committingGroupKey || committing}
              className="flex-1 text-2xs font-semibold text-accent-fg py-1.5 cursor-pointer bg-accent hover:opacity-90 rounded-mac border border-accent transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {committingGroupKey === "__all__"
                ? commitGroupProgress
                  ? `Committing ${commitGroupProgress.current}/${commitGroupProgress.total}...`
                  : "Starting commits..."
                : "Commit all suggested"}
            </button>
            <label
              className="shrink-0 inline-flex items-center gap-1.5 text-2xs text-text-muted hover:text-text-secondary cursor-pointer select-none"
              title="Skip Git pre-commit hooks for suggested commits (--no-verify)"
            >
              <input
                type="checkbox"
                checked={skipSuggestedCommitHooks}
                onChange={(e) => setSkipSuggestedCommitHooks(e.target.checked)}
                disabled={!!committingGroupKey || committing}
                className="h-3 w-3 accent-accent cursor-pointer disabled:cursor-not-allowed"
              />
              <span>Skip hooks</span>
            </label>
            <button
              onClick={() => setScopeDismissed(true)}
              disabled={!!committingGroupKey || committing}
              className="flex-1 text-2xs text-text-muted hover:text-text-primary py-1.5 cursor-pointer bg-surface-2-30 hover:bg-surface-2 rounded-mac border border-border-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Commit all as one
            </button>
          </div>
        </div>
      )}

      {/* Guardrail Result Panel */}
      {guardrailOpen && (
        <div className={`border rounded-mac p-3 space-y-2 ${
          guardrailResult?.verdict === "needs-attention"
            ? "border-[#ff453a]/30 bg-[#ff453a]/5"
            : guardrailResult?.verdict === "warning"
              ? "border-[#ff9f0a]/30 bg-[#ff9f0a]/5"
              : guardrailResult?.verdict === "ready"
                ? "border-[#30d158]/30 bg-[#30d158]/5"
                : "border-border-40 bg-surface-2-30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className={`${
                guardrailResult?.verdict === "needs-attention" ? "text-[#ff453a]"
                  : guardrailResult?.verdict === "warning" ? "text-[#ff9f0a]"
                    : guardrailResult?.verdict === "ready" ? "text-[#30d158]"
                      : "text-accent"
              }`} />
              <span className="text-xs font-semibold text-text-primary">Pre-Commit Guardrail</span>
              {guardrailResult && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  guardrailResult.verdict === "ready"
                    ? "bg-[#30d158]/15 text-[#30d158]"
                    : guardrailResult.verdict === "warning"
                      ? "bg-[#ff9f0a]/15 text-[#ff9f0a]"
                      : "bg-[#ff453a]/15 text-[#ff453a]"
                }`}>
                  {guardrailResult.verdict === "ready" ? "SAFE" : guardrailResult.verdict === "warning" ? "CAUTION" : "ATTENTION"}
                </span>
              )}
              {guardrailResult && (
                <span className="text-[9px] font-semibold text-text-muted bg-surface-2 border border-border-40 rounded px-1.5 py-0.5">
                  Risk: {guardrailResult.riskScore}/100
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {guardrailResult && (
                <CopyButton text={formatGuardrailText(guardrailResult)} label="Copy guardrail report" hoverOnly={false} />
              )}
              <button
                type="button"
                onClick={() => setGuardrailOpen(false)}
                className="h-5 w-5 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {guardrailPending ? (
            <div className="flex items-center gap-2 rounded-mac border border-border-40 bg-surface-2-30 px-3 py-2.5 text-text-secondary">
              <RefreshCw size={12} className="animate-spin text-accent" />
              <span className="text-2xs">Running pre-commit safety check...</span>
            </div>
          ) : guardrailResult ? (
            <div className="space-y-2">
              <p className="text-2xs text-text-secondary leading-relaxed">{guardrailResult.summary}</p>

              {guardrailResult.findings.length > 0 && (
                <div className="space-y-1">
                  {guardrailResult.findings.map((finding, i) => {
                    const findingText = `[${finding.severity.toUpperCase()}] ${finding.category}: ${finding.message}${finding.file ? ` (${finding.file})` : ""}${finding.action ? `\n  → ${finding.action}` : ""}`;
                    return (
                    <div key={i} className={`group flex items-start gap-2 p-2 rounded-mac text-2xs ${
                      finding.severity === "critical"
                        ? "bg-[#ff453a]/8 border-l-2 border-l-[#ff453a]"
                        : finding.severity === "high"
                          ? "bg-[#ff9f0a]/8 border-l-2 border-l-[#ff9f0a]"
                          : finding.severity === "medium"
                            ? "bg-[#0a84ff]/8 border-l-2 border-l-[#0a84ff]"
                            : "bg-surface-2-30 border-l-2 border-l-border-40"
                    }`}>
                      <span className={`font-bold uppercase shrink-0 ${
                        finding.severity === "critical" ? "text-[#ff453a]"
                          : finding.severity === "high" ? "text-[#ff9f0a]"
                            : finding.severity === "medium" ? "text-[#0a84ff]"
                              : "text-text-muted"
                      }`}>
                        {finding.category}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-text-primary">{finding.message}</span>
                        {finding.file && <span className="text-text-muted ml-1">({finding.file})</span>}
                        {finding.action && <span className="text-text-muted block mt-0.5 italic">{finding.action}</span>}
                      </div>
                      <CopyButton text={findingText} label="Copy finding" />
                    </div>
                    );
                  })}
                </div>
              )}

              {guardrailResult.suggestions.length > 0 && (
                <div className="space-y-0.5">
                  {guardrailResult.suggestions.map((s, i) => (
                    <p key={i} className="text-2xs text-text-muted flex items-start gap-1">
                      <span className="text-accent shrink-0">→</span>
                      <span>{s}</span>
                    </p>
                  ))}
                </div>
              )}

              {guardrailResult && guardrailResult.findings.length > 0 && (
                <button
                  type="button"
                  onClick={onGenerateFixPlan}
                  disabled={fixPlanPending}
                  className="h-6 px-2.5 rounded-mac text-2xs font-semibold inline-flex items-center gap-1.5 bg-accent-10 text-accent hover:bg-accent-15 border border-accent-20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fixPlanPending ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <ListChecks size={10} />
                  )}
                  <span>{fixPlanPending ? "Generating..." : "Generate Fix Plan"}</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Fix Plan Result Panel */}
      {fixPlanOpen && (
        <div className="border border-[#0a84ff]/30 bg-[#0a84ff]/5 rounded-mac p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {fixPlanPending ? (
                <RefreshCw size={12} className="animate-spin text-[#0a84ff]" />
              ) : (
                <ListChecks size={12} className="text-[#0a84ff]" />
              )}
              <span className="text-xs font-semibold text-text-primary">Fix Plan</span>
              {fixPlanResult && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#0a84ff]/15 text-[#0a84ff]">
                  {fixPlanResult.items.length} ITEM{fixPlanResult.items.length !== 1 ? "S" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {fixPlanResult && (
                <CopyButton
                  text={fixPlanResult.items.map((item) => `[${item.riskLevel.toUpperCase()}] ${item.file}: ${item.reason}\n  → ${item.suggestedAction}`).join("\n\n")}
                  label="Copy fix plan"
                  hoverOnly={false}
                />
              )}
              <button
                type="button"
                onClick={() => setFixPlanOpen(false)}
                className="h-5 w-5 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {fixPlanPending ? (
            <div className="flex items-center gap-2 rounded-mac border border-border-40 bg-surface-2-30 px-3 py-2.5 text-text-secondary">
              <RefreshCw size={12} className="animate-spin text-[#0a84ff]" />
              <span className="text-2xs">Generating fix plan from guardrail findings...</span>
            </div>
          ) : fixPlanResult ? (
            <div className="space-y-2">
              <p className="text-2xs text-text-secondary leading-relaxed">{fixPlanResult.summary}</p>

              {fixPlanResult.items.length > 0 && (
                <div className="space-y-1">
                  {fixPlanResult.items.map((item, i) => (
                    <div key={i} className={`p-2 rounded-mac text-2xs border-l-2 ${
                      item.riskLevel === "safe"
                        ? "bg-[#30d158]/8 border-l-[#30d158]"
                        : item.riskLevel === "low"
                          ? "bg-[#0a84ff]/8 border-l-[#0a84ff]"
                          : item.riskLevel === "medium"
                            ? "bg-[#ff9f0a]/8 border-l-[#ff9f0a]"
                            : "bg-[#ff453a]/8 border-l-[#ff453a]"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-bold uppercase text-[9px] px-1 py-0.5 rounded ${
                          item.riskLevel === "safe"
                            ? "bg-[#30d158]/15 text-[#30d158]"
                            : item.riskLevel === "low"
                              ? "bg-[#0a84ff]/15 text-[#0a84ff]"
                              : item.riskLevel === "medium"
                                ? "bg-[#ff9f0a]/15 text-[#ff9f0a]"
                                : "bg-[#ff453a]/15 text-[#ff453a]"
                        }`}>
                          {item.riskLevel}
                        </span>
                        <span className="text-text-muted font-mono">{item.file}</span>
                      </div>
                      <p className="text-text-primary">{item.reason}</p>
                      {item.suggestedAction && (
                        <p className="text-text-muted italic mt-0.5">→ {item.suggestedAction}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {fixPlanResult.items.length === 0 && (
                <p className="text-2xs text-text-muted">No actionable fixes generated. All findings are informational.</p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Readiness Check Result Panel */}
      {readinessOpen && (
        <div className={`border rounded-mac p-3 space-y-2 ${
          readinessResult?.verdict === "ready"
            ? "border-[#30d158]/30 bg-[#30d158]/5"
            : readinessResult?.verdict === "not-ready"
              ? "border-[#ff453a]/30 bg-[#ff453a]/5"
              : readinessResult?.verdict === "needs-work"
                ? "border-[#ff9f0a]/30 bg-[#ff9f0a]/5"
                : "border-border-40 bg-surface-2-30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck size={12} className={`${
                readinessResult?.verdict === "ready" ? "text-[#30d158]"
                  : readinessResult?.verdict === "not-ready" ? "text-[#ff453a]"
                    : readinessResult?.verdict === "needs-work" ? "text-[#ff9f0a]"
                      : "text-accent"
              }`} />
              <span className="text-xs font-semibold text-text-primary">Commit Readiness</span>
              {readinessResult && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  readinessResult.verdict === "ready"
                    ? "bg-[#30d158]/15 text-[#30d158]"
                    : readinessResult.verdict === "needs-work"
                      ? "bg-[#ff9f0a]/15 text-[#ff9f0a]"
                      : "bg-[#ff453a]/15 text-[#ff453a]"
                }`}>
                  {readinessResult.verdict === "ready" ? "READY" : readinessResult.verdict === "needs-work" ? "NEEDS WORK" : "NOT READY"}
                </span>
              )}
              {readinessResult && (
                <span className="text-[9px] font-semibold text-text-muted bg-surface-2 border border-border-40 rounded px-1.5 py-0.5">
                  {readinessResult.stagedCount} staged, {readinessResult.unstagedCount} unstaged
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {readinessResult && (
                <CopyButton text={formatReadinessText(readinessResult)} label="Copy readiness report" hoverOnly={false} />
              )}
              <button
                type="button"
                onClick={() => setReadinessOpen(false)}
                className="h-5 w-5 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {readinessPending ? (
            <div className="flex items-center gap-2 rounded-mac border border-border-40 bg-surface-2-30 px-3 py-2.5 text-text-secondary">
              <RefreshCw size={12} className="animate-spin text-accent" />
              <span className="text-2xs">Checking commit readiness...</span>
            </div>
          ) : readinessResult ? (
            <div className="space-y-2">
              <p className="text-2xs text-text-secondary leading-relaxed">{readinessResult.summary}</p>

              {readinessResult.items.length > 0 && (
                <div className="space-y-1">
                  {readinessResult.items.map((item, i) => {
                    const itemText = `[${item.severity.toUpperCase()}] ${item.category}: ${item.message}${item.file ? ` (${item.file})` : ""}${item.action ? `\n  → ${item.action}` : ""}`;
                    return (
                    <div key={i} className={`group flex items-start gap-2 p-2 rounded-mac text-2xs ${
                      item.severity === "blocker"
                        ? "bg-[#ff453a]/8 border-l-2 border-l-[#ff453a]"
                        : item.severity === "warning"
                          ? "bg-[#ff9f0a]/8 border-l-2 border-l-[#ff9f0a]"
                          : item.severity === "suggestion"
                            ? "bg-[#0a84ff]/8 border-l-2 border-l-[#0a84ff]"
                            : "bg-surface-2-30 border-l-2 border-l-border-40"
                    }`}>
                      <span className={`font-bold uppercase shrink-0 ${
                        item.severity === "blocker" ? "text-[#ff453a]"
                          : item.severity === "warning" ? "text-[#ff9f0a]"
                            : item.severity === "suggestion" ? "text-[#0a84ff]"
                              : "text-text-muted"
                      }`}>
                        {item.category}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-text-primary">{item.message}</span>
                        {item.file && <span className="text-text-muted ml-1">({item.file})</span>}
                        {item.action && <span className="text-text-muted block mt-0.5 italic">{item.action}</span>}
                      </div>
                      <CopyButton text={itemText} label="Copy item" />
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Commit Coach Panel */}
      {coachOpen && (
        <div className={`border rounded-mac p-3 space-y-2 ${
          coachResult?.verdict === "good"
            ? "border-[#30d158]/30 bg-[#30d158]/5"
            : coachResult?.verdict === "needs-work"
              ? "border-[#ff453a]/30 bg-[#ff453a]/5"
              : coachResult?.verdict === "needs-attention"
                ? "border-[#ff9f0a]/30 bg-[#ff9f0a]/5"
                : "border-border-40 bg-surface-2-30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageCircle size={12} className={`${
                coachResult?.verdict === "good" ? "text-[#30d158]"
                  : coachResult?.verdict === "needs-work" ? "text-[#ff453a]"
                    : coachResult?.verdict === "needs-attention" ? "text-[#ff9f0a]"
                      : "text-accent"
              }`} />
              <span className="text-xs font-semibold text-text-primary">Commit Coach</span>
              {coachResult && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  coachResult.verdict === "good"
                    ? "bg-[#30d158]/15 text-[#30d158]"
                    : coachResult.verdict === "needs-work"
                      ? "bg-[#ff453a]/15 text-[#ff453a]"
                      : "bg-[#ff9f0a]/15 text-[#ff9f0a]"
                }`}>
                  {coachResult.verdict === "good" ? "GOOD" : coachResult.verdict === "needs-work" ? "NEEDS WORK" : "NEEDS ATTENTION"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {coachResult && (
                <CopyButton text={`${coachResult.summary}\n\n${coachResult.tips.map(t => `[${t.severity.toUpperCase()}] ${t.category}: ${t.message}`).join("\n")}`} label="Copy coach tips" hoverOnly={false} />
              )}
              <button
                type="button"
                onClick={() => setCoachOpen(false)}
                className="h-5 w-5 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {coachPending ? (
            <div className="flex items-center gap-2 rounded-mac border border-border-40 bg-surface-2-30 px-3 py-2.5 text-text-secondary">
              <RefreshCw size={12} className="animate-spin text-accent" />
              <span className="text-2xs">Analyzing your commit...</span>
            </div>
          ) : coachResult ? (
            <div className="space-y-2">
              <p className="text-2xs text-text-secondary leading-relaxed">{coachResult.summary}</p>

              {coachResult.tips.length > 0 && (
                <div className="space-y-1">
                  {coachResult.tips.map((tip, i) => {
                    const severityColors: Record<string, string> = {
                      action: "bg-[#ff453a]/8 border-l-2 border-l-[#ff453a] text-[#ff453a]",
                      warning: "bg-[#ff9f0a]/8 border-l-2 border-l-[#ff9f0a] text-[#ff9f0a]",
                      suggestion: "bg-[#0a84ff]/8 border-l-2 border-l-[#0a84ff] text-[#0a84ff]",
                      info: "bg-surface-2-30 border-l-2 border-l-border-40 text-text-muted",
                    };
                    const categoryLabels: Record<string, string> = {
                      size: "SIZE",
                      split: "SPLIT",
                      message: "MSG",
                      missed: "MISSED",
                      quality: "QUALITY",
                    };
                    return (
                    <div key={i} className={`group flex items-start gap-2 p-2 rounded-mac text-2xs ${severityColors[tip.severity] || severityColors.info}`}>
                      <span className="font-bold uppercase shrink-0">
                        {categoryLabels[tip.category] || tip.category}
                      </span>
                      <span className="min-w-0 flex-1 text-text-primary">{tip.message}</span>
                    </div>
                    );
                  })}
                </div>
              )}

              {coachResult.tips.length === 0 && (
                <p className="text-2xs text-text-muted">No coaching tips — your commit looks good!</p>
              )}
            </div>
          ) : null}
        </div>
      )}

    </div>
  );
}
