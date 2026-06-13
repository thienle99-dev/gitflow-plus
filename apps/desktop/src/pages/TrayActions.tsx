import { useState, useMemo, useRef, useEffect } from "react";
import { GitBranch, ChevronDown, RefreshCw, Download, Upload, Loader2, Search } from "lucide-react";
import type { Branch, SyncStatus } from "@/api/tauri";

export interface TrayActionsProps {
  currentBranch: string;
  branches: Branch[];
  syncStatus: SyncStatus | undefined;
  syncLoading: string | null;
  refreshing: boolean;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onCheckoutBranch: (name: string) => void;
}

export function TrayActions({
  currentBranch, branches, syncStatus, syncLoading,
  onFetch, onPull, onPush, onCheckoutBranch,
}: TrayActionsProps) {
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [checkingOutBranch, setCheckingOutBranch] = useState<string | null>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBranches = useMemo(
    () => (branches || []).filter((b) => b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())),
    [branches, branchSearchQuery]
  );

  const groupedBranches = useMemo(() => {
    return filteredBranches.reduce(
      (groups, b) => {
        (b.remote ? groups.remote : groups.local).push(b);
        return groups;
      },
      { local: [] as Branch[], remote: [] as Branch[] }
    );
  }, [filteredBranches]);

  const handleCheckout = async (branchName: string) => {
    setCheckingOutBranch(branchName);
    try {
      await onCheckoutBranch(branchName);
      setBranchDropdownOpen(false);
      setBranchSearchQuery("");
    } finally {
      setCheckingOutBranch(null);
    }
  };

  const localBranches = groupedBranches.local.filter((b) => !b.current);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Branch */}
      <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
        <div className="px-2 py-1 border-b border-border-40">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Branch</span>
        </div>
        <div className="relative" ref={branchDropdownRef}>
          <button
            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
            className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-text-primary hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-1 min-w-0">
              <GitBranch size={11} className="text-accent shrink-0" />
              <span className="truncate">{currentBranch || "no branch"}</span>
              {syncStatus && (syncStatus.ahead > 0 || syncStatus.behind > 0) && (
                <span className="flex items-center gap-0.5 rounded bg-accent-10 px-1 py-0.5 text-[7px] font-bold text-accent">
                  {syncStatus.ahead > 0 && <span>↑{syncStatus.ahead}</span>}
                  {syncStatus.behind > 0 && <span>↓{syncStatus.behind}</span>}
                </span>
              )}
            </div>
            <ChevronDown size={9} className={`text-text-muted transition-transform ${branchDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {branchDropdownOpen && (
            <div className="border-t border-border-40">
              <div className="px-2 py-1 border-b border-border-40 flex items-center gap-1">
                <Search size={9} className="text-text-muted" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={branchSearchQuery}
                  onChange={(e) => setBranchSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[9px] text-text-primary outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-36 overflow-y-auto">
                {localBranches.length > 0 && (
                  <div className="py-0.5">
                    <div className="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-text-muted">Local ({localBranches.length})</div>
                    {localBranches.map((b) => (
                      <button
                        key={b.name}
                        onClick={() => handleCheckout(b.name)}
                        disabled={checkingOutBranch !== null}
                        className="w-full text-left px-2 py-1 text-[9px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{b.name}</span>
                        {checkingOutBranch === b.name && <Loader2 size={8} className="animate-spin text-accent" />}
                      </button>
                    ))}
                  </div>
                )}
                {groupedBranches.remote.length > 0 && (
                  <div className="py-0.5 border-t border-border-40">
                    <div className="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-text-muted">Remote ({groupedBranches.remote.length})</div>
                    {groupedBranches.remote.slice(0, 5).map((b) => (
                      <button
                        key={b.name}
                        onClick={() => handleCheckout(b.name)}
                        disabled={checkingOutBranch !== null}
                        className="w-full text-left px-2 py-1 text-[9px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between text-text-secondary"
                      >
                        <span className="truncate">{b.name.replace("origin/", "")}</span>
                        {checkingOutBranch === b.name && <Loader2 size={8} className="animate-spin text-accent" />}
                      </button>
                    ))}
                  </div>
                )}
                {filteredBranches.length === 0 && <div className="px-2 py-1.5 text-[9px] text-text-muted italic">No branches</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync */}
      <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
        <div className="px-2 py-1 border-b border-border-40">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Sync</span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1.5">
          <button
            onClick={onFetch}
            disabled={syncLoading !== null}
            className="h-9 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50"
          >
            {syncLoading === "fetch" ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            <span className="text-[7px] font-semibold">Fetch</span>
          </button>
          <button
            onClick={onPull}
            disabled={syncLoading !== null}
            className="h-9 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 relative"
          >
            {syncLoading === "pull" ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
            <span className="text-[7px] font-semibold">Pull</span>
            {!!syncStatus?.behind && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[13px] rounded-full bg-[#0a84ff] px-0.5 py-px text-[6px] font-bold leading-none text-white">{syncStatus.behind}</span>
            )}
          </button>
          <button
            onClick={onPush}
            disabled={syncLoading !== null}
            className="h-9 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 relative"
          >
            {syncLoading === "push" ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
            <span className="text-[7px] font-semibold">Push</span>
            {!!syncStatus?.ahead && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[13px] rounded-full bg-[#30d158] px-0.5 py-px text-[6px] font-bold leading-none text-white">{syncStatus.ahead}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
