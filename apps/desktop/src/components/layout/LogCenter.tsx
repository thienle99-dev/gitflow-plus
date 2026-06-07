import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, Search, Terminal, Trash2, X } from "lucide-react";
import { api, type AppLogEntry } from "@/api/tauri";
import { useLogsPanelStore } from "@/stores/logs";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";

function levelBadgeClass(level: string) {
  switch (level.toUpperCase()) {
    case "ERROR":
      return "bg-[#ff375f]/10 text-[#ff375f] border-[#ff375f]/25";
    case "WARN":
      return "bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/25";
    case "DEBUG":
      return "bg-[#bf5af2]/10 text-[#bf5af2] border-[#bf5af2]/25";
    case "TRACE":
      return "bg-text-muted-10 text-text-muted border-border-40";
    default:
      return "bg-accent-10 text-accent border-accent-20";
  }
}

export default function LogCenter() {
  const isOpen = useLogsPanelStore((s) => s.isOpen);
  const setOpen = useLogsPanelStore((s) => s.setOpen);
  const [shouldRender, phase] = useAnimatedMount(isOpen, 250);
  const [entries, setEntries] = useState<AppLogEntry[]>([]);
  const [logPath, setLogPath] = useState("");
  const [level, setLevel] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [path, list] = await Promise.all([
        api.logs.path(),
        api.logs.list(300, level, query),
      ]);
      setLogPath(path);
      setEntries(list);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [level, query]);

  useEffect(() => {
    if (isOpen) refreshLogs();
  }, [isOpen, refreshLogs]);

  const copyLogs = async () => {
    const text = await api.logs.exportText();
    await navigator.clipboard.writeText(text || "No app logs recorded yet.");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const clearLogs = async () => {
    await api.logs.clear();
    await refreshLogs();
  };

  if (!shouldRender) return null;

  const isExiting = phase === "exit";

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(atBottom);
  }, []);

  const errorCount = entries.filter((e) => e.level.toUpperCase() === "ERROR").length;
  const warnCount = entries.filter((e) => e.level.toUpperCase() === "WARN").length;

  return (
    <div className={`border-t border-border-60 bg-surface-1-80 backdrop-blur-md flex flex-col ${isExiting ? "anim-slide-up-exit" : "anim-slide-up-enter"}`} style={{ height: 300 }}>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-border-40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal size={12} className="text-accent shrink-0" />
          <span className="text-2xs font-semibold text-text-secondary shrink-0">Logs</span>
          <span className="text-3xs text-text-muted font-mono truncate min-w-0 select-all" title={logPath}>
            {logPath || "Log file path"}
          </span>
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-3xs text-text-muted">{entries.length} entries</span>
              {errorCount > 0 && <span className="text-3xs font-bold text-[#ff375f]">{errorCount} err</span>}
              {warnCount > 0 && <span className="text-3xs font-bold text-[#ff9f0a]">{warnCount} warn</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-surface-2-60 border border-border-40 rounded p-0.5">
            {["ALL", "ERROR", "WARN", "INFO", "DEBUG"].map((item) => (
              <button
                key={item}
                onClick={() => setLevel(item)}
                className={`h-5 px-1.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${
                  level === item
                    ? item === "ERROR" ? "bg-[#ff375f]/15 text-[#ff375f]"
                    : item === "WARN" ? "bg-[#ff9f0a]/15 text-[#ff9f0a]"
                    : item === "DEBUG" ? "bg-[#bf5af2]/15 text-[#bf5af2]"
                    : "bg-accent-15 text-accent"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="relative w-[180px]">
            <Search size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs"
              className="h-6 w-full rounded border border-border-40 bg-surface-2 pl-6 pr-2 text-2xs text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={refreshLogs}
            disabled={loading}
            className={`flex items-center gap-1 text-2xs transition-colors px-1.5 py-0.5 rounded cursor-pointer ${
              loading
                ? "bg-accent-10 text-accent"
                : "text-text-muted hover:text-text-secondary disabled:opacity-40"
            }`}
            title={loading ? "Loading logs…" : "Refresh logs"}
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={copyLogs}
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded cursor-pointer"
            title="Copy logs"
          >
            {copied ? <Check size={10} className="text-[#30d158]" /> : <Copy size={10} />}
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-[#ff6482] transition-colors px-1.5 py-0.5 rounded cursor-pointer"
            title="Clear logs"
          >
            <Trash2 size={10} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-text-muted hover:text-text-secondary transition-colors p-0.5 cursor-pointer"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-2xs text-text-muted">
            <Loader2 size={13} className="animate-spin" />
            Loading logs...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-2xs text-[#ff375f]">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-2xs text-text-muted">
            No app logs match the current filter
          </div>
        ) : (
          <div className="font-mono text-2xs">
            {entries.map((entry, index) => {
              const ts = entry.timestamp || "";
              // Extract time portion (HH:MM:SS.mmm) from full timestamp for compact display
              const timeMatch = ts.match(/(\d{2}:\d{2}:\d{2}\.\d{3})/);
              const timeStr = timeMatch ? timeMatch[1] : ts.slice(0, 12) || "-";

              return (
                <div
                  key={`${entry.raw}:${index}`}
                  className={`grid grid-cols-[88px_48px_minmax(0,1fr)] gap-2 px-3 py-[5px] hover:bg-surface-2-40 items-start ${
                    entry.level.toUpperCase() === "ERROR"
                      ? "bg-[#ff375f]/[0.04] border-l-2 border-l-[#ff375f]/40"
                      : entry.level.toUpperCase() === "WARN"
                      ? "bg-[#ff9f0a]/[0.03] border-l-2 border-l-[#ff9f0a]/30"
                      : index % 2 === 0 ? "" : "bg-surface-1-20"
                  }`}
                >
                  <span className="truncate text-text-muted tabular-nums" title={ts}>
                    {timeStr}
                  </span>
                  <span className={`inline-flex h-4 items-center justify-center rounded-sm px-1 text-[8px] font-bold ${levelBadgeClass(entry.level)}`}>
                    {entry.level.toUpperCase().slice(0, 4)}
                  </span>
                  <div className="min-w-0 flex items-start gap-1">
                    {entry.target && (
                      <span className="shrink-0 inline-flex items-center h-4 rounded-sm bg-surface-3/60 px-1 text-[8px] font-semibold text-text-muted border border-border-30/50">
                        {entry.target.length > 18 ? entry.target.slice(0, 18) + "…" : entry.target}
                      </span>
                    )}
                    <span className="whitespace-pre-wrap break-words text-text-secondary leading-relaxed">{entry.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
