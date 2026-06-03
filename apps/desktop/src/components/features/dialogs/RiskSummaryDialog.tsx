import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileWarning,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import type { RiskReport, RiskFinding, RiskSeverity } from "@/lib/risk-scanner";

interface RiskSummaryDialogProps {
  open: boolean;
  report: (RiskReport & { aiSummary?: string }) | null;
  loading: boolean;
  action: string; // "push" | "merge" etc.
  onProceed: () => void;
  onCancel: () => void;
}

const SEVERITY_META: Record<RiskSeverity, { color: string; bg: string; border: string; icon: typeof ShieldAlert }> = {
  critical: { color: "text-[#ff375f]", bg: "bg-[#ff375f]/10", border: "border-[#ff375f]/30", icon: ShieldAlert },
  high:     { color: "text-[#ff6b35]", bg: "bg-[#ff6b35]/10", border: "border-[#ff6b35]/30", icon: ShieldAlert },
  medium:   { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: AlertTriangle },
  low:      { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", icon: FileWarning },
};

const OVERALL_META: Record<RiskReport["overall"], { label: string; color: string; bg: string; icon: typeof Shield }> = {
  critical: { label: "Critical Risk", color: "text-[#ff375f]", bg: "bg-[#ff375f]/15", icon: ShieldAlert },
  high:     { label: "High Risk", color: "text-[#ff6b35]", bg: "bg-[#ff6b35]/15", icon: ShieldAlert },
  medium:   { label: "Medium Risk", color: "text-yellow-500", bg: "bg-yellow-500/15", icon: AlertTriangle },
  low:      { label: "Low Risk", color: "text-blue-400", bg: "bg-blue-400/15", icon: ShieldCheck },
  safe:     { label: "No Risks Detected", color: "text-emerald-400", bg: "bg-emerald-400/15", icon: ShieldCheck },
};

export default function RiskSummaryDialog({ open, report, loading, action, onProceed, onCancel }: RiskSummaryDialogProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAiDetails, setShowAiDetails] = useState(false);

  useEffect(() => {
    if (open && report) {
      // Auto-expand all categories on open
      const categories = new Set(report.findings.map((f) => f.category));
      setExpandedCategories(categories);
    }
  }, [open, report]);

  if (!open) return null;

  const overall = report?.overall ?? "safe";
  const meta = OVERALL_META[overall];
  const OverallIcon = meta.icon;
  const canProceed = overall === "safe" || overall === "low" || overall === "medium";

  // Group findings by category
  const grouped = report?.findings.reduce<Record<string, RiskFinding[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {}) ?? {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs" onClick={onCancel}>
      <div
        className="bg-surface-0 rounded-mac shadow-xl border border-border overflow-hidden w-[min(540px,92vw)] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">AI Risk Summary</span>
            <span className="text-2xs text-text-muted capitalize">— {action}</span>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-surface-2 rounded-mac transition-colors cursor-pointer">
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && !report ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 size={20} className="animate-spin text-accent" />
              <span className="text-xs text-text-muted">Analyzing changes for risks...</span>
            </div>
          ) : report ? (
            <>
              {/* Overall Status Banner */}
              <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-mac border ${meta.bg} ${meta.color} border-current/20`}>
                <OverallIcon size={18} />
                <div>
                  <div className="text-xs font-semibold">{meta.label}</div>
                  <div className="text-2xs opacity-75">
                    {report.fileCount} file{report.fileCount !== 1 ? "s" : ""} analyzed · {report.findings.length} finding{report.findings.length !== 1 ? "s" : ""}
                  </div>
                </div>
                {overall === "safe" && (
                  <CheckCircle2 size={16} className="ml-auto" />
                )}
              </div>

              {/* Findings by Category */}
              {Object.entries(grouped).map(([category, findings]) => {
                const worstSeverity = findings.reduce<RiskSeverity>((worst, f) => {
                  const order: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                  return order[f.severity] < order[worst] ? f.severity : worst;
                }, "low");
                const sMeta = SEVERITY_META[worstSeverity];
                const expanded = expandedCategories.has(category);

                return (
                  <div key={category} className={`rounded-mac border ${sMeta.border} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(expandedCategories);
                        if (expanded) next.delete(category);
                        else next.add(category);
                        setExpandedCategories(next);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold ${sMeta.color} ${sMeta.bg} cursor-pointer hover:opacity-90 transition-opacity`}
                    >
                      <sMeta.icon size={13} />
                      <span>{category}</span>
                      <span className="text-2xs opacity-60 ml-1">({findings.length})</span>
                      <ChevronDown size={11} className={`ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    {expanded && (
                      <div className="px-3 py-2 space-y-1.5">
                        {findings.map((finding, i) => {
                          const fMeta = SEVERITY_META[finding.severity];
                          return (
                            <div key={i} className="flex items-start gap-2 text-2xs">
                              <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-3xs font-bold uppercase ${fMeta.bg} ${fMeta.color}`}>
                                {finding.severity}
                              </span>
                              <div className="min-w-0">
                                <span className="text-text-primary">{finding.label}</span>
                                {finding.file && (
                                  <span className="ml-1.5 text-text-muted font-mono truncate">{finding.file}</span>
                                )}
                                {finding.detail && (
                                  <div className="text-text-muted mt-0.5">{finding.detail}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* AI Summary */}
              {report.aiSummary && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAiDetails(!showAiDetails)}
                    className="flex items-center gap-2 text-xs font-semibold text-accent cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <ExternalLink size={12} />
                    <span>AI Deep Analysis</span>
                    <ChevronDown size={11} className={`transition-transform ${showAiDetails ? "rotate-180" : ""}`} />
                  </button>
                  {showAiDetails && (
                    <div className="text-2xs text-text-secondary bg-surface-1 border border-border rounded-mac p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {report.aiSummary}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-mac transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            disabled={loading}
            className={`px-4 py-1.5 text-xs font-semibold rounded-mac transition-colors cursor-pointer disabled:opacity-40 ${
              canProceed
                ? "text-white bg-accent hover:bg-accent/80"
                : "text-white bg-[#ff375f] hover:bg-[#ff375f]/80"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" />
                Analyzing...
              </span>
            ) : canProceed ? (
              `Proceed with ${action}`
            ) : (
              `${action} anyway`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
