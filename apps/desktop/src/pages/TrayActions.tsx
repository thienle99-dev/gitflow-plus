import { useState, useMemo, useRef, useEffect } from "react";
import { GitBranch, ChevronDown, RefreshCw, Download, Upload, Loader2, Search, Rocket, Tag, Zap, Plus, Scissors, RotateCcw, SkipForward, X } from "lucide-react";
import type { Branch, SyncStatus, GitFlowConfig } from "@/api/tauri";

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
  gitflowConfig: GitFlowConfig | null;
  onGitFlowAction: (action: string) => void;
  onCreateBranch: (name: string) => void;
  onCreateTag: (name: string) => void;
  onCherryPick: (hash: string) => void;
  rebaseInProgress: boolean;
  onRebaseContinue: () => void;
  onRebaseSkip: () => void;
  onRebaseAbort: () => void;
}

export function TrayActions({
  currentBranch, branches, syncStatus, syncLoading,
  onFetch, onPull, onPush, onCheckoutBranch,
  gitflowConfig, onGitFlowAction, onCreateBranch, onCreateTag,
  onCherryPick, rebaseInProgress, onRebaseContinue, onRebaseSkip, onRebaseAbort,
}: TrayActionsProps) {
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [checkingOutBranch, setCheckingOutBranch] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [cherryPickHash, setCherryPickHash] = useState("");
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

  const isGitFlow = gitflowConfig?.initialized ?? false;
  const featureBranches = branches?.filter((b) => b.remote === null && b.name.startsWith(gitflowConfig?.feature_prefix || "feature/")) || [];
  const releaseBranches = branches?.filter((b) => b.remote === null && b.name.startsWith(gitflowConfig?.release_prefix || "release/")) || [];
  const hotfixBranches = branches?.filter((b) => b.remote === null && b.name.startsWith(gitflowConfig?.hotfix_prefix || "hotfix/")) || [];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Branch */}
      <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
        <div className="px-2 py-1 border-b border-border-40">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Branch</span>
        </div>
        <div className="relative" ref={branchDropdownRef}>
          <button onClick={() => setBranchDropdownOpen(!branchDropdownOpen)} className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-text-primary hover:bg-surface-2 transition-colors">
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
                <input type="text" placeholder="Search..." value={branchSearchQuery} onChange={(e) => setBranchSearchQuery(e.target.value)} className="w-full bg-transparent text-[9px] text-text-primary outline-none" autoFocus />
              </div>
              <div className="max-h-36 overflow-y-auto">
                {localBranches.length > 0 && (
                  <div className="py-0.5">
                    <div className="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-text-muted">Local ({localBranches.length})</div>
                    {localBranches.map((b) => (
                      <button key={b.name} onClick={() => handleCheckout(b.name)} disabled={checkingOutBranch !== null} className="w-full text-left px-2 py-1 text-[9px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between">
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
                      <button key={b.name} onClick={() => handleCheckout(b.name)} disabled={checkingOutBranch !== null} className="w-full text-left px-2 py-1 text-[9px] hover:bg-accent hover:text-accent-fg transition-colors flex items-center justify-between text-text-secondary">
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
      <div className="border border-border-40 bg-surface-1 rounded-md">
        <div className="px-2 py-1 border-b border-border-40">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Sync</span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1.5 relative">
          <button onClick={onFetch} disabled={syncLoading !== null} className="h-9 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50">
            {syncLoading === "fetch" ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            <span className="text-[7px] font-semibold">Fetch</span>
          </button>
          <button onClick={onPull} disabled={syncLoading !== null} className="h-9 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 relative">
            {syncLoading === "pull" ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
            <span className="text-[7px] font-semibold">Pull</span>
            {!!syncStatus?.behind && <span className="absolute right-0 top-0 min-w-[14px] h-3.5 rounded-full bg-[#0a84ff] px-1 text-[7px] font-bold leading-[14px] text-white shadow">{syncStatus.behind}</span>}
          </button>
          <button onClick={onPush} disabled={syncLoading !== null} className="h-9 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all disabled:opacity-50 relative">
            {syncLoading === "push" ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
            <span className="text-[7px] font-semibold">Push</span>
            {!!syncStatus?.ahead && <span className="absolute right-0 top-0 min-w-[14px] h-3.5 rounded-full bg-[#30d158] px-1 text-[7px] font-bold leading-[14px] text-white shadow">{syncStatus.ahead}</span>}
          </button>
        </div>
      </div>

      {/* GitFlow */}
      {isGitFlow && (
        <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
          <div className="px-2 py-1 border-b border-border-40">
            <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">GitFlow</span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1.5">
            <button onClick={() => onGitFlowAction("feature-start")} className="h-8 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all">
              <Rocket size={9} className="text-amber-400" />
              <span className="text-[7px] font-semibold">Feature</span>
            </button>
            <button onClick={() => onGitFlowAction(releaseBranches.length > 0 ? "release-finish" : "release-start")} className="h-8 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all relative">
              <Tag size={9} className="text-blue-400" />
              <span className="text-[7px] font-semibold">{releaseBranches.length > 0 ? "Finish" : "Release"}</span>
              {releaseBranches.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[13px] h-3.5 rounded-full bg-blue-500 px-0.5 text-[6px] font-bold leading-[14px] text-white">{releaseBranches.length}</span>}
            </button>
            <button onClick={() => onGitFlowAction(hotfixBranches.length > 0 ? "hotfix-finish" : "hotfix-start")} className="h-8 flex flex-col items-center justify-center gap-0.5 rounded border border-border-40 bg-surface-2 hover:bg-surface-3 text-text-primary transition-all relative">
              <Zap size={9} className="text-red-400" />
              <span className="text-[7px] font-semibold">{hotfixBranches.length > 0 ? "Finish" : "Hotfix"}</span>
              {hotfixBranches.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[13px] h-3.5 rounded-full bg-red-500 px-0.5 text-[6px] font-bold leading-[14px] text-white">{hotfixBranches.length}</span>}
            </button>
          </div>
        </div>
      )}

      {/* Quick Branch */}
      <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
        <div className="px-2 py-1 border-b border-border-40">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Quick Branch</span>
        </div>
        <div className="flex items-center gap-1 p-1.5">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="branch name..."
            className="flex-1 bg-transparent text-[9px] text-text-primary outline-none placeholder-text-muted px-1.5 py-1 rounded border border-border-40 focus:border-accent-60 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newBranchName.trim()) {
                onCreateBranch(newBranchName.trim());
                setNewBranchName("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newBranchName.trim()) {
                onCreateBranch(newBranchName.trim());
                setNewBranchName("");
              }
            }}
            disabled={!newBranchName.trim()}
            className="h-7 px-2 rounded bg-accent text-accent-fg text-[8px] font-bold transition-all disabled:opacity-40 flex items-center gap-0.5"
          >
            <Plus size={8} /> Create
          </button>
        </div>
      </div>

      {/* Quick Tag */}
      <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
        <div className="px-2 py-1 border-b border-border-40">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Quick Tag</span>
        </div>
        <div className="flex items-center gap-1 p-1.5">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="tag name..."
            className="flex-1 bg-transparent text-[9px] text-text-primary outline-none placeholder-text-muted px-1.5 py-1 rounded border border-border-40 focus:border-accent-60 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTagName.trim()) {
                onCreateTag(newTagName.trim());
                setNewTagName("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newTagName.trim()) {
                onCreateTag(newTagName.trim());
                setNewTagName("");
              }
            }}
            disabled={!newTagName.trim()}
            className="h-7 px-2 rounded bg-accent text-accent-fg text-[8px] font-bold transition-all disabled:opacity-40 flex items-center gap-0.5"
          >
            <Plus size={8} /> Tag
          </button>
        </div>
      </div>

      {/* Cherry-pick */}
      <div className="border border-border-40 bg-surface-1 rounded-md overflow-hidden">
        <div className="px-2 py-1 border-b border-border-40">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Cherry-pick</span>
        </div>
        <div className="flex items-center gap-1 p-1.5">
          <input
            type="text"
            value={cherryPickHash}
            onChange={(e) => setCherryPickHash(e.target.value)}
            placeholder="commit hash..."
            className="flex-1 bg-transparent text-[9px] text-text-primary font-mono outline-none placeholder-text-muted px-1.5 py-1 rounded border border-border-40 focus:border-accent-60 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && cherryPickHash.trim()) {
                onCherryPick(cherryPickHash.trim());
                setCherryPickHash("");
              }
            }}
          />
          <button
            onClick={() => {
              if (cherryPickHash.trim()) {
                onCherryPick(cherryPickHash.trim());
                setCherryPickHash("");
              }
            }}
            disabled={!cherryPickHash.trim()}
            className="h-7 px-2 rounded bg-accent text-accent-fg text-[8px] font-bold transition-all disabled:opacity-40 flex items-center gap-0.5"
          >
            <Scissors size={8} /> Pick
          </button>
        </div>
      </div>

      {/* Rebase Status */}
      {rebaseInProgress && (
        <div className="border border-[#ff9f0a]/30 bg-[#ff9f0a]/5 rounded-md overflow-hidden">
          <div className="px-2 py-1 border-b border-[#ff9f0a]/20">
            <span className="text-[8px] font-bold text-[#ff9f0a] uppercase tracking-wider">Rebase in Progress</span>
          </div>
          <div className="flex gap-1 p-1.5">
            <button onClick={onRebaseContinue} className="flex-1 h-7 text-[8px] font-semibold rounded border border-[#30d158]/30 bg-[#30d158]/5 text-[#30d158] hover:bg-[#30d158]/10 transition-all flex items-center justify-center gap-0.5">
              <RotateCcw size={8} /> Continue
            </button>
            <button onClick={onRebaseSkip} className="flex-1 h-7 text-[8px] font-semibold rounded border border-border-40 bg-surface-1 hover:bg-surface-2 text-text-primary transition-all flex items-center justify-center gap-0.5">
              <SkipForward size={8} /> Skip
            </button>
            <button onClick={onRebaseAbort} className="flex-1 h-7 text-[8px] font-semibold rounded border border-[#ff453a]/30 bg-[#ff453a]/5 text-[#ff453a] hover:bg-[#ff453a]/10 transition-all flex items-center justify-center gap-0.5">
              <X size={8} /> Abort
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
