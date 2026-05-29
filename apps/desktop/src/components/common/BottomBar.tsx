import { useState } from "react";

export default function BottomBar() {
  const [logs, setLogs] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="h-[24px] border-t border-border flex items-center px-3 text-2xs text-text-muted bg-surface-1">
      <button
        className="ghost text-2xs p-0.5 mr-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "▾" : "▸"}
      </button>
      <span>Ready</span>
      <div className="flex-1" />
      <span className="text-text-muted">GitFlow Desktop v0.1</span>
    </div>
  );
}
