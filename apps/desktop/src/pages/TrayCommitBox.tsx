import { Sparkles, Loader2, Check } from "lucide-react";
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
}

export function TrayCommitBox({
  commitMessage, setCommitMessage, committing, lintRunning,
  onCommit, onGenerateCommit, generateCommitPending, staged,
}: TrayCommitBoxProps) {
  return (
    <div className="border border-border-40 focus-within:border-accent-60 bg-surface-2 rounded-md p-2 flex flex-col gap-1.5 shrink-0 transition-colors">
      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="Commit message..."
        rows={2}
        className="min-h-[40px] max-h-[120px] w-full bg-transparent border-none text-[10px] text-text-primary placeholder-text-muted resize-y leading-relaxed font-mono"
        style={{ outline: "none", border: "none", boxShadow: "none" }}
      />

      <div className="flex items-center justify-between gap-1.5 border-t border-border-40 pt-1">
        <button
          onClick={onGenerateCommit}
          disabled={staged.length === 0 || generateCommitPending}
          className={`h-6 px-1.5 rounded border transition-all flex items-center justify-center gap-0.5 text-[9px] font-semibold ${
            generateCommitPending
              ? "bg-accent-10 border-accent-30 text-accent"
              : "border-accent-30 bg-accent-5 text-accent hover:bg-accent-10 disabled:opacity-40"
          }`}
        >
          {generateCommitPending ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
          AI
        </button>

        <button
          onClick={onCommit}
          disabled={committing || lintRunning || !commitMessage.trim()}
          className={`h-6 px-2.5 text-[9px] font-bold rounded transition-all flex items-center justify-center gap-0.5 shadow-sm ${
            committing || lintRunning
              ? "bg-accent-20 text-accent"
              : "bg-accent text-accent-fg hover:opacity-95 disabled:opacity-40"
          }`}
        >
          {committing || lintRunning ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
          {committing ? "..." : lintRunning ? "Lint..." : "Commit"}
        </button>
      </div>
    </div>
  );
}
