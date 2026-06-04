import { useCallback, useEffect, useState } from "react";
import {
  X,
  Activity,
  Copy,
  Check,
  GitBranch,
  GitCommit,
  Tag,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
} from "lucide-react";
import { useRepoStore } from "@/stores/repo";
import { useDiagnostics } from "@/queries/useHealth";
import { api, type AppLogEntry, type DiagnosticBundle } from "@/api/tauri";

interface DiagnosticDialogProps {
  onClose: () => void;
}

function InfoRow({ label, value, mono }: { label: string; value: string | number | boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-xs font-medium ${mono ? "font-mono" : ""} ${
        typeof value === "boolean" ? (value ? "text-green-400" : "text-text-muted") : "text-text-primary"
      }`}>
        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </span>
    </div>
  );
}

function formatDiagnosticsForCopy(d: DiagnosticBundle): string {
  return [
    `App Version: ${d.app_version}`,
    `Git Version: ${d.git_version}`,
    `OS: ${d.os_info}`,
    `Repository: ${d.repo_path}`,
    `Branch: ${d.current_branch}`,
    `Remote: ${d.remote_url ?? "none"}`,
    `HEAD: ${d.head_commit}`,
    `Branches: ${d.branch_count}`,
    `Tags: ${d.tag_count}`,
    `Total Commits: ${d.total_commits}`,
    `Staged Files: ${d.staged_files}`,
    `Unstaged Files: ${d.unstaged_files}`,
    `Untracked Files: ${d.untracked_files}`,
    `LFS Enabled: ${d.lfs_enabled}`,
    `Conflict State: ${d.conflict_state}`,
    `Rebase in Progress: ${d.rebase_in_progress}`,
    `Merge in Progress: ${d.merge_in_progress}`,
    ...(d.recent_errors.length > 0
      ? ["", "Recent Errors:", ...d.recent_errors.map((e) => `  - ${e}`)]
      : []),
  ].join("\n");
}

export default function DiagnosticDialog({ onClose }: DiagnosticDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: diag, isLoading, error } = useDiagnostics(repoPath);
  const [activeTab, setActiveTab] = useState<"bundle" | "logs">("bundle");
  const [copied, setCopied] = useState(false);
  const [logCopied, setLogCopied] = useState(false);
  const [logEntries, setLogEntries] = useState<AppLogEntry[]>([]);
  const [logPath, setLogPath] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logLevel, setLogLevel] = useState("ALL");
  const [logQuery, setLogQuery] = useState("");

  const handleCopy = async () => {
    if (!diag) return;
    await navigator.clipboard.writeText(formatDiagnosticsForCopy(diag));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshLogs = useCallback(async () => {
    setLogLoading(true);
    setLogError(null);
    try {
      const [path, entries] = await Promise.all([
        api.logs.path(),
        api.logs.list(300, logLevel, logQuery),
      ]);
      setLogPath(path);
      setLogEntries(entries);
    } catch (e: any) {
      setLogError(e.message || String(e));
    } finally {
      setLogLoading(false);
    }
  }, [logLevel, logQuery]);

  useEffect(() => {
    if (activeTab === "logs") {
      refreshLogs();
    }
  }, [activeTab, refreshLogs]);

  const handleCopyLogs = async () => {
    const text = await api.logs.exportText();
    await navigator.clipboard.writeText(text || "No app logs recorded yet.");
    setLogCopied(true);
    setTimeout(() => setLogCopied(false), 2000);
  };

  const handleClearLogs = async () => {
    await api.logs.clear();
    await refreshLogs();
  };

  const levelBadgeClass = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return "bg-[#ff375f]/10 text-[#ff375f] border-[#ff375f]/25";
      case "WARN":
        return "bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/25";
      case "DEBUG":
        return "bg-[#bf5af2]/10 text-[#bf5af2] border-[#bf5af2]/25";
      case "TRACE":
        return "bg-text-muted-10 text-text-muted border-border-40";
      default:
        return "bg-accent-10 text-accent border-accent-20";
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-40 bg-surface-1-40 shrink-0">
        <div className="flex items-center gap-3">
          <Activity size={16} className="text-accent" />
          <span className="text-sm font-bold">Diagnostics</span>
          <div className="segmented-control">
            <button
              className={activeTab === "bundle" ? "active" : ""}
              onClick={() => setActiveTab("bundle")}
            >
              Bundle
            </button>
            <button
              className={activeTab === "logs" ? "active" : ""}
              onClick={() => setActiveTab("logs")}
            >
              Logs
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {activeTab === "bundle" && diag && (
            <button
              onClick={handleCopy}
              className="h-7 px-2.5 text-xs bg-surface-2 hover:bg-surface-3 text-text-primary rounded-mac border border-border-40 transition-all flex items-center gap-1.5"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              <span>{copied ? "Copied!" : "Copy All"}</span>
            </button>
          )}
          {activeTab === "logs" && (
            <>
              <button
                onClick={refreshLogs}
                disabled={logLoading}
                className="h-7 px-2.5 text-xs bg-surface-2 hover:bg-surface-3 text-text-primary rounded-mac border border-border-40 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={11} className={logLoading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleCopyLogs}
                className="h-7 px-2.5 text-xs bg-surface-2 hover:bg-surface-3 text-text-primary rounded-mac border border-border-40 transition-all flex items-center gap-1.5"
              >
                {logCopied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                <span>{logCopied ? "Copied!" : "Copy"}</span>
              </button>
              <button
                onClick={handleClearLogs}
                className="h-7 px-2.5 text-xs bg-[#ff375f]/10 hover:bg-[#ff375f]/15 text-[#ff6482] rounded-mac border border-[#ff375f]/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 size={11} />
                <span>Clear</span>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-mac hover:bg-surface-2 transition-colors text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
        {activeTab === "logs" ? (
          <>
            <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-2 space-y-2">
              <div className="flex items-center gap-2">
                <Terminal size={13} className="text-accent shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-text-primary">App Log File</div>
                  <div className="text-2xs text-text-muted font-mono truncate select-all">
                    {logPath || "Log file path will appear after refresh."}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  className="h-7 rounded-mac border border-border-40 bg-surface-2 px-2 text-xs text-text-primary outline-none"
                >
                  {["ALL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    value={logQuery}
                    onChange={(e) => setLogQuery(e.target.value)}
                    placeholder="Search logs"
                    className="h-7 w-full rounded-mac border border-border-40 bg-surface-2 pl-7 pr-2 text-xs text-text-primary outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>
            </div>

            {logLoading ? (
              <div className="flex flex-col items-center justify-center h-52 text-text-muted gap-2">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-xs">Loading logs…</span>
              </div>
            ) : logError ? (
              <div className="flex flex-col items-center justify-center h-52 text-text-muted gap-2">
                <AlertCircle size={20} className="text-red-400" />
                <span className="text-xs text-red-400">{logError}</span>
              </div>
            ) : logEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-text-muted gap-2 border border-border-40 rounded-mac bg-surface-1-20">
                <Terminal size={20} />
                <span className="text-xs">No app logs match the current filter.</span>
              </div>
            ) : (
              <div className="border border-border-40 rounded-mac overflow-hidden bg-surface-1-20">
                <div className="px-3 py-2 text-2xs text-text-muted border-b border-border-30">
                  Showing newest {logEntries.length.toLocaleString()} entries
                </div>
                <div className="max-h-[520px] overflow-y-auto divide-y divide-border-20">
                  {logEntries.map((entry, index) => (
                    <div key={`${entry.raw}:${index}`} className="grid grid-cols-[92px_70px_minmax(0,1fr)] gap-2 px-3 py-2 text-2xs font-mono">
                      <span className="truncate text-text-muted" title={entry.timestamp}>
                        {entry.timestamp || "—"}
                      </span>
                      <span className={`inline-flex h-5 items-center justify-center rounded border px-1.5 text-[9px] font-bold ${levelBadgeClass(entry.level)}`}>
                        {entry.level}
                      </span>
                      <div className="min-w-0">
                        {entry.target && (
                          <span className="mr-1 text-text-muted">[{entry.target}]</span>
                        )}
                        <span className="whitespace-pre-wrap break-words text-text-primary">{entry.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-xs">Collecting diagnostics…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-xs text-red-400">{String(error)}</span>
          </div>
        ) : diag ? (
          <>
            {/* System Info */}
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">System</h3>
              <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
                <InfoRow label="App Version" value={diag.app_version} mono />
                <InfoRow label="Git Version" value={diag.git_version} mono />
                <InfoRow label="OS / Arch" value={diag.os_info} />
              </div>
            </div>

            {/* Repository */}
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GitBranch size={12} />
                Repository
              </h3>
              <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
                <InfoRow label="Path" value={diag.repo_path} mono />
                <InfoRow label="Branch" value={diag.current_branch} mono />
                <InfoRow label="Remote" value={diag.remote_url ?? "—"} mono />
                <InfoRow label="HEAD" value={diag.head_commit} mono />
              </div>
            </div>

            {/* Statistics */}
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GitCommit size={12} />
                Statistics
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-2 text-center">
                  <div className="text-lg font-bold">{diag.total_commits.toLocaleString()}</div>
                  <div className="text-2xs text-text-muted">Commits</div>
                </div>
                <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-2 text-center">
                  <div className="text-lg font-bold">{diag.branch_count}</div>
                  <div className="text-2xs text-text-muted">Branches</div>
                </div>
                <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-2 text-center">
                  <div className="text-lg font-bold">{diag.tag_count}</div>
                  <div className="text-2xs text-text-muted">Tags</div>
                </div>
              </div>
              <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
                <InfoRow label="Staged" value={diag.staged_files} />
                <InfoRow label="Unstaged" value={diag.unstaged_files} />
                <InfoRow label="Untracked" value={diag.untracked_files} />
              </div>
            </div>

            {/* State */}
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HardDrive size={12} />
                State
              </h3>
              <div className="bg-surface-1-30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
                <InfoRow label="LFS Enabled" value={diag.lfs_enabled} />
                <InfoRow label="Conflict" value={diag.conflict_state} />
                <InfoRow label="Rebase in Progress" value={diag.rebase_in_progress} />
                <InfoRow label="Merge in Progress" value={diag.merge_in_progress} />
              </div>
            </div>

            {/* Recent Errors */}
            {diag.recent_errors.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Recent Errors
                </h3>
                <div className="space-y-1">
                  {diag.recent_errors.map((err, i) => (
                    <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-mac px-3 py-1.5 text-2xs text-red-300 font-mono break-all">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All clear */}
            {diag.recent_errors.length === 0 && !diag.conflict_state && !diag.rebase_in_progress && !diag.merge_in_progress && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/5 border border-green-500/20 rounded-mac px-3 py-2">
                <CheckCircle2 size={14} />
                <span>Repository is in a clean, healthy state.</span>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
