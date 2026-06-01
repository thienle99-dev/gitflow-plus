import { useState } from "react";
import { ChevronRight, ChevronDown, Terminal } from "lucide-react";

export default function BottomBar() {
  const [logs, setLogs] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="h-[26px] border-t border-border-60 bg-surface-1/40 backdrop-blur-md flex items-center px-4 text-2xs text-text-muted select-none">
      
      {/* Left side: Terminal Log expand toggle */}
      <button
        className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-all p-0.5 rounded cursor-pointer mr-2.5"
        onClick={() => setExpanded(!expanded)}
        title="Toggle Git logs console"
      >
        {expanded ? (
          <ChevronDown size={11} className="transition-transform duration-200" />
        ) : (
          <ChevronRight size={11} className="transition-transform duration-200" />
        )}
        <Terminal size={11} />
      </button>

      {/* Connection / State Indicator (Pulse Dot) */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#30d158]"></span>
        </span>
        <span className="font-semibold text-text-secondary">Ready</span>
      </div>

      <div className="flex-1" />

      {/* Right side: Version Capsule */}
      <span className="bg-surface-2/60 border border-border-40 rounded-full px-2 py-0.5 text-[9px] font-semibold text-text-muted/80 shadow-2xs">
        GitFlow Desktop v0.1.0
      </span>
    </div>
  );
}
