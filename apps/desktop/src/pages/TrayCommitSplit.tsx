import { useState } from "react";
import { Sparkles, Loader2, GitCommit, ChevronDown, ChevronRight, X, Check } from "lucide-react";
import { api, type FileChange, type CommitFileGroupInput, type CommitGroupsResult } from "@/api/tauri";
import { analyzeCommitScope, type CommitScopeSuggestion, type CommitGroup } from "@/lib/ai";
import { showToast } from "@/lib/toast";

interface TrayCommitSplitProps {
  repoPath: string;
  staged: FileChange[];
  unstaged: FileChange[];
  onCommitted: () => void;
}

const GROUP_COLORS = [
  "border-l-[#0a84ff]",
  "border-l-[#30d158]",
  "border-l-[#ff9f0a]",
  "border-l-[#bf5af2]",
];

export function TrayCommitSplit({ repoPath, staged, onCommitted }: TrayCommitSplitProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<CommitScopeSuggestion | null>(null);
  const [groups, setGroups] = useState<CommitGroup[]>([]);
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const [committingGroup, setCommittingGroup] = useState<number | null>(null);
  const [committedGroups, setCommittedGroups] = useState<Set<number>>(new Set());

  const handleAnalyze = async () => {
    if (staged.length === 0) return;
    setLoading(true);
    try {
      const result = await analyzeCommitScope(repoPath, staged);
      if (result && result.shouldSplit && result.groups.length > 1) {
        setSuggestion(result);
        setGroups(result.groups);
        const msgs: Record<number, string> = {};
        result.groups.forEach((g, i) => { msgs[i] = g.message; });
        setMessages(msgs);
        setCommittedGroups(new Set());
      } else if (result && !result.shouldSplit) {
        showToast("Changes are cohesive — single commit recommended", "info");
      } else {
        showToast("Could not analyze changes", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to analyze", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCommitGroup = async (groupIdx: number) => {
    if (!repoPath || committingGroup !== null) return;
    const group = groups[groupIdx];
    const message = messages[groupIdx] || group.message;
    if (!message.trim()) return;

    setCommittingGroup(groupIdx);
    try {
      // Stage only this group's files
      await api.commit.stageFiles(repoPath, group.files);
      // Commit
      await api.commit.commit(repoPath, message, false);
      setCommittedGroups((prev) => new Set(prev).add(groupIdx));
      showToast(`Committed group ${groupIdx + 1}`);
      onCommitted();
    } catch (e: any) {
      showToast(e.message || "Failed to commit group", "error");
    } finally {
      setCommittingGroup(null);
    }
  };

  const handleCommitAll = async () => {
    if (!repoPath || committingGroup !== null) return;
    const pendingGroups = groups
      .map((g, i) => ({ ...g, idx: i }))
      .filter((g) => !committedGroups.has(g.idx));
    if (pendingGroups.length === 0) return;

    setCommittingGroup(-1); // -1 = committing all
    try {
      const commitGroups: CommitFileGroupInput[] = pendingGroups.map((g) => ({
        files: g.files,
        message: messages[g.idx] || g.message,
      }));
      const result: CommitGroupsResult = await api.commit.commitGroups(repoPath, commitGroups);
      showToast(`Committed ${result.committed} groups`);
      setCommittedGroups(new Set(groups.map((_, i) => i)));
      onCommitted();
    } catch (e: any) {
      showToast(e.message || "Failed to commit groups", "error");
    } finally {
      setCommittingGroup(null);
    }
  };

  const handleClear = () => {
    setSuggestion(null);
    setGroups([]);
    setMessages({});
    setExpandedGroups({});
    setCommittedGroups(new Set());
  };

  const toggleExpand = (idx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const pendingCount = groups.filter((_, i) => !committedGroups.has(i)).length;
  const allDone = groups.length > 0 && committedGroups.size === groups.length;

  // No suggestion yet — show analyze button
  if (!suggestion || groups.length === 0) {
    return (
      <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
        <button
          onClick={handleAnalyze}
          disabled={staged.length === 0 || loading}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[9px] font-semibold text-accent hover:bg-accent-5 transition-colors disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Sparkles size={10} />
          )}
          {loading ? "Analyzing..." : "AI Suggest Split"}
        </button>
      </div>
    );
  }

  // Show groups
  return (
    <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border-40">
        <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">
          {allDone ? "All committed" : `${pendingCount} groups pending`}
        </span>
        <button onClick={handleClear} className="p-0.5 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors">
          <X size={9} />
        </button>
      </div>

      {/* Groups */}
      <div className="max-h-[160px] overflow-y-auto">
        {groups.map((group, idx) => {
          const isDone = committedGroups.has(idx);
          const isExpanded = expandedGroups[idx];
          const isCommitting = committingGroup === idx;

          return (
            <div
              key={idx}
              className={`border-b border-border-20 last:border-b-0 ${isDone ? "opacity-50" : ""} border-l-2 ${GROUP_COLORS[idx % GROUP_COLORS.length]}`}
            >
              {/* Group header */}
              <div className="flex items-center gap-1 px-2 py-1">
                <button onClick={() => toggleExpand(idx)} className="text-text-muted shrink-0">
                  {isExpanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                </button>
                <span className="text-[8px] font-bold text-text-secondary shrink-0">G{idx + 1}</span>
                <span className="text-[8px] text-text-muted shrink-0">{group.files.length} files</span>
                {isDone ? (
                  <Check size={8} className="text-[#30d158] shrink-0 ml-auto" />
                ) : (
                  <button
                    onClick={() => handleCommitGroup(idx)}
                    disabled={isCommitting || committingGroup !== null}
                    className="ml-auto h-5 px-1.5 text-[7px] font-bold rounded bg-accent text-accent-fg transition-all disabled:opacity-40 flex items-center gap-0.5"
                  >
                    {isCommitting ? <Loader2 size={7} className="animate-spin" /> : <GitCommit size={7} />}
                    Commit
                  </button>
                )}
              </div>

              {/* Message input */}
              {!isDone && (
                <div className="px-2 pb-1">
                  <input
                    type="text"
                    value={messages[idx] || ""}
                    onChange={(e) => setMessages((prev) => ({ ...prev, [idx]: e.target.value }))}
                    className="w-full bg-transparent text-[8px] text-text-primary outline-none placeholder-text-muted font-mono px-1 py-0.5 rounded border border-border-40 focus:border-accent-60 transition-colors"
                    placeholder="commit message..."
                  />
                </div>
              )}

              {/* Expanded file list */}
              {isExpanded && (
                <div className="px-3 pb-1 space-y-0">
                  {group.files.map((f) => (
                    <p key={f} className="text-[7px] text-text-muted font-mono truncate">{f}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Commit All */}
      {!allDone && pendingCount > 1 && (
        <button
          onClick={handleCommitAll}
          disabled={committingGroup !== null}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[8px] font-semibold text-accent hover:bg-accent-5 border-t border-border-40 transition-colors disabled:opacity-40"
        >
          {committingGroup === -1 ? (
            <Loader2 size={8} className="animate-spin" />
          ) : (
            <GitCommit size={8} />
          )}
          Commit All ({pendingCount} groups)
        </button>
      )}
    </div>
  );
}
