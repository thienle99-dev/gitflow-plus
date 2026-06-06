import { ChevronDown, FileText } from "lucide-react";
import { AI_REVIEW_CHECKLIST_OPTIONS, DEFAULT_AI_REVIEW_CHECKLIST, type AIReviewMode } from "@/lib/ai";
import { COMMIT_MESSAGE_STYLES, AI_REVIEW_LANGUAGES } from "./AITab";
import type { ConventionFile } from "@/api/tauri";

interface AIPreferencesTabProps {
  aiDetailLevel: "minimal" | "medium" | "detailed";
  setAiDetailLevel: (v: any) => void;
  commitStyle: "conventional" | "plain" | "gitmoji" | "jira";
  setCommitStyle: (v: any) => void;
  customRules: string;
  setCustomRules: (v: string) => void;
  reviewLanguage: string;
  setReviewLanguage: (v: string) => void;
  reviewChecklist: Exclude<AIReviewMode, "all" | "custom">[];
  setReviewChecklist: (v: Exclude<AIReviewMode, "all" | "custom">[]) => void;
  toggleReviewChecklistItem: (id: Exclude<AIReviewMode, "all" | "custom">) => void;
  conventions: ConventionFile[];
  expandedConvention: string | null;
  setExpandedConvention: (v: string | null) => void;
  repoPath: string | null;
}

export function AIPreferencesTab({
  aiDetailLevel,
  setAiDetailLevel,
  commitStyle,
  setCommitStyle,
  customRules,
  setCustomRules,
  reviewLanguage,
  setReviewLanguage,
  reviewChecklist,
  setReviewChecklist,
  toggleReviewChecklistItem,
  conventions,
  expandedConvention,
  setExpandedConvention,
  repoPath,
}: AIPreferencesTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        {/* Commit Message Style */}
        <div id="ai-commit-style" className="space-y-1">
          <label className="text-xs font-semibold text-text-primary">Commit Message Style</label>
          <div className="relative">
            <select
              value={commitStyle}
              onChange={(e) => setCommitStyle(e.target.value as any)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              {COMMIT_MESSAGE_STYLES.map((style) => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Commit Message Detail Level */}
        <div id="ai-detail" className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">Commit Message Detail</label>
          <div className="relative">
            <select
              value={aiDetailLevel}
              onChange={(e) => setAiDetailLevel(e.target.value as any)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              <option value="ultra-minimal">Ultra-Minimal (Subject only)</option>
              <option value="minimal">Minimal (Subject + brief context)</option>
              <option value="medium">Standard (Subject + 3-4 bullet points)</option>
              <option value="detailed">Detailed (Subject + body + 5-8 bullets)</option>
              <option value="comprehensive">Comprehensive (Full format + reasoning)</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* AI Review Language */}
        <div id="ai-language" className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">AI Review Language</label>
          <div className="relative">
            <select
              value={reviewLanguage}
              onChange={(e) => setReviewLanguage(e.target.value)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              {AI_REVIEW_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-2xs text-text-muted">
            Used for AI diff reviews, commit explanations, and merge request reviews.
          </p>
        </div>

        {/* AI Review Checklist */}
        <div id="ai-checklist" className="space-y-2 border-t border-border-40 pt-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-text-primary">Custom Review Checklist</label>
            <button
              type="button"
              onClick={() => setReviewChecklist(DEFAULT_AI_REVIEW_CHECKLIST)}
              className="text-2xs font-medium text-text-muted hover:text-accent transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {AI_REVIEW_CHECKLIST_OPTIONS.map((option) => {
              const checked = reviewChecklist.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleReviewChecklistItem(option.id)}
                  className={`flex items-start gap-2 rounded-mac border px-2.5 py-2 text-left transition-all ${
                    checked
                      ? "border-accent-30 bg-accent-10 text-text-primary"
                      : "border-border-40 bg-surface-1-40 text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  <span className={`mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                    checked ? "border-accent bg-accent text-accent-fg" : "border-border"
                  }`}>
                    {checked && <span className="text-[9px] leading-none">✓</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-2xs font-semibold">{option.label}</span>
                    <span className="block text-3xs text-text-muted leading-normal">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-2xs text-text-muted">
            Used when you choose "Custom checklist" from any AI Review dropdown.
          </p>
        </div>

        {/* Custom Rules */}
        <div id="ai-rules" className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">Custom Guidelines / Prompt Rules</label>
          <textarea
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            placeholder="e.g. Always start with Jira ticket number [PROJ-XXXX] extracted from the branch name, or write in Vietnamese."
            rows={3}
            className="w-full px-2.5 py-1.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary focus:border-accent outline-none resize-y placeholder:text-text-muted-60 hover:bg-surface-2 transition-all"
          />
        </div>

        {/* Convention Files Preview */}
        {repoPath && (
          <div id="ai-conventions" className="space-y-1.5 border-t border-border-40 pt-3">
            <label className="text-xs font-semibold text-text-primary">Detected Convention Files</label>
            <p className="text-2xs text-text-muted">
              Project conventions from <code className="px-1 py-0.5 bg-surface-2 rounded text-text-secondary">CLAUDE.md</code>,{" "}
              <code className="px-1 py-0.5 bg-surface-2 rounded text-text-secondary">.cursorrules</code>,{" "}
              <code className="px-1 py-0.5 bg-surface-2 rounded text-text-secondary">AGENTS.md</code>, etc. are auto-injected into all AI prompts.
            </p>
            {conventions.length === 0 ? (
              <p className="text-2xs text-text-muted italic">No convention files found in this repository.</p>
            ) : (
              <div className="space-y-1 mt-1.5">
                {conventions.map((file) => (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => setExpandedConvention(expandedConvention === file.name ? null : file.name)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-mac bg-surface-1 border border-border hover:bg-surface-2 transition-all text-left"
                  >
                    <FileText size={12} className="text-accent shrink-0" />
                    <span className="text-text-primary font-medium truncate">{file.name}</span>
                    <span className="text-2xs text-text-muted ml-auto">{file.content.length} chars</span>
                    <ChevronDown
                      size={11}
                      className={`text-text-muted shrink-0 transition-transform ${expandedConvention === file.name ? "rotate-180" : ""}`}
                    />
                  </button>
                ))}
                {expandedConvention && conventions.find((f) => f.name === expandedConvention) && (
                  <div className="mt-1 p-2.5 text-2xs text-text-secondary bg-surface-1 border border-border rounded-mac max-h-40 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                    {conventions.find((f) => f.name === expandedConvention)!.content}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
