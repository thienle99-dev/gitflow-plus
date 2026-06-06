import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  Sparkles,
  Terminal,
  FileText
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
  critical: { color: "text-[#ff375f]", bg: "bg-[#ff375f]/8", border: "border-[#ff375f]/25", icon: ShieldAlert },
  high:     { color: "text-[#ff6b35]", bg: "bg-[#ff6b35]/8", border: "border-[#ff6b35]/25", icon: ShieldAlert },
  medium:   { color: "text-yellow-500", bg: "bg-yellow-500/8", border: "border-yellow-500/25", icon: AlertTriangle },
  low:      { color: "text-[#007aff]", bg: "bg-[#007aff]/8", border: "border-[#007aff]/25", icon: ShieldCheck },
};

const OVERALL_META: Record<RiskReport["overall"], { label: string; color: string; bg: string; border: string; icon: typeof Shield }> = {
  critical: { label: "Critical Risks Blocking Operation", color: "text-[#ff375f]", bg: "bg-[#ff375f]/10", border: "border-[#ff375f]/25", icon: ShieldAlert },
  high:     { label: "High Risk Review Required", color: "text-[#ff6b35]", bg: "bg-[#ff6b35]/10", border: "border-[#ff6b35]/25", icon: ShieldAlert },
  medium:   { label: "Medium Security Findings", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/25", icon: AlertTriangle },
  low:      { label: "Low Severity Warnings", color: "text-[#007aff]", bg: "bg-[#007aff]/10", border: "border-[#007aff]/25", icon: ShieldCheck },
  safe:     { label: "No Risks Detected", color: "text-[#30d158]", bg: "bg-[#30d158]/10", border: "border-[#30d158]/25", icon: ShieldCheck },
};

export default function RiskSummaryDialog({ open, report, loading, action, onProceed, onCancel }: RiskSummaryDialogProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"findings" | "copilot">("findings");

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

  // Formatter to render code snippets nicely
  const formatCopilotText = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="px-1.5 py-0.5 rounded bg-surface-2 border border-border-40 font-mono text-[10px] text-accent select-all">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md anim-overlay-enter" onClick={onCancel}>
      <div
        className="bg-surface-0 rounded-mac shadow-2xl border border-border-60 overflow-hidden w-[min(540px,92vw)] h-[540px] max-h-[82vh] flex flex-col anim-dialog-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-30 bg-surface-1-40 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-[12px] font-bold text-text-primary">AI Review Report</span>
            <span className="text-[10px] text-text-muted capitalize">· {action} context</span>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-surface-2 rounded transition-colors cursor-pointer text-text-muted hover:text-text-primary">
            <X size={13} />
          </button>
        </div>

        {/* Tab Selection (only if report has AI summary description) */}
        {report && report.aiSummary && (
          <div className="flex border-b border-border-20 bg-surface-1-25 px-4 h-9 items-center shrink-0 select-none">
            <div className="flex gap-1.5 h-full items-center">
              <button
                onClick={() => setActiveTab("findings")}
                className={`flex items-center gap-1.5 px-3 h-7 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === "findings"
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                }`}
              >
                <Terminal size={11} />
                <span>Diagnostics ({report.findings.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("copilot")}
                className={`flex items-center gap-1.5 px-3 h-7 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === "copilot"
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                }`}
              >
                <Sparkles size={11} />
                <span>Copilot Analysis</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {loading && !report ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 animate-pulse">
              <Loader2 size={24} className="animate-spin text-accent" />
              <div className="text-center space-y-1">
                <span className="text-[11px] font-semibold text-text-primary">Running AI Diagnostics</span>
                <p className="text-[10px] text-text-muted max-w-[240px] leading-relaxed">
                  Scanning changed files and patch diffs for security violations, destructive operations, or credentials...
                </p>
              </div>
            </div>
          ) : report ? (
            <>
              {activeTab === "findings" ? (
                <div className="space-y-3.5">
                  {/* Overall Status Banner */}
                  <div className={`flex items-center gap-3 px-3.5 py-3 rounded border ${meta.bg} ${meta.color} ${meta.border} select-none`}>
                    <div className="h-7 w-7 rounded-full bg-current/10 flex items-center justify-center shrink-0">
                      <OverallIcon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold leading-tight">{meta.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5 leading-none">
                        {report.fileCount} file{report.fileCount !== 1 ? "s" : ""} scanned · {report.findings.length} warning{report.findings.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {overall === "safe" && (
                      <CheckCircle2 size={16} className="text-[#30d158] shrink-0" />
                    )}
                  </div>

                  {/* Findings List grouped by category */}
                  {report.findings.length === 0 ? (
                    <div className="text-center py-10 space-y-1.5">
                      <ShieldCheck size={32} className="text-[#30d158] mx-auto opacity-75" />
                      <h4 className="text-[11px] font-bold text-text-primary">Clean Scan</h4>
                      <p className="text-[10px] text-text-muted max-w-[260px] mx-auto leading-relaxed">
                        No dangerous shell scripts, database migration patterns, or security exposures detected in this patch.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(grouped).map(([category, findings]) => {
                        const worstSeverity = findings.reduce<RiskSeverity>((worst, f) => {
                          const order: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                          return order[f.severity] < order[worst] ? f.severity : worst;
                        }, "low");
                        const sMeta = SEVERITY_META[worstSeverity];
                        const expanded = expandedCategories.has(category);

                        return (
                          <div key={category} className={`rounded border ${sMeta.border} overflow-hidden bg-surface-1-10`}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(expandedCategories);
                                if (expanded) next.delete(category);
                                else next.add(category);
                                setExpandedCategories(next);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold ${sMeta.color} ${sMeta.bg} cursor-pointer transition-opacity hover:opacity-90 select-none`}
                            >
                              <sMeta.icon size={12} className="shrink-0" />
                              <span>{category}</span>
                              <span className="text-[10px] opacity-60 ml-0.5">({findings.length})</span>
                              <ChevronDown size={11} className={`ml-auto transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                            </button>
                            
                            {expanded && (
                              <div className="px-3 py-2 space-y-2.5 divide-y divide-border-20">
                                {findings.map((finding, i) => {
                                  const fMeta = SEVERITY_META[finding.severity];
                                  return (
                                    <div key={i} className={`flex items-start gap-2.5 text-[11px] ${i > 0 ? "pt-2.5" : ""}`}>
                                      <span className={`shrink-0 mt-0.5 px-1 py-0.5 rounded-[2px] text-[8px] font-bold uppercase tracking-wider ${fMeta.bg} ${fMeta.color} border border-current/15`}>
                                        {finding.severity}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-text-primary font-medium leading-relaxed">{finding.label}</div>
                                        {finding.file && (
                                          <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-text-secondary bg-surface-2 px-2 py-0.5 rounded w-fit truncate">
                                            <FileText size={10} className="text-text-muted" />
                                            <span className="select-all">{finding.file}</span>
                                          </div>
                                        )}
                                        {finding.detail && (
                                          <div className="text-text-muted mt-1 text-[10px] leading-relaxed border-l-2 border-border-30 pl-2">
                                            {finding.detail}
                                          </div>
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
                    </div>
                  )}
                </div>
              ) : (
                /* Copilot AI Analysis view */
                <div className="space-y-4 anim-overlay-enter">
                  {/* Avatar Copilot Card */}
                  <div className="flex gap-3 p-3.5 bg-gradient-to-br from-accent-5 to-surface-1 border border-accent-20 rounded">
                    <div className="h-7 w-7 rounded-full bg-accent-15 border border-accent-20 flex items-center justify-center text-accent shrink-0">
                      <Sparkles size={13} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold text-text-primary">GitFlow Assistant</h4>
                      <p className="text-[10px] text-text-secondary leading-relaxed">
                        I reviewed the changes in this patch. Below is my architectural and security assessment:
                      </p>
                    </div>
                  </div>

                  {/* Pre-formatted assessment report */}
                  <div className="text-[11px] text-text-secondary bg-surface-1 border border-border-30 rounded p-4 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                    {formatCopilotText(report.aiSummary || "")}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-30 bg-surface-1-40 shrink-0 select-none">
          <div className="text-[10px] text-text-muted">
            {!loading && report && !canProceed && (
              <span className="text-[#ff375f] font-semibold flex items-center gap-1">
                <ShieldAlert size={11} /> Blocked by Policy
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              disabled={loading}
              className={`px-3.5 py-1.5 text-[11px] font-semibold rounded transition-all cursor-pointer disabled:opacity-40 shadow-xs ${
                canProceed
                  ? "text-white bg-accent hover:bg-accent-90"
                  : "text-white bg-[#ff375f] hover:bg-[#ff375f]/90"
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" />
                  Running Scan...
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
    </div>
  );
}
