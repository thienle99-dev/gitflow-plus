import { memo, useState, useRef, useEffect } from "react";
import { Sparkles, AlertTriangle, WifiOff, Wifi, Settings } from "lucide-react";
import { useAIStatus, type AIStatusKind } from "@/hooks/useAIStatus";
import { useUIStore } from "@/stores/ui";

// ─── Status dot colors ──────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  AIStatusKind,
  { dot: string; icon: string; bg: string; border: string; text: string }
> = {
  "ready": {
    dot: "bg-[#30d158]",
    icon: "text-[#30d158]",
    bg: "bg-[#30d158]/8",
    border: "border-[#30d158]/20",
    text: "text-[#30d158]",
  },
  "local": {
    dot: "bg-[#0a84ff]",
    icon: "text-[#0a84ff]",
    bg: "bg-[#0a84ff]/8",
    border: "border-[#0a84ff]/20",
    text: "text-[#0a84ff]",
  },
  "missing-key": {
    dot: "bg-[#ff9f0a]",
    icon: "text-[#ff9f0a]",
    bg: "bg-[#ff9f0a]/8",
    border: "border-[#ff9f0a]/20",
    text: "text-[#ff9f0a]",
  },
  "api-failed": {
    dot: "bg-[#ff453a]",
    icon: "text-[#ff453a]",
    bg: "bg-[#ff453a]/8",
    border: "border-[#ff453a]/20",
    text: "text-[#ff453a]",
  },
  "no-profile": {
    dot: "bg-text-muted",
    icon: "text-text-muted",
    bg: "bg-surface-2",
    border: "border-border-40",
    text: "text-text-muted",
  },
};

// ─── Status icon ────────────────────────────────────────────────────────────

function StatusIcon({ kind }: { kind: AIStatusKind }) {
  switch (kind) {
    case "ready":
      return <Sparkles size={10} />;
    case "local":
      return <Wifi size={10} />;
    case "missing-key":
      return <AlertTriangle size={10} />;
    case "api-failed":
      return <WifiOff size={10} />;
    default:
      return <Settings size={10} />;
  }
}

// ─── Tooltip popover ────────────────────────────────────────────────────────

interface TooltipProps {
  kind: AIStatusKind;
  label: string;
  reason: string;
  profileName: string;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
}

function StatusTooltip({
  kind,
  label,
  reason,
  profileName,
  onOpenSettings,
  onOpenDiagnostics,
}: TooltipProps) {
  const styles = STATUS_STYLES[kind];

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-surface-1-95 backdrop-blur-xl border border-border-40 rounded-mac shadow-xl py-2 px-3 z-[999] anim-palette-enter">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusIcon kind={kind} />
        <span className={`text-xs font-semibold ${styles.text}`}>{label}</span>
      </div>

      {/* Profile name */}
      <div className="text-2xs text-text-muted mb-1">
        Profile: <span className="text-text-secondary font-medium">{profileName}</span>
      </div>

      {/* Reason */}
      <div className="text-2xs text-text-secondary leading-relaxed mb-2.5">
        {reason}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 border-t border-border-40 pt-2">
        <button
          onClick={onOpenSettings}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-2xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 rounded transition-colors cursor-pointer"
        >
          <Settings size={9} />
          AI Settings
        </button>
        <button
          onClick={onOpenDiagnostics}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-2xs font-semibold text-text-secondary bg-surface-2 hover:bg-surface-3 rounded transition-colors cursor-pointer"
        >
          Diagnostics
        </button>
      </div>
    </div>
  );
}

// ─── Main chip component ────────────────────────────────────────────────────

export const AIStatusChip = memo(function AIStatusChip() {
  const status = useAIStatus();
  const openDialog = useUIStore((s) => s.openDialog);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const styles = STATUS_STYLES[status.kind];

  // Close on click outside
  useEffect(() => {
    if (!showTooltip) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTooltip]);

  const handleClick = () => {
    setShowTooltip((v) => !v);
  };

  const handleMouseEnter = () => {
    clearTimeout(hideTimeoutRef.current);
    // Show tooltip on hover after a short delay
    hideTimeoutRef.current = setTimeout(() => setShowTooltip(true), 400);
  };

  const handleMouseLeave = () => {
    clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setShowTooltip(false), 200);
  };

  const handleOpenSettings = () => {
    setShowTooltip(false);
    openDialog("settings");
  };

  const handleOpenDiagnostics = () => {
    setShowTooltip(false);
    openDialog("diagnostics");
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tooltip */}
      {showTooltip && (
        <StatusTooltip
          kind={status.kind}
          label={status.label}
          reason={status.reason}
          profileName={status.profileName}
          onOpenSettings={handleOpenSettings}
          onOpenDiagnostics={handleOpenDiagnostics}
        />
      )}

      {/* Chip button */}
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer hover:opacity-80 ${styles.bg} ${styles.border}`}
        title={`${status.label} — ${status.reason}`}
      >
        <span className={`relative flex h-1.5 w-1.5 shrink-0`}>
          {status.kind === "ready" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${styles.dot}`} />
        </span>
        <span className={`text-2xs font-semibold ${styles.text} whitespace-nowrap`}>
          {status.label}
        </span>
      </button>
    </div>
  );
});
