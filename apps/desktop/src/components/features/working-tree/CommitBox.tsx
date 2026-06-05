import { useRef } from "react";
import { type FileChange } from "@/api/tauri";
import { type CommitScopeSuggestion, type CommitGuardrailResult, type CommitReadinessResult } from "@/lib/ai";
import { type CommitLintResult, autoFixCommitMessage } from "@/lib/commit-lint";
import UndoButton from "@/components/features/actions/UndoButton";
import CommitTemplatePicker from "./CommitTemplatePicker";
import { AlertCircle, ShieldAlert, ClipboardCheck } from "lucide-react";
import {
  AlignLeft,
  Check,
  GitCommit,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

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
  // AI review state
  aiReviewPending: boolean;
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
  aiReviewPending,
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
  const mutedButtonClass =
    "h-7 px-2 rounded-mac border border-transparent text-3xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer bg-transparent text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-border-40 active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent";
  const statusButtonBase =
    "h-7 px-2 rounded-mac border text-3xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed";

  return (
    <div className="px-3 py-3 border-t border-border-60 bg-surface-1-10 space-y-2.5 shrink-0">
      <div className="flex flex-col bg-surface-2-30 border border-border-40 rounded-mac p-2.5 focus-within:border-accent-60 focus-within:ring-1 focus-within:ring-accent-15 transition-all shadow-2xs">
        <textarea
          ref={textareaRef}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message"
          className="w-full min-h-[96px] max-h-[240px] text-xs bg-transparent text-text-primary placeholder:text-text-muted-60 resize-y outline-none border-none p-0 leading-relaxed font-mono focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
          style={{ outline: "none", border: "none", boxShadow: "none" }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border-60 pt-2.5 mt-2 select-none shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <div className="flex items-center gap-0.5 rounded-mac border border-border-30 bg-surface-1-50 p-0.5">
            <button
              type="button"
              onClick={onAIReview}
              disabled={committing || aiReviewPending || !hasAnyChanges}
              className={`${statusButtonBase} bg-accent-10 border-accent-25 text-accent hover:bg-accent-15 hover:border-accent-40 disabled:bg-transparent disabled:border-transparent disabled:text-text-muted ${aiReviewPending ? "opacity-70" : ""}`}
              title="Run AI review with custom checklist"
            >
              {aiReviewPending ? (
                <RefreshCw size={11} className="animate-spin text-accent" />
              ) : (
                <Sparkles size={11} className="text-accent" />
              )}
              <span>AI Review</span>
            </button>

            <button
              type="button"
              onClick={onGuardrail}
              disabled={committing || guardrailPending || !hasAnyChanges}
              className={`${statusButtonBase} ${guardrailResult?.verdict === "needs-attention"
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
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <ShieldCheck size={11} />
              )}
              <span>Guardrail</span>
            </button>

            <button
              type="button"
              onClick={onReadiness}
              disabled={committing || readinessPending || !hasAnyChanges}
              className={`${statusButtonBase} ${readinessResult?.verdict === "ready"
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
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <ClipboardCheck size={11} />
              )}
              <span>Ready?</span>
            </button>
            </div>

            <div className="flex items-center gap-0.5 rounded-mac border border-border-30 bg-surface-1-50 p-0.5">
            <UndoButton compact onUndoComplete={onUndoComplete} />

            <button
              type="button"
              onClick={() => setAmend(!amend)}
              className={`${statusButtonBase} ${amend
                ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
                : "bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-border-40"
                }`}
              title="Amend last commit"
            >
              <GitCommit size={11} className={amend ? "text-[#ff9f0a]" : "text-text-muted"} />
              <span>Amend</span>
            </button>
            <CommitTemplatePicker
              onSelect={(msg) => setCommitMessage(msg)}
            />
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 flex-wrap ml-auto">
            {staged.length >= 3 && (
              <button
                type="button"
                className={`${mutedButtonClass} border-border-30 bg-surface-1-50 ${scopeAnalyzing || commitScopePending ? "opacity-50 cursor-not-allowed" : ""
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
            )}
            {commitMessage.trim() && staged.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onImproveMessage}
                  disabled={committing || improveMessagePending}
                  className={mutedButtonClass}
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
                  className={mutedButtonClass}
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
              disabled={!hasCommitMessage || !hasAnyChanges || committing || lintRunning}
              className={`h-7 px-3 rounded-mac text-3xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer select-none ${hasCommitMessage && hasAnyChanges
                ? "bg-[#30d158] text-[#07140a] hover:bg-[#30d158]/90 active:scale-[0.99]"
                : "bg-surface-2-40 text-text-muted opacity-35 cursor-not-allowed shadow-none"
                } ${committing || lintRunning ? "opacity-60" : ""}`}
              title={
                !commitMessage.trim()
                  ? "Enter a commit message"
                  : staged.length === 0 && unstaged.length === 0
                    ? "No changes to commit"
                    : staged.length === 0
                      ? "Commit all changes"
                      : "Commit (⌘↵)"
              }
            >
              {lintRunning ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Check size={11} />
              )}
              <span>{committing ? "Committing..." : lintRunning ? "Linting..." : unstaged.length > 0 ? "Commit All" : "Commit"}</span>
            </button>
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
            </>
          ) : localStorage.getItem("gitflowCommitLintEnabled") !== "false" && commitMessage.trim().length > 0 ? (
            <span className="text-[#30d158] flex items-center gap-1">
              <Check size={11} className="text-[#30d158]" /> Message conforms to spec
            </span>
          ) : null}
        </div>

        <div className="text-2xs text-text-muted shrink-0 ml-2">
          <span className={commitMessage.split('\n')[0].length > 72 ? "text-[#ff453a] font-semibold" : ""}>
            {commitMessage.split('\n')[0].length}
          </span>
          /72
        </div>
      </div>
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
              {committingGroupKey === "__all__" ? "Committing suggestions..." : "Commit all suggested"}
            </button>
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
            <button
              type="button"
              onClick={() => setGuardrailOpen(false)}
              className="h-5 w-5 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
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
                  {guardrailResult.findings.map((finding, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-mac text-2xs ${
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
                      <div className="min-w-0">
                        <span className="text-text-primary">{finding.message}</span>
                        {finding.file && <span className="text-text-muted ml-1">({finding.file})</span>}
                        {finding.action && <span className="text-text-muted block mt-0.5 italic">{finding.action}</span>}
                      </div>
                    </div>
                  ))}
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
            <button
              type="button"
              onClick={() => setReadinessOpen(false)}
              className="h-5 w-5 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
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
                  {readinessResult.items.map((item, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-mac text-2xs ${
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
                      <div className="min-w-0">
                        <span className="text-text-primary">{item.message}</span>
                        {item.file && <span className="text-text-muted ml-1">({item.file})</span>}
                        {item.action && <span className="text-text-muted block mt-0.5 italic">{item.action}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

    </div>
  );
}
