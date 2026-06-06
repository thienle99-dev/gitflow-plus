import { useOperationsStore, type Operation } from "@/stores/operations";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";
import { Loader2, CheckCircle2, XCircle, X, Trash2, Clock, Bot, GitBranch } from "lucide-react";

function elapsed(startMs: number, endMs?: number): string {
  const secs = Math.floor(((endMs ?? Date.now()) - startMs) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
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

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-2-40 group text-2xs">
      <StatusIcon status={op.status} />
      <TypeIcon type={op.type} />
      <span className="font-medium text-text-secondary truncate flex-1 min-w-0">
        {op.label}
      </span>
      {op.detail && (
        <span className="text-text-muted truncate max-w-[140px]" title={op.detail}>
          {op.detail}
        </span>
      )}
      <span className="text-text-muted-60 flex items-center gap-0.5 shrink-0">
        <Clock size={9} />
        {elapsed(op.startedAt, op.endedAt)}
      </span>
      {op.error && (
        <span className="text-[#ff375f] truncate max-w-[120px]" title={op.error}>
          {op.error}
        </span>
      )}
      <button
        onClick={() => removeOperation(op.id)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-secondary transition-opacity p-0.5 cursor-pointer"
        title="Remove"
      >
        <X size={10} />
      </button>
    </div>
  );
}

export default function OperationCenter() {
  const operations = useOperationsStore((s) => s.operations);
  const isOpen = useOperationsStore((s) => s.isOpen);
  const setOpen = useOperationsStore((s) => s.setOpen);
  const clearCompleted = useOperationsStore((s) => s.clearCompleted);

  const running = operations.filter((op) => op.status === "running");
  const history = operations.filter((op) => op.status !== "running");

  const [shouldRender, phase] = useAnimatedMount(isOpen, 250);

  if (!shouldRender) return null;

  const isExiting = phase === "exit";

  return (
    <div
      className={`border-t border-border-60 bg-surface-1-80 backdrop-blur-md flex flex-col ${isExiting ? "anim-slide-up-exit" : "anim-slide-up-enter"}`}
      style={{ height: 200 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold text-text-secondary">Operations</span>
          {running.length > 0 && (
            <span className="flex items-center gap-1 text-2xs text-accent">
              <Loader2 size={10} className="animate-spin" />
              {running.length} running
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              onClick={clearCompleted}
              className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded cursor-pointer"
              title="Clear completed"
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
            {running.length > 0 && (
              <div>
                {running.map((op) => (
                  <OperationRow key={op.id} op={op} />
                ))}
              </div>
            )}
            {running.length > 0 && history.length > 0 && (
              <div className="border-t border-border-30 mx-3" />
            )}
            {history.length > 0 && (
              <div>
                {history.slice(0, 20).map((op) => (
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
