import { useState } from "react";
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
} from "lucide-react";
import { useRepoStore } from "@/stores/repo";
import { useDiagnostics } from "@/queries/useHealth";
import type { DiagnosticBundle } from "@/api/tauri";

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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!diag) return;
    await navigator.clipboard.writeText(formatDiagnosticsForCopy(diag));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-surface-0 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-40 bg-surface-1/40 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent" />
          <span className="text-sm font-bold">Diagnostic Bundle</span>
        </div>
        <div className="flex items-center gap-1.5">
          {diag && (
            <button
              onClick={handleCopy}
              className="h-7 px-2.5 text-xs bg-surface-2 hover:bg-surface-3 text-text-primary rounded-mac border border-border-40 transition-all flex items-center gap-1.5"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              <span>{copied ? "Copied!" : "Copy All"}</span>
            </button>
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
        {isLoading ? (
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
              <div className="bg-surface-1/30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
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
              <div className="bg-surface-1/30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
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
                <div className="bg-surface-1/30 border border-border-40 rounded-mac px-3 py-2 text-center">
                  <div className="text-lg font-bold">{diag.total_commits.toLocaleString()}</div>
                  <div className="text-2xs text-text-muted">Commits</div>
                </div>
                <div className="bg-surface-1/30 border border-border-40 rounded-mac px-3 py-2 text-center">
                  <div className="text-lg font-bold">{diag.branch_count}</div>
                  <div className="text-2xs text-text-muted">Branches</div>
                </div>
                <div className="bg-surface-1/30 border border-border-40 rounded-mac px-3 py-2 text-center">
                  <div className="text-lg font-bold">{diag.tag_count}</div>
                  <div className="text-2xs text-text-muted">Tags</div>
                </div>
              </div>
              <div className="bg-surface-1/30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
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
              <div className="bg-surface-1/30 border border-border-40 rounded-mac px-3 py-1 divide-y divide-border-30">
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
