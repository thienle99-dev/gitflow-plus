import { Sparkles, Loader2, Check, X } from "lucide-react";
import type { FileChange } from "@/api/tauri";
import type { CommitLintResult } from "@/lib/commit-lint";

export interface TrayCommitBoxProps {
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  lintResults?: CommitLintResult[];
  committing: boolean;
  lintRunning: boolean;
  staged: FileChange[];
  unstaged: FileChange[];
  onCommit: () => void;
  onGenerateCommit: () => void;
  generateCommitPending: boolean;
  onCollapse?: () => void;
}

export function TrayCommitBox({
  commitMessage,
  setCommitMessage,
  committing,
  lintRunning,
  onCommit,
  onGenerateCommit,
  generateCommitPending,
  staged,
  onCollapse,
}: TrayCommitBoxProps) {
  return (
    <div className="border border-border-40 focus-within:border-accent-60 bg-surface-2 rounded-lg p-2.5 flex flex-col gap-2 shrink-0 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Commit Message</span>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>
      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="Write a commit message..."
        rows={3}
        className="min-h-[64px] max-h-[140px] w-full bg-transparent border-none text-[11px] text-text-primary placeholder-text-muted resize-y leading-relaxed font-mono p-0.5"
        style={{ outline: "none", border: "none", boxShadow: "none" }}
      />

      <div className="flex items-center justify-between gap-2 border-t border-border-40 pt-1.5">
        <button
          onClick={onGenerateCommit}
          disabled={staged.length === 0 || generateCommitPending}
          className={`h-7 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 text-[10px] font-semibold ${
            generateCommitPending
              ? "bg-accent-10 border-accent-30 text-accent"
              : "border-accent-30 bg-accent-5 text-accent hover:bg-accent-10 disabled:opacity-40"
          }`}
        >
          {generateCommitPending ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Sparkles size={10} />
          )}
          AI Generate
        </button>

        <button
          onClick={onCommit}
          disabled={committing || lintRunning || !commitMessage.trim()}
          className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm ${
            committing || lintRunning
              ? "bg-accent-20 text-accent"
              : "bg-accent text-accent-fg hover:opacity-95 disabled:opacity-40"
          }`}
        >
          {committing || lintRunning ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Check size={10} />
          )}
          <span>{committing ? "Committing..." : lintRunning ? "Linting..." : "Commit"}</span>
        </button>
      </div>
    </div>
  );
}
