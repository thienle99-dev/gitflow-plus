import { useState, useMemo } from "react";
import Dialog from "@/components/ui/overlay/Dialog";
import { Bug, Send, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import {
  getCrashReports,
  clearCrashReports,
  recordBugReport,
  type CrashReport,
} from "@/lib/crashlytics";
import { trackBugReport } from "@/lib/analytics";

interface BugReportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function BugReportDialog({ open, onClose }: BugReportDialogProps) {
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [includeCrashLogs, setIncludeCrashLogs] = useState(true);
  const [expandedCrash, setExpandedCrash] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const crashReports = useMemo(() => (open ? getCrashReports() : []), [open]);

  const handleSubmit = () => {
    if (!description.trim()) return;

    const report = recordBugReport({
      description: description.trim(),
      stepsToReproduce: stepsToReproduce.trim(),
      expectedBehavior: expectedBehavior.trim(),
      actualBehavior: actualBehavior.trim(),
      includeCrashLogs,
      attachedCrashIds: includeCrashLogs ? crashReports.map((r) => r.id) : [],
    });

    trackBugReport(includeCrashLogs && crashReports.length > 0);
    setSubmitted(true);

    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setDescription("");
    setStepsToReproduce("");
    setExpectedBehavior("");
    setActualBehavior("");
    setIncludeCrashLogs(true);
    setExpandedCrash(null);
    setSubmitted(false);
    onClose();
  };

  const handleClearCrashLogs = () => {
    clearCrashReports();
  };

  if (submitted) {
    return (
      <Dialog open={open} onClose={handleClose} title="Bug Report" maxWidth="520px">
        <div className="flex flex-col items-center py-8 space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#30d158]/10 flex items-center justify-center">
            <Send size={18} className="text-[#30d158]" />
          </div>
          <p className="text-sm font-medium text-text-primary">Report Submitted</p>
          <p className="text-2xs text-text-muted">
            Thank you for the bug report. Your feedback helps us improve.
          </p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Report a Bug" maxWidth="520px">
      <div className="space-y-4">
        {/* Description */}
        <div>
          <label className="block text-2xs font-semibold text-text-secondary mb-1.5">
            Bug Description <span className="text-[#ff375f]">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the bug you encountered..."
            className="w-full h-20 rounded-mac border border-border-40 bg-surface-2 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Steps to Reproduce */}
        <div>
          <label className="block text-2xs font-semibold text-text-secondary mb-1.5">
            Steps to Reproduce
          </label>
          <textarea
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            placeholder="1. Open the app&#10;2. Click on...&#10;3. See error"
            className="w-full h-16 rounded-mac border border-border-40 bg-surface-2 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Expected vs Actual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-2xs font-semibold text-text-secondary mb-1.5">
              Expected Behavior
            </label>
            <textarea
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              placeholder="What should happen?"
              className="w-full h-14 rounded-mac border border-border-40 bg-surface-2 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent resize-none"
            />
          </div>
          <div>
            <label className="block text-2xs font-semibold text-text-secondary mb-1.5">
              Actual Behavior
            </label>
            <textarea
              value={actualBehavior}
              onChange={(e) => setActualBehavior(e.target.value)}
              placeholder="What actually happens?"
              className="w-full h-14 rounded-mac border border-border-40 bg-surface-2 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent resize-none"
            />
          </div>
        </div>

        {/* Crash Logs Section */}
        {crashReports.length > 0 && (
          <div className="border border-border-40 rounded-mac overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-surface-1-40">
              <label className="flex items-center gap-2 text-2xs font-semibold text-text-secondary">
                <input
                  type="checkbox"
                  checked={includeCrashLogs}
                  onChange={(e) => setIncludeCrashLogs(e.target.checked)}
                  className="rounded border-border-40 accent-accent"
                />
                <Bug size={12} className="text-[#ff375f]" />
                Include {crashReports.length} crash log(s)
              </label>
              <button
                onClick={handleClearCrashLogs}
                className="text-3xs text-text-muted hover:text-[#ff375f] transition-colors flex items-center gap-1"
                title="Clear crash logs"
              >
                <Trash2 size={10} />
                Clear
              </button>
            </div>
            {includeCrashLogs && (
              <div className="max-h-[140px] overflow-y-auto">
                {crashReports.map((report) => (
                  <CrashLogEntry
                    key={report.id}
                    report={report}
                    expanded={expandedCrash === report.id}
                    onToggle={() =>
                      setExpandedCrash(expandedCrash === report.id ? null : report.id)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-40">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 hover:bg-surface-3 border border-border rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim()}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              description.trim()
                ? "bg-accent text-accent-fg hover:opacity-90"
                : "bg-surface-3 text-text-muted cursor-not-allowed"
            }`}
          >
            <Send size={11} />
            Submit Report
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function CrashLogEntry({
  report,
  expanded,
  onToggle,
}: {
  report: CrashReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const date = new Date(report.timestamp).toLocaleString();

  return (
    <div className="border-t border-border-40 first:border-t-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs hover:bg-surface-2 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span className="text-text-secondary truncate flex-1">{report.message}</span>
        <span className="text-text-muted shrink-0">{date}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-2">
          <pre className="text-[10px] font-mono text-text-muted whitespace-pre-wrap break-all bg-surface-2 rounded p-2 max-h-[80px] overflow-y-auto">
            {report.stack || "No stack trace"}
            {report.componentStack && (
              <>{"\n\nComponent Stack:\n"}{report.componentStack}</>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
