import { useRef } from "react";
import { type FileChange } from "@/api/tauri";
import { type CommitScopeSuggestion } from "@/lib/ai";
import { type CommitLintResult, autoFixCommitMessage } from "@/lib/commit-lint";
import UndoButton from "@/components/features/actions/UndoButton";
import CommitTemplatePicker from "./CommitTemplatePicker";
import { AlertCircle, ShieldAlert } from "lucide-react";
import {
  AlignLeft,
  Check,
  GitCommit,
  Layers,
  RefreshCw,
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
  onUseGroup: (group: { files: string[]; message: string }) => void;
  onCommitGroup: (group: { files: string[]; message: string }) => void;
  onCommitAllSuggested: () => void;
  onUndoComplete: () => void;
  onImproveMessage: () => void;
  onAddBody: () => void;
  // AI review state
  aiReviewPending: boolean;
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
  onUseGroup,
  onCommitGroup,
  onCommitAllSuggested,
  onUndoComplete,
  onImproveMessage,
  onAddBody,
  aiReviewPending,
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onAIReview}
              disabled={committing || aiReviewPending || (staged.length === 0 && unstaged.length === 0)}
              className={`h-7 px-2.5 rounded-[5px] border text-3xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs bg-accent-10 border-accent-30 text-accent hover:bg-accent-20 hover:border-accent-40 active:scale-[0.99] disabled:bg-surface-2-40 disabled:border-border-40 disabled:text-text-muted disabled:opacity-45 disabled:cursor-not-allowed ${aiReviewPending ? "opacity-70" : ""}`}
              title="Run AI review with custom checklist"
            >
              {aiReviewPending ? (
                <RefreshCw size={11} className="animate-spin text-accent" />
              ) : (
                <Sparkles size={11} className="text-accent" />
              )}
              <span>AI Review</span>
            </button>

            <UndoButton compact onUndoComplete={onUndoComplete} />

            <button
              type="button"
              onClick={() => setAmend(!amend)}
              className={`h-7 px-2.5 rounded-[5px] border text-3xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${amend
                ? "bg-[#ff9f0a]/10 border-[#ff9f0a]/30 text-[#ff9f0a]"
                : "bg-surface-2-40 border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-3"
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

          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {staged.length >= 3 && (
              <button
                type="button"
                className={`h-7 px-2.5 rounded border text-3xs font-semibold flex items-center gap-1 transition-all bg-surface-2 border-border-40 text-text-secondary hover:text-text-primary hover:bg-surface-3 active:scale-95 cursor-pointer ${scopeAnalyzing || commitScopePending ? "opacity-50 cursor-not-allowed" : ""
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
                  className="h-7 px-2.5 rounded-[5px] border text-3xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs bg-surface-2-40 border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-3 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed"
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
                  className="h-7 px-2.5 rounded-[5px] border text-3xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs bg-surface-2-40 border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-3 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed"
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
              className={`h-7 px-2.5 rounded text-3xs font-semibold flex items-center gap-1 transition-all bg-accent text-accent-fg hover:opacity-95 active:scale-[0.99] active:scale-95 cursor-pointer shadow-sm ${generateCommitPending ? "opacity-50 cursor-not-allowed" : ""
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
              disabled={!commitMessage.trim() || (staged.length === 0 && unstaged.length === 0) || committing || lintRunning}
              className={`h-7 px-3 rounded-[5px] text-3xs font-semibold inline-flex items-center gap-1 transition-all shadow-sm cursor-pointer select-none ${commitMessage.trim() && (staged.length > 0 || unstaged.length > 0)
                ? "bg-[#30d158] text-[#07140a] hover:bg-[#30d158]/90 active:scale-[0.99]"
                : "bg-surface-3 text-text-muted opacity-40 cursor-not-allowed"
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

    </div>
  );
}
