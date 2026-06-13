import { useState, useMemo, useRef, useEffect } from "react";
import {
  GitBranch,
  ChevronDown,
  RefreshCw,
  Download,
  Upload,
  Loader2,
  Search,
} from "lucide-react";
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
  currentBranch,
  branches,
  syncStatus,
  syncLoading,
  onFetch,
  onPull,
  onPush,
  onCheckoutBranch,
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
    () =>
      (branches || []).filter((branch) =>
        branch.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
      ),
    [branches, branchSearchQuery]
  );

  const groupedBranches = useMemo(() => {
    return filteredBranches.reduce(
      (groups, branchItem) => {
        if (branchItem.remote) {
          groups.remote.push(branchItem);
        } else {
          groups.local.push(branchItem);
        }
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
    <div className="flex flex-col gap-2">
      {/* Branch Switcher */}
      <div className="border border-border-40 bg-surface-1 rounded-lg overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-border-40">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Branch</span>
        </div>
        <div className="relative" ref={branchDropdownRef}>
          <button
            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
            className="w-full flex items-center justify-between gap-1.5 px-2.5 py-2 text-[11px] font-semibold text-text-primary hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <GitBranch size={12} className="text-accent shrink-0" />
              <span className="truncate">{currentBranch || "no branch"}</span>
              {syncStatus && (syncStatus.ahead > 0 || syncStatus.behind > 0) && (
                <span className="flex items-center gap-1 rounded-md bg-accent-10 px-1.5 py-0.5 text-[8px] font-bold text-accent">
                  {syncStatus.ahead > 0 && <span>↑{syncStatus.ahead}</span>}
                  {syncStatus.behind > 0 && <span>↓{syncStatus.behind}</span>}
                </span>
              )}
            </div>
            <ChevronDown size={10} className={`text-text-muted transition-transform ${branchDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {branchDropdownOpen && (
            <div className="border-t border-border-40">
              <div className="px-2.5 py-1.5 border-b border-border-40 flex items-center gap-1.5">
                <Search size={10} className="text-text-muted" />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={branchSearchQuery}
                  onChange={(e) => setBranchSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[10px] text-text-primary outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {localBranches.length > 0 && (
                  <div className="py-0.5">
                    <div className="px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-text-muted">
                      Local ({localBranches.length})
                    </div>
                    {localBranches.map((branchItem) => (
                      <button
                        key={branchItem.name}
                        onClick={() => handleCheckout(branchItem.name)}
                        disabled={checkingOutBranch !== null}
                        className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{branchItem.name}</span>
                        {checkingOutBranch === branchItem.name && (
                          <Loader2 size={9} className="animate-spin text-accent" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {groupedBranches.remote.length > 0 && (
                  <div className="py-0.5 border-t border-border-40">
                    <div className="px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-text-muted">
                      Remote ({groupedBranches.remote.length})
                    </div>
                    {groupedBranches.remote.slice(0, 5).map((branchItem) => (
                      <button
                        key={branchItem.name}
                        onClick={() => handleCheckout(branchItem.name)}
                        disabled={checkingOutBranch !== null}
                        className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between text-text-secondary"
                      >
                        <span className="truncate">{branchItem.name.replace("origin/", "")}</span>
                        {checkingOutBranch === branchItem.name && (
                          <Loader2 size={9} className="animate-spin text-accent" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {filteredBranches.length === 0 && (
                  <div className="px-2.5 py-2 text-[10px] text-text-muted italic">No branches found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Actions */}
      <div className="border border-border-40 bg-surface-1 rounded-lg overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-border-40">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Sync</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-2">
          <button
            onClick={onFetch}
            disabled={syncLoading !== null}
            className="h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50"
          >
            {syncLoading === "fetch" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            <span className="text-[8px] font-semibold">Fetch</span>
          </button>
          <button
            onClick={onPull}
            disabled={syncLoading !== null}
            className="h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 relative"
          >
            {syncLoading === "pull" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            <span className="text-[8px] font-semibold">Pull</span>
            {!!syncStatus?.behind && (
              <span className="absolute -right-1 -top-1 min-w-[14px] rounded-full bg-[#0a84ff] px-1 py-0.5 text-[7px] font-bold leading-none text-white shadow-sm">
                {syncStatus.behind}
              </span>
            )}
          </button>
          <button
            onClick={onPush}
            disabled={syncLoading !== null}
            className="h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 relative"
          >
            {syncLoading === "push" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            <span className="text-[8px] font-semibold">Push</span>
            {!!syncStatus?.ahead && (
              <span className="absolute -right-1 -top-1 min-w-[14px] rounded-full bg-[#30d158] px-1 py-0.5 text-[7px] font-bold leading-none text-white shadow-sm">
                {syncStatus.ahead}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
