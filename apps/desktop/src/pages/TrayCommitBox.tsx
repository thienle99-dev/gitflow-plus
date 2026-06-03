import { Sparkles, Loader2, Check } from "lucide-react";
import type { FileChange } from "@/api/tauri";
import type { CommitLintResult } from "@/lib/commit-lint";

export interface TrayCommitBoxProps {
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  lintResults: CommitLintResult[];
  committing: boolean;
  lintRunning: boolean;
  staged: FileChange[];
  unstaged: FileChange[];
  onCommit: () => void;
  onGenerateCommit: () => void;
  generateCommitPending: boolean;
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
}: TrayCommitBoxProps) {
  return (
    <div className="border border-border-40 focus-within:border-accent-60 bg-surface-2 rounded-mac p-2.5 flex flex-col gap-2.5 shrink-0 transition-colors">
      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="Commit message (or generate with AI...)"
        rows={4}
        className="min-h-[92px] max-h-[180px] w-full bg-transparent border-none text-[10px] text-text-primary placeholder-text-muted resize-y leading-relaxed font-mono p-0.5"
        style={{ outline: "none", border: "none", boxShadow: "none" }}
      />

      <div className="flex items-center justify-between gap-2 border-t border-border-40 pt-1.5">
        <button
          onClick={onGenerateCommit}
          disabled={staged.length === 0 || generateCommitPending}
          className="h-6 w-6 rounded border border-transparent text-accent transition-all hover:border-border-40 hover:bg-surface-3 disabled:opacity-40 flex items-center justify-center cursor-pointer"
          title="Generate message using all changes"
        >
          {generateCommitPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
        </button>

        <button
          onClick={onCommit}
          disabled={committing || lintRunning || !commitMessage.trim()}
          className="h-7 px-2.5 bg-accent text-accent-fg text-[9px] font-bold rounded hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          title="Commit changes"
        >
          {committing || lintRunning ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          <span>{committing ? "Committing..." : lintRunning ? "Linting..." : "Commit"}</span>
        </button>
      </div>
    </div>
  );
}
