import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, Search, Terminal, Trash2, X } from "lucide-react";
import { api, type AppLogEntry } from "@/api/tauri";
import { useLogsPanelStore } from "@/stores/logs";

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

  if (!isOpen) return null;

  return (
    <div className="border-t border-border-60 bg-surface-1-80 backdrop-blur-md flex flex-col" style={{ height: 240 }}>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-border-40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal size={12} className="text-accent shrink-0" />
          <span className="text-2xs font-semibold text-text-secondary shrink-0">Logs</span>
          <span className="text-3xs text-text-muted font-mono truncate min-w-0 select-all" title={logPath}>
            {logPath || "Log file path"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="h-6 rounded border border-border-40 bg-surface-2 px-1.5 text-2xs text-text-primary outline-none"
          >
            {["ALL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
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
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded disabled:opacity-50 cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={copyLogs}
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded cursor-pointer"
            title="Copy logs"
          >
            {copied ? <Check size={10} className="text-[#30d158]" /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-1 text-2xs text-text-muted hover:text-[#ff6482] transition-colors px-1.5 py-0.5 rounded cursor-pointer"
            title="Clear logs"
          >
            <Trash2 size={10} />
            Clear
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

      <div className="flex-1 overflow-y-auto">
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
          <div className="divide-y divide-border-20">
            {entries.map((entry, index) => (
              <div key={`${entry.raw}:${index}`} className="grid grid-cols-[112px_64px_minmax(0,1fr)] gap-2 px-3 py-1.5 text-2xs font-mono hover:bg-surface-2-40">
                <span className="truncate text-text-muted" title={entry.timestamp}>
                  {entry.timestamp || "-"}
                </span>
                <span className={`inline-flex h-5 items-center justify-center rounded border px-1.5 text-[9px] font-bold ${levelBadgeClass(entry.level)}`}>
                  {entry.level}
                </span>
                <div className="min-w-0">
                  {entry.target && <span className="mr-1 text-text-muted">[{entry.target}]</span>}
                  <span className="whitespace-pre-wrap break-words text-text-primary">{entry.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
