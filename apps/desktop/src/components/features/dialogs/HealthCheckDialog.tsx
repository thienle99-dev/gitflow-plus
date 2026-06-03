import { useMemo } from "react";
import {
  X,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  FileWarning,
  Key,
  Link2,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useRepoStore } from "@/stores/repo";
import { useHealthCheck } from "@/queries/useHealth";
import type { HealthFinding } from "@/api/tauri";

interface HealthCheckDialogProps {
  onClose: () => void;
}

const SEVERITY_META: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
};

const CATEGORY_META: Record<string, { icon: typeof FileWarning; label: string }> = {
  large_file: { icon: FileWarning, label: "Large File" },
  sensitive_data: { icon: Key, label: "Sensitive Data" },
  broken_symlink: { icon: Link2, label: "Broken Symlink" },
  untracked_secret: { icon: ShieldAlert, label: "Tracked Secret" },
};

export default function HealthCheckDialog({ onClose }: HealthCheckDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: report, isLoading, error, refetch, isFetching } = useHealthCheck(repoPath);

  const grouped = useMemo(() => {
    if (!report) return {};
    return report.findings.reduce<Record<string, HealthFinding[]>>((acc, f) => {
      (acc[f.category] ||= []).push(f);
      return acc;
    }, {});
  }, [report]);

  const criticalCount = report?.findings.filter((f) => f.severity === "critical").length ?? 0;
  const warningCount = report?.findings.filter((f) => f.severity === "warning").length ?? 0;

  return (
    <div className="h-full flex flex-col bg-surface-0 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-40 bg-surface-1/40 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-accent" />
          <span className="text-sm font-bold">Repository Health Check</span>
          {report && (
            <span className="text-2xs text-text-muted ml-1">
              {report.scanned_files} files scanned
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 px-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-mac transition-all flex items-center gap-1"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            <span>Rescan</span>
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-mac hover:bg-surface-2 transition-colors text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="flex gap-2 px-5 py-3 border-b border-border-40 shrink-0">
          <div className="flex-1 bg-surface-1/30 border border-border-40 rounded-mac px-3 py-2 text-center">
            <div className="text-lg font-bold text-green-400">
              {report.findings.length === 0 ? "✓" : report.findings.length}
            </div>
            <div className="text-2xs text-text-muted">Findings</div>
          </div>
          <div className="flex-1 bg-red-500/5 border border-red-500/20 rounded-mac px-3 py-2 text-center">
            <div className="text-lg font-bold text-red-400">{criticalCount}</div>
            <div className="text-2xs text-text-muted">Critical</div>
          </div>
          <div className="flex-1 bg-yellow-500/5 border border-yellow-500/20 rounded-mac px-3 py-2 text-center">
            <div className="text-lg font-bold text-yellow-400">{warningCount}</div>
            <div className="text-2xs text-text-muted">Warnings</div>
          </div>
          <div className="flex-1 bg-surface-1/30 border border-border-40 rounded-mac px-3 py-2 text-center">
            <div className="text-lg font-bold text-text-primary">{report.scanned_files}</div>
            <div className="text-2xs text-text-muted">Files Scanned</div>
          </div>
        </div>
      )}

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-xs">Scanning repository…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-xs text-red-400">{String(error)}</span>
          </div>
        ) : report && report.findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <CheckCircle2 size={24} className="text-green-400" />
            <span className="text-sm font-semibold text-green-400">All Clear</span>
            <span className="text-xs text-center max-w-[300px]">
              No issues found. {report.scanned_files} files scanned for large files, sensitive data, and broken symlinks.
            </span>
          </div>
        ) : (
          Object.entries(grouped).map(([category, findings]) => {
            const catMeta = CATEGORY_META[category] ?? { icon: AlertTriangle, label: category };
            const CatIcon = catMeta.icon;
            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <CatIcon size={12} />
                  <span>{catMeta.label}</span>
                  <span className="text-text-muted">({findings.length})</span>
                </div>
                {findings.map((finding, i) => {
                  const sev = SEVERITY_META[finding.severity] ?? SEVERITY_META.warning;
                  const SevIcon = sev.icon;
                  return (
                    <div
                      key={`${category}-${i}`}
                      className={`${sev.bg} ${sev.border} border rounded-mac px-3 py-2 space-y-1`}
                    >
                      <div className="flex items-start gap-2">
                        <SevIcon size={13} className={`${sev.color} shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-text-primary break-all">{finding.path}</span>
                            <span className={`text-2xs font-bold uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.color}`}>
                              {finding.severity}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">{finding.message}</p>
                          {finding.detail && (
                            <p className="text-2xs text-text-muted mt-1 italic">{finding.detail}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
