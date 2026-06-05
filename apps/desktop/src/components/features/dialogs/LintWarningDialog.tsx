import { useState } from "react";
import { X, ShieldAlert, AlertTriangle, ChevronDown, ChevronRight, Sparkles, RefreshCw } from "lucide-react";
import { type CommitLintResult } from "@/lib/commit-lint";
import { type LintDiagnostic } from "@/api/tauri";

interface LintWarningDialogProps {
  open: boolean;
  onClose: () => void;
  commitErrors: CommitLintResult[];
  codeDiagnostics: LintDiagnostic[];
  strictness: "strict" | "warn";
  mode?: "commit" | "review";
  onCommitAnyway: () => void;
  onAutoFixCommit: () => void;
  onAIReview?: () => void;
  aiReviewPending?: boolean;
  aiReviewResult?: string;
}

export default function LintWarningDialog({
  open,
  onClose,
  commitErrors,
  codeDiagnostics,
  strictness,
  mode = "commit",
  onCommitAnyway,
  onAutoFixCommit,
  onAIReview,
  aiReviewPending = false,
  aiReviewResult = "",
}: LintWarningDialogProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  if (!open) return null;

  const totalErrors = commitErrors.filter(e => e.severity === "error").length +
    codeDiagnostics.filter(d => d.severity === "error").length;
  const totalWarnings = commitErrors.filter(e => e.severity === "warning").length +
    codeDiagnostics.filter(d => d.severity === "warning").length;

  const isStrict = strictness === "strict" && totalErrors > 0;

  // Group code diagnostics by file
  const groupedDiagnostics = codeDiagnostics.reduce((acc, diag) => {
    const file = diag.file || "Other";
    if (!acc[file]) {
      acc[file] = [];
    }
    acc[file].push(diag);
    return acc;
  }, {} as Record<string, LintDiagnostic[]>);

  const toggleFile = (file: string) => {
    setExpandedFiles(prev => ({
      ...prev,
      [file]: !prev[file]
    }));
  };

  const hasFixableCommitMessage = commitErrors.some(e => e.autoFixable);
  const isReviewMode = mode === "review";

  return (
    <div className="fixed inset-0 bg-[#000000]/65 backdrop-blur-md z-[9998] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-1-40 shrink-0">
          <div className="flex items-center gap-2">
            {totalErrors > 0 ? (
              <ShieldAlert size={16} className="text-[#ff453a]" />
            ) : (
              <AlertTriangle size={16} className="text-[#ff9f0a]" />
            )}
            <span className="text-sm font-semibold text-text-primary">
              {isReviewMode ? "Pre-Commit Review Results" : "Pre-Commit Quality Gate Blocked"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded-mac transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-5 py-3 border-b border-border bg-surface-1-10 flex items-center justify-between shrink-0">
          <div className="text-2xs text-text-secondary leading-relaxed">
            Found{" "}
            <span className="font-semibold text-[#ff453a]">{totalErrors} errors</span> and{" "}
            <span className="font-semibold text-[#ff9f0a]">{totalWarnings} warnings</span> in staged changes.
            {isReviewMode ? (
              <p className="text-2xs text-text-muted mt-0.5">
                Review only: no commit was created. Fix issues or continue when ready.
              </p>
            ) : isStrict ? (
              <p className="text-2xs text-[#ff453a] mt-0.5 font-medium">
                Strict Gate Active: All errors must be resolved before committing.
              </p>
            ) : (
              <p className="text-2xs text-text-muted mt-0.5">
                Warning Mode: You may bypass issues, but resolving them is highly recommended.
              </p>
            )}
          </div>
        </div>

        {/* Scrollable list of errors */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {onAIReview && (
            <div className="border border-accent-20 bg-accent-5 rounded-mac p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  {aiReviewPending ? (
                    <RefreshCw size={13} className="animate-spin text-accent shrink-0" />
                  ) : (
                    <Sparkles size={13} className="text-accent shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-accent">AI lint review</span>
                </div>
                <button
                  type="button"
                  onClick={onAIReview}
                  disabled={aiReviewPending}
                  className="h-7 px-2.5 rounded-mac border border-accent-25 bg-accent-10 text-2xs font-semibold text-accent hover:bg-accent-15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {aiReviewPending ? "Reviewing..." : aiReviewResult ? "Run Again" : "Ask AI"}
                </button>
              </div>
              {(aiReviewPending || aiReviewResult) && (
                <div className="max-h-44 overflow-y-auto rounded-mac border border-border-20 bg-surface-0-60 px-3 py-2 text-2xs leading-relaxed text-text-secondary whitespace-pre-wrap">
                  {aiReviewPending ? "Reviewing lint issues with AI..." : aiReviewResult}
                </div>
              )}
            </div>
          )}

          {/* Commit Message issues */}
          {commitErrors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-primary">Commit Message Issues</h3>
                {hasFixableCommitMessage && (
                  <button
                    onClick={onAutoFixCommit}
                    className="text-2xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} /> Auto-fix Message
                  </button>
                )}
              </div>
              <div className="border border-border bg-surface-1-20 rounded-mac divide-y divide-border overflow-hidden">
                {commitErrors.map((error, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-2.5">
                    {error.severity === "error" ? (
                      <ShieldAlert size={14} className="text-[#ff453a] mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="text-[#ff9f0a] mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-xs text-text-primary leading-normal font-medium">
                        {error.message}
                      </p>
                      {error.ruleId && (
                        <p className="text-3xs font-mono text-text-muted">
                          Rule: {error.ruleId}
                        </p>
                      )}
                    </div>
                    {error.autoFixable && (
                      <span className="text-3xs font-semibold text-accent bg-accent-10 px-1.5 py-0.5 rounded">
                        Auto-fixable
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code quality issues */}
          {codeDiagnostics.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-text-primary">Staged Code Diagnostics</h3>
              <div className="space-y-2">
                {Object.entries(groupedDiagnostics).map(([file, diagnostics]) => {
                  const isExpanded = expandedFiles[file] !== false; // Default expanded
                  return (
                    <div key={file} className="border border-border bg-surface-1-10 rounded-mac overflow-hidden">
                      <button
                        onClick={() => toggleFile(file)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-surface-2-40 hover:bg-surface-2 border-b border-border text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? <ChevronDown size={14} className="text-text-muted shrink-0" /> : <ChevronRight size={14} className="text-text-muted shrink-0" />}
                          <span className="text-2xs font-mono text-text-primary truncate font-semibold" title={file}>
                            {file}
                          </span>
                        </div>
                        <span className="text-3xs bg-surface-3 text-text-secondary px-1.5 py-0.5 rounded font-medium">
                          {diagnostics.length} issue{diagnostics.length > 1 ? "s" : ""}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-border">
                          {diagnostics.map((diag, idx) => (
                            <div key={idx} className="p-3 flex items-start gap-2.5">
                              {diag.severity === "error" ? (
                                <ShieldAlert size={14} className="text-[#ff453a] mt-0.5 shrink-0" />
                              ) : (
                                <AlertTriangle size={14} className="text-[#ff9f0a] mt-0.5 shrink-0" />
                              )}
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <p className="text-xs text-text-primary leading-normal">
                                  {diag.message}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-3xs text-text-muted">
                                  {diag.line && diag.column && (
                                    <span className="font-mono">
                                      Line {diag.line}, Column {diag.column}
                                    </span>
                                  )}
                                  {diag.rule && (
                                    <span className="font-mono bg-surface-2 px-1 py-0.2 rounded">
                                      {diag.rule}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border bg-surface-1-40 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-8 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors cursor-pointer"
          >
            {isReviewMode ? "Close" : "Go Back & Fix"}
          </button>

          <div className="flex gap-2">
            {!isReviewMode && !isStrict && (
              <button
                type="button"
                onClick={onCommitAnyway}
                className="px-4 h-8 text-xs font-semibold text-[#ff9f0a] hover:text-[#ff9f0a]/80 border border-[#ff9f0a]/30 hover:bg-[#ff9f0a]/10 rounded-mac transition-all cursor-pointer"
              >
                Commit Anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
