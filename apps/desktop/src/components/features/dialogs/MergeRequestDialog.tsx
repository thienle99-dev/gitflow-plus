import { useState, useEffect, useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useRepoInfo } from "@/queries/useGitLog";
import { api } from "@/api/tauri";
import { useQueryClient } from "@tanstack/react-query";
import {
  X,
  GitPullRequest,
  RefreshCw,
  GitBranch,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  Clock,
  ArrowRight,
  Settings,
} from "lucide-react";
import {
  fetchMergeRequests,
  fetchGitHubCheckRuns,
  parseRemoteUrl,
  type MergeRequest,
  type CheckRun,
} from "@/api/gitHost";

interface MergeRequestDialogProps {
  onClose: () => void;
}

export default function MergeRequestDialog({ onClose }: MergeRequestDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: repoInfo } = useRepoInfo(repoPath);
  const selectRef = useRepoStore((s) => s.selectRef);
  const queryClient = useQueryClient();
  const openSettings = () => {
    onClose();
    useUIStore.getState().openDialog("settings");
  };

  const remoteUrl = repoInfo?.remote;
  const remoteInfo = useMemo(() => (remoteUrl ? parseRemoteUrl(remoteUrl) : null), [remoteUrl]);

  // States
  const [mrs, setMrs] = useState<MergeRequest[]>([]);
  const [selectedMr, setSelectedMr] = useState<MergeRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<"open" | "merged" | "closed">("open");

  // GitHub detailed checks
  const [checkRuns, setCheckRuns] = useState<CheckRun[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);

  // Local actions
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const hasToken = useMemo(() => {
    if (!remoteInfo?.provider) return false;
    return remoteInfo.provider === "github"
      ? !!localStorage.getItem("gitflowGithubToken")
      : !!localStorage.getItem("gitflowGitlabToken");
  }, [remoteInfo]);

  const loadMRs = async () => {
    if (!remoteUrl) return;
    setLoading(true);
    setError(null);
    setSelectedMr(null);
    try {
      const list = await fetchMergeRequests(remoteUrl);
      setMrs(list);
      if (list.length > 0) {
        // Auto-select first MR matching filter
        const matched = list.find((m) => m.state === filterState);
        if (matched) setSelectedMr(matched);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // Load MRs on mount or remote info change
  useEffect(() => {
    if (remoteUrl && hasToken) {
      loadMRs();
    }
  }, [remoteUrl, hasToken]);

  // Handle MR selection change
  useEffect(() => {
    if (selectedMr && remoteInfo?.provider === "github" && selectedMr.sha) {
      setLoadingChecks(true);
      fetchGitHubCheckRuns(remoteUrl!, selectedMr.sha)
        .then((runs) => setCheckRuns(runs))
        .catch(console.error)
        .finally(() => setLoadingChecks(false));
    } else {
      setCheckRuns([]);
    }
    setCheckoutSuccess(null);
    setCheckoutError(null);
  }, [selectedMr, remoteInfo]);

  // Checkout local branch
  const handleCheckoutBranch = async () => {
    if (!repoPath || !selectedMr) return;
    setCheckoutLoading(true);
    setCheckoutSuccess(null);
    setCheckoutError(null);

    const sourceBranch = selectedMr.sourceBranch;

    try {
      // First try switching directly to local branch
      await api.branches.checkout(repoPath, sourceBranch);
      selectRef(sourceBranch);
      setCheckoutSuccess(`Successfully checked out local branch "${sourceBranch}"`);
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    } catch (localErr: any) {
      // If local branch fails, checkout remote tracking branch
      const trackingName = `origin/${sourceBranch}`;
      try {
        await api.branches.checkout(repoPath, trackingName);
        selectRef(sourceBranch);
        setCheckoutSuccess(`Successfully checked out and tracking remote branch "${sourceBranch}"`);
        queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      } catch (remoteErr: any) {
        setCheckoutError(
          localErr.message || remoteErr.message || `Failed to checkout branch "${sourceBranch}"`
        );
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Filtered List
  const filteredMrs = useMemo(() => {
    return mrs.filter((mr) => mr.state === filterState);
  }, [mrs, filterState]);

  // Keep selection matching the filter
  useEffect(() => {
    if (filteredMrs.length > 0) {
      if (!filteredMrs.find((m) => m.id === selectedMr?.id)) {
        setSelectedMr(filteredMrs[0]);
      }
    } else {
      setSelectedMr(null);
    }
  }, [filteredMrs]);

  return (
    <div className="flex flex-row h-[520px] w-[760px] bg-surface-0 overflow-hidden select-none">
      {/* Sidebar - MR List (280px) */}
      <div className="w-[280px] shrink-0 border-r border-border-60 bg-surface-1 flex flex-col h-full">
        {/* Header */}
        <div className="px-3.5 py-3 border-b border-border-60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitPullRequest size={14} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary">Merge Requests</span>
          </div>
          {remoteUrl && hasToken && (
            <button
              onClick={loadMRs}
              disabled={loading}
              className="p-1 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="px-2 py-1.5 border-b border-border-60 bg-surface-1/40 flex items-center gap-1 shrink-0">
          {(["open", "merged", "closed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterState(tab)}
              className={`flex-1 py-1 text-[10px] font-bold rounded capitalize border border-transparent transition-all cursor-pointer ${
                filterState === tab
                  ? "bg-surface-2 text-text-primary shadow-2xs border-border-40 font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {loading && mrs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 space-y-2 text-text-muted">
              <Loader2 size={16} className="animate-spin text-accent" />
              <span className="text-3xs font-medium">Fetching merge requests...</span>
            </div>
          ) : !remoteUrl ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-2 text-text-muted">
              <AlertCircle size={16} />
              <span className="text-3xs font-semibold">No remote detected</span>
            </div>
          ) : !hasToken ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-3">
              <AlertCircle size={16} className="text-text-muted mx-auto" />
              <div className="space-y-1">
                <span className="block text-3xs font-bold text-text-primary">Credentials Required</span>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Please configure your Personal Access Token (PAT) for {remoteInfo?.provider || "Git host"} in Settings.
                </p>
              </div>
              <button
                onClick={openSettings}
                className="h-6 px-3 bg-accent text-accent-fg text-3xs font-bold rounded-mac hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <Settings size={10} />
                <span>Configure Integrations</span>
              </button>
            </div>
          ) : filteredMrs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-text-muted space-y-1">
              <GitPullRequest size={16} className="opacity-40" />
              <span className="text-3xs font-medium">No {filterState} merge requests found</span>
            </div>
          ) : (
            filteredMrs.map((mr) => {
              const isSelected = selectedMr?.id === mr.id;
              return (
                <button
                  key={mr.id}
                  onClick={() => setSelectedMr(mr)}
                  className={`w-full p-2.5 rounded-mac border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-accent/10 border-accent/30 shadow-2xs"
                      : "bg-surface-1/40 hover:bg-surface-2 border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-3xs font-bold font-mono text-text-muted shrink-0">
                      #{mr.iid}
                    </span>
                    <span className="text-2xs font-semibold text-text-primary truncate flex-1 leading-snug">
                      {mr.title}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono truncate max-w-[180px]">
                      <span className="truncate bg-surface-2 px-1 py-0.5 rounded-[3px]">
                        {mr.sourceBranch}
                      </span>
                      <ArrowRight size={8} className="shrink-0" />
                      <span className="truncate text-text-secondary bg-surface-2 px-1 py-0.5 rounded-[3px]">
                        {mr.targetBranch}
                      </span>
                    </div>

                    {/* Pipeline Status Dot */}
                    {mr.pipelineStatus && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          mr.pipelineStatus === "success"
                            ? "bg-[#30d158]"
                            : mr.pipelineStatus === "failed"
                            ? "bg-[#ff453a]"
                            : mr.pipelineStatus === "running"
                            ? "bg-[#0a84ff] animate-pulse"
                            : "bg-text-muted/40"
                        }`}
                        title={`Pipeline: ${mr.pipelineStatus}`}
                      />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Panel - MR Details */}
      <div className="flex-1 flex flex-col h-full bg-surface-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-60 flex items-center justify-between shrink-0 bg-surface-1/10">
          <span className="text-xs font-semibold text-text-secondary">MR Details</span>
          <button
            onClick={onClose}
            className="p-1 rounded-mac hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedMr ? (
            <>
              {/* Title & Status Badge */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      selectedMr.state === "open"
                        ? "bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/20"
                        : selectedMr.state === "merged"
                        ? "bg-[#bf5af2]/15 text-[#bf5af2] border border-[#bf5af2]/20"
                        : "bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/20"
                    }`}
                  >
                    {selectedMr.state}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary leading-snug">
                    {selectedMr.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-2xs text-text-muted">
                  {selectedMr.authorAvatar ? (
                    <img
                      src={selectedMr.authorAvatar}
                      alt={selectedMr.author}
                      className="w-4 h-4 rounded-full border border-border-40 shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-surface-3 text-text-primary flex items-center justify-center text-[8px] font-bold uppercase border border-border-40 shrink-0">
                      {selectedMr.author.slice(0, 2)}
                    </div>
                  )}
                  <span>
                    Created by <strong className="text-text-secondary">{selectedMr.author}</strong>
                  </span>
                </div>
              </div>

              {/* Branch Connection Card */}
              <div className="flex items-center justify-between p-3 bg-surface-1/40 border border-border-40 rounded-mac">
                <div className="flex items-center gap-2 text-xs">
                  <GitBranch size={13} className="text-text-muted shrink-0" />
                  <span className="font-mono font-semibold text-text-primary bg-surface-2 px-1.5 py-0.5 rounded-[4px]">
                    {selectedMr.sourceBranch}
                  </span>
                  <span className="text-text-muted">merges into</span>
                  <span className="font-mono font-semibold text-text-secondary bg-surface-2 px-1.5 py-0.5 rounded-[4px]">
                    {selectedMr.targetBranch}
                  </span>
                </div>

                <button
                  onClick={handleCheckoutBranch}
                  disabled={checkoutLoading}
                  className="h-7 px-3 bg-accent text-accent-fg text-2xs font-bold rounded-mac hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {checkoutLoading ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <GitBranch size={10} />
                  )}
                  <span>Checkout Branch</span>
                </button>
              </div>

              {/* Success/Error Alerts */}
              {checkoutSuccess && (
                <div className="p-3 bg-[#30d158]/10 border border-[#30d158]/20 rounded-mac text-[#30d158] text-2xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{checkoutSuccess}</span>
                </div>
              )}
              {checkoutError && (
                <div className="p-3 bg-[#ff453a]/10 border border-[#ff453a]/20 rounded-mac text-[#ff453a] text-2xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                  <XCircle size={12} className="shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Description */}
              {selectedMr.description && (
                <div className="space-y-1.5 border-t border-border-60 pt-3">
                  <h4 className="text-2xs font-bold text-text-muted uppercase tracking-wider">Description</h4>
                  <div className="text-2xs text-text-secondary leading-relaxed bg-surface-1/20 border border-border-40 rounded-mac p-3 max-h-[120px] overflow-y-auto font-normal break-words whitespace-pre-line">
                    {selectedMr.description}
                  </div>
                </div>
              )}

              {/* Checks & Pipelines Section */}
              <div className="space-y-2 border-t border-border-60 pt-3">
                <h4 className="text-2xs font-bold text-text-muted uppercase tracking-wider">CI/CD Status</h4>
                
                {/* GitLab Pipeline Info */}
                {remoteInfo?.provider === "gitlab" && (
                  <div className="flex items-center gap-2 p-2.5 bg-surface-1/20 border border-border-40 rounded-mac">
                    {selectedMr.pipelineStatus === "success" ? (
                      <CheckCircle2 size={14} className="text-[#30d158]" />
                    ) : selectedMr.pipelineStatus === "failed" ? (
                      <XCircle size={14} className="text-[#ff453a]" />
                    ) : selectedMr.pipelineStatus === "running" ? (
                      <Loader2 size={14} className="text-[#0a84ff] animate-spin" />
                    ) : (
                      <Clock size={14} className="text-text-muted" />
                    )}
                    <span className="text-2xs text-text-secondary">
                      Pipeline state:{" "}
                      <strong className="text-text-primary capitalize">
                        {selectedMr.pipelineStatus || "unknown"}
                      </strong>
                    </span>
                  </div>
                )}

                {/* GitHub Checks Info */}
                {remoteInfo?.provider === "github" && (
                  <div className="space-y-1.5">
                    {loadingChecks ? (
                      <div className="flex items-center gap-2 text-text-muted p-2">
                        <Loader2 size={10} className="animate-spin text-accent" />
                        <span className="text-[10px]">Loading check runs...</span>
                      </div>
                    ) : checkRuns.length === 0 ? (
                      <div className="text-[10px] text-text-muted italic px-1">
                        No check runs reported for this commit.
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-[140px] overflow-y-auto border border-border-40 rounded-mac p-1">
                        {checkRuns.map((run) => (
                          <div
                            key={run.name}
                            className="flex items-center justify-between p-1.5 hover:bg-surface-2 rounded transition-colors text-3xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {run.conclusion === "success" ? (
                                <CheckCircle2 size={11} className="text-[#30d158]" />
                              ) : run.conclusion === "failure" ? (
                                <XCircle size={11} className="text-[#ff453a]" />
                              ) : (
                                <Loader2 size={11} className="text-[#0a84ff] animate-spin" />
                              )}
                              <span className="text-text-primary font-medium truncate">
                                {run.name}
                              </span>
                            </div>
                            <a
                              href={run.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline flex items-center gap-0.5 font-bold"
                            >
                              <span>Details</span>
                              <ExternalLink size={8} />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-text-muted p-4 space-y-2">
              <GitPullRequest size={24} className="opacity-40" />
              <span className="text-xs font-semibold">Select a Merge Request to view details</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {selectedMr && (
          <div className="px-4 py-3 border-t border-border-60 bg-surface-1 flex justify-end shrink-0">
            <a
              href={selectedMr.webUrl}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-4 bg-surface-2 hover:bg-surface-3 text-text-primary text-xs font-semibold rounded-mac border border-border-40 hover:border-border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>View on Web</span>
              <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
