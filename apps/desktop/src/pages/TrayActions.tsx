import { useState, useMemo, useRef, useEffect } from "react";
import {
  GitBranch,
  ChevronUp,
  RefreshCw,
  Download,
  Upload,
  Loader2,
  Check,
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
  refreshing,
  onFetch,
  onPull,
  onPush,
  onCheckoutBranch,
}: TrayActionsProps) {
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [checkingOutBranch, setCheckingOutBranch] = useState<string | null>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
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
      {
        local: [] as Branch[],
        remote: [] as Branch[],
      }
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

  const renderBranchItem = (branchItem: Branch) => (
    <button
      key={`${branchItem.remote || "local"}:${branchItem.name}`}
      onClick={() => handleCheckout(branchItem.name)}
      disabled={checkingOutBranch !== null}
      className={`w-full text-left px-3 py-1.5 text-[9px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between gap-1.5 ${
        branchItem.current
          ? "bg-surface-2 font-semibold text-accent"
          : "text-text-secondary"
      }`}
    >
      <span className="truncate flex-1">{branchItem.name}</span>
      {checkingOutBranch === branchItem.name ? (
        <Loader2 size={9} className="animate-spin text-accent" />
      ) : branchItem.current ? (
        <Check size={9} className="text-accent" />
      ) : null}
    </button>
  );

  const renderBranchGroup = (label: string, branchItems: Branch[]) => {
    if (branchItems.length === 0) return null;
    return (
      <div className="py-1">
        <div className="px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-text-muted-80 flex items-center justify-between">
          <span>{label}</span>
          <span>{branchItems.length}</span>
        </div>
        {branchItems.map(renderBranchItem)}
      </div>
    );
  };

  return (
    <div className="h-12 border-t border-border-60 bg-surface-1 flex items-center justify-between px-3.5 shrink-0 relative">
      {/* Branch Switcher */}
      <div className="relative min-w-0" ref={branchDropdownRef}>
        <button
          onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-2 text-[10px] font-semibold text-text-primary transition-all max-w-[145px]"
        >
          <GitBranch size={11} className="text-accent shrink-0" />
          <span className="truncate">{currentBranch || "no branch"}</span>
          {syncStatus && (syncStatus.ahead > 0 || syncStatus.behind > 0) && (
            <span
              className="flex items-center gap-1 rounded bg-accent-10 px-1 py-0.5 text-[8px] font-bold text-accent shrink-0"
              title={`${syncStatus.ahead} ahead, ${syncStatus.behind} behind`}
            >
              {syncStatus.ahead > 0 && <span>↑{syncStatus.ahead}</span>}
              {syncStatus.behind > 0 && <span>↓{syncStatus.behind}</span>}
            </span>
          )}
          <ChevronUp size={10} className="text-text-muted shrink-0" />
        </button>

        {branchDropdownOpen && (
          <div className="absolute left-0 bottom-full mb-1 w-56 bg-surface-1 border border-border-60 rounded-mac shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <div className="px-2 pb-1.5 border-b border-border-40 flex items-center gap-1.5">
              <Search size={10} className="text-text-muted" />
              <input
                type="text"
                placeholder="Search branches..."
                value={branchSearchQuery}
                onChange={(e) => setBranchSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[9px] text-text-primary outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto mt-1">
              {filteredBranches.length === 0 ? (
                <div className="px-3 py-2 text-[9px] text-text-muted italic">
                  No branches found
                </div>
              ) : (
                <>
                  {renderBranchGroup("Local", groupedBranches.local)}
                  {renderBranchGroup("Remote", groupedBranches.remote)}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fetch / Pull / Push */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onFetch}
          disabled={syncLoading !== null}
          className="h-8 w-8 bg-surface-2 hover:bg-surface-3 text-text-primary rounded border border-border-40 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          title="Fetch remote changes"
        >
          {syncLoading === "fetch" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
        </button>
        <button
          onClick={onPull}
          disabled={syncLoading !== null}
          className="relative h-8 w-8 bg-surface-2 hover:bg-surface-3 text-text-primary rounded border border-border-40 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          title="Pull remote changes"
        >
          {syncLoading === "pull" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          {!!syncStatus?.behind && (
            <span className="absolute -right-1 -top-1 min-w-[15px] rounded-[4px] bg-[#0a84ff] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-sm">
              {syncStatus.behind}
            </span>
          )}
        </button>
        <button
          onClick={onPush}
          disabled={syncLoading !== null}
          className="relative h-8 w-8 bg-surface-2 hover:bg-surface-3 text-text-primary rounded border border-border-40 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          title="Push local commits"
        >
          {syncLoading === "push" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          {!!syncStatus?.ahead && (
            <span className="absolute -right-1 -top-1 min-w-[15px] rounded-[4px] bg-[#30d158] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-sm">
              {syncStatus.ahead}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
