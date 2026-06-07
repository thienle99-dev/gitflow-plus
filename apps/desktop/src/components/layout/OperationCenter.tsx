import { useState } from "react";
import { useOperationsStore, type Operation } from "@/stores/operations";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Trash2,
  Clock,
  Bot,
  GitBranch,
  ChevronDown,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

function useLiveElapsed(startMs: number, endMs?: number): string {
  // Re-render every second for running operations
  const ms = endMs ?? Date.now();
  const secs = Math.floor((ms - startMs) / 1000);
  if (secs === 0) return "now";
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainder = secs % 60;
  return `${mins}m ${remainder}s`;
}

function StatusIcon({ status }: { status: Operation["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 size={13} className="animate-spin text-accent shrink-0" />;
    case "completed":
      return <CheckCircle2 size={13} className="text-[#30d158] shrink-0" />;
    case "failed":
      return <XCircle size={13} className="text-[#ff375f] shrink-0" />;
    case "cancelled":
      return <XCircle size={13} className="text-text-muted shrink-0" />;
  }
}

function TypeIcon({ type }: { type: Operation["type"] }) {
  if (type === "ai") return <Bot size={11} className="text-accent shrink-0" />;
  return <GitBranch size={11} className="text-text-muted shrink-0" />;
}

function OperationRow({ op }: { op: Operation }) {
  const removeOperation = useOperationsStore((s) => s.removeOperation);
  const [expanded, setExpanded] = useState(false);
  const duration = useLiveElapsed(op.startedAt, op.endedAt);
  const hasDetails = op.error || op.detail;

  return (
    <div className={`border-b border-border-20 last:border-b-0 ${op.status === "running" ? "bg-accent/5" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-2-40 group text-2xs">
        <StatusIcon status={op.status} />
        <TypeIcon type={op.type} />
        <span className="font-medium text-text-secondary truncate flex-1 min-w-0">
          {op.label}
        </span>

        {/* Duration */}
        <span className={`flex items-center gap-0.5 shrink-0 ${op.status === "running" ? "text-accent font-medium" : "text-text-muted-60"}`}>
          <Clock size={9} />
          {duration}
        </span>

        {/* Expand toggle (when error/detail exists) */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 h-4 w-4 inline-flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-all cursor-pointer"
          >
            <ChevronDown size={9} className={`transition-transform ${expanded ? "" : "-rotate-90"}`} />
          </button>
        )}

        <button
          onClick={() => removeOperation(op.id)}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-secondary transition-opacity p-0.5 cursor-pointer shrink-0"
          title="Remove"
        >
          <X size={10} />
        </button>
      </div>

      {/* Expandable detail section */}
      {hasDetails && expanded && (
        <div className="px-3 pb-2 space-y-1">
          {op.error && (
            <div className="px-2 py-1.5 rounded bg-[#ff453a]/8 border border-[#ff453a]/15 text-[10px] text-[#ff453a] font-mono whitespace-pre-wrap break-words select-text">
              {op.error}
            </div>
          )}
          {op.detail && (
            <div className="px-2 py-1.5 text-[10px] text-text-muted">
              {op.detail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OperationCenter() {
  const operations = useOperationsStore((s) => s.operations);
  const isOpen = useOperationsStore((s) => s.isOpen);
  const setOpen = useOperationsStore((s) => s.setOpen);
  const clearAll = useOperationsStore((s) => s.clearAll);

  const running = operations.filter((op) => op.status === "running");
  const completed = operations.filter((op) => op.status === "completed");
  const failed = operations.filter((op) => op.status === "failed" || op.status === "cancelled");

  const [shouldRender, phase] = useAnimatedMount(isOpen, 250);
  if (!shouldRender) return null;
  const isExiting = phase === "exit";

  return (
    <div
      className={`border-t border-border-60 bg-surface-1-80 backdrop-blur-md flex flex-col ${isExiting ? "anim-slide-up-exit" : "anim-slide-up-enter"}`}
      style={{ height: 220 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xs font-semibold text-text-secondary shrink-0">Operations</span>
          {running.length > 0 && (
            <span className="flex items-center gap-1 text-2xs text-accent truncate">
              <Loader2 size={10} className="animate-spin shrink-0" />
              <span className="truncate">{running[0].label}</span>
              <span className="text-text-muted-60 shrink-0">· running</span>
            </span>
          )}
          {running.length === 0 && operations.length > 0 && (
            <span className="text-2xs text-text-muted-60">
              {completed.length} done · {failed.length} failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {operations.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded cursor-pointer"
              title="Clear all"
            >
              <Trash2 size={10} />
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-text-muted hover:text-text-secondary transition-colors p-0.5 cursor-pointer"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {operations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-2xs text-text-muted">
            No operations yet
          </div>
        ) : (
          <>
            {/* Running */}
            {running.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-accent uppercase tracking-wider bg-accent/5 border-b border-accent/10">
                  <Loader2 size={9} className="animate-spin" />
                  Running
                </div>
                {running.map((op) => (
                  <OperationRow key={op.id} op={op} />
                ))}
              </div>
            )}

            {/* Failed */}
            {failed.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-[#ff453a] uppercase tracking-wider bg-[#ff453a]/5 border-b border-[#ff453a]/10">
                  <AlertCircle size={9} />
                  Failed
                </div>
                {failed.slice(0, 10).map((op) => (
                  <OperationRow key={op.id} op={op} />
                ))}
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-[#30d158] uppercase tracking-wider bg-[#30d158]/5 border-b border-[#30d158]/10">
                  <CheckCircle2 size={9} />
                  Completed
                </div>
                {completed.slice(0, 15).map((op) => (
                  <OperationRow key={op.id} op={op} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
