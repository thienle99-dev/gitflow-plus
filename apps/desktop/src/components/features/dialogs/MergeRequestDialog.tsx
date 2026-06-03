import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  FileText,
  Loader2,
  Clock,
  ArrowRight,
  Sparkles,
  MessageSquareText,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  fetchMergeRequests,
  fetchMergeRequestChanges,
  fetchGitHubCheckRuns,
  parseRemoteUrl,
  type MergeRequest,
  type MergeRequestFileChange,
  type CheckRun,
} from "@/api/gitHost";
import { useAIMergeRequestExplain, useAIMergeRequestReview } from "@/queries/useAI";
import { parseDiff, type DiffHunk, type DiffLine } from "@/lib/parse-diff";

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
    useUIStore.getState().openDialog("accounts-settings");
  };
  const aiExplain = useAIMergeRequestExplain();
  const aiReview = useAIMergeRequestReview();

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
  const [changedFiles, setChangedFiles] = useState<MergeRequestFileChange[]>([]);
  const [selectedChangedFile, setSelectedChangedFile] = useState<MergeRequestFileChange | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiReviewResult, setAiReviewResult] = useState("");

  // Local actions
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);



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
    if (remoteUrl) {
      loadMRs();
    }
  }, [remoteUrl]);

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
    setAiExplanation("");
    setAiReviewResult("");
    aiExplain.reset();
    aiReview.reset();
    setSelectedChangedFile(null);
  }, [selectedMr, remoteInfo]);

  useEffect(() => {
    if (!selectedMr || !remoteUrl) {
      setChangedFiles([]);
      setSelectedChangedFile(null);
      setFilesError(null);
      return;
    }

    setLoadingFiles(true);
    setFilesError(null);
    fetchMergeRequestChanges(remoteUrl, selectedMr)
      .then((files) => {
        setChangedFiles(files);
        setSelectedChangedFile(files[0] ?? null);
      })
      .catch((error) => {
        setChangedFiles([]);
        setSelectedChangedFile(null);
        setFilesError(error.message || String(error));
      })
      .finally(() => setLoadingFiles(false));
  }, [selectedMr, remoteUrl]);

  const handleExplainMergeRequest = async () => {
    if (!selectedMr) return;
    try {
      const explanation = await aiExplain.mutateAsync({
        mergeRequest: selectedMr,
        files: changedFiles,
        repoPath: repoPath ?? undefined,
      });
      setAiExplanation(explanation);
    } catch {
      setAiExplanation("");
    }
  };

  const handleReviewMergeRequest = async () => {
    if (!selectedMr) return;
    try {
      const review = await aiReview.mutateAsync({
        mergeRequest: selectedMr,
        files: changedFiles,
        repoPath: repoPath ?? undefined,
      });
      setAiReviewResult(review);
    } catch {
      setAiReviewResult("");
    }
  };

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

  const selectedChangedFileIndex = useMemo(() => {
    if (!selectedChangedFile) return -1;
    return changedFiles.findIndex(
      (file) =>
        file.path === selectedChangedFile.path &&
        file.oldPath === selectedChangedFile.oldPath &&
        file.status === selectedChangedFile.status
    );
  }, [changedFiles, selectedChangedFile]);

  const selectAdjacentChangedFile = useCallback((direction: -1 | 1) => {
    if (changedFiles.length === 0) return;
    const currentIndex = selectedChangedFileIndex >= 0 ? selectedChangedFileIndex : 0;
    const nextIndex = (currentIndex + direction + changedFiles.length) % changedFiles.length;
    setSelectedChangedFile(changedFiles[nextIndex]);
  }, [changedFiles, selectedChangedFileIndex]);

  // Keyboard navigation: j/k or ArrowDown/ArrowUp to switch files
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when focus is within the dialog
      if (!el.contains(document.activeElement) && document.activeElement !== el) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        selectAdjacentChangedFile(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        selectAdjacentChangedFile(-1);
      }
    };
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [selectAdjacentChangedFile]);

  // Parse the selected file's patch into structured hunks with line numbers
  const parsedHunks = useMemo(() => {
    if (!selectedChangedFile?.patch) return [];
    return parseDiff(selectedChangedFile.patch);
  }, [selectedChangedFile?.patch]);

  // Hunk count for the selected file
  const hunkCount = parsedHunks.length;

  const getDiffLineClass = (line: string) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      return "bg-[#30d158]/10 text-[#7ee787]";
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      return "bg-[#ff453a]/10 text-[#ff9b95]";
    }
    if (line.startsWith("@@")) {
      return "bg-accent-10 text-accent";
    }
    return "text-text-secondary";
  };

  // Render text with clickable backtick-wrapped file paths
  const renderTextWithFileLinks = (text: string) => {
    const parts = text.split(/(`[^`]+\.[a-zA-Z0-9]+`)/g);
    return parts.map((part, i) => {
      const fileMatch = part.match(/^`([^`]+\.[a-zA-Z0-9]+)`$/);
      if (fileMatch) {
        const filePath = fileMatch[1];
        return (
          <button
            key={i}
            type="button"
            className="inline font-mono text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent cursor-pointer bg-accent-10 px-0.5 rounded-[2px]"
            onClick={() => {
              // Find the matching changed file and select it
              const match = changedFiles.find(
                (f) => f.path === filePath || f.path.endsWith(`/${filePath}`) || f.path.split("/").pop() === filePath
              );
              if (match) setSelectedChangedFile(match);
            }}
            title={`Jump to ${filePath}`}
          >
            {filePath}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderAIText = (text: string) => {
    return text.split("\n").map((line, index) => {
      const trimmed = line.trim();
      const isFinding =
        /severity|risk|bug|security|regression|request changes|blocking/i.test(trimmed);
      const isPositive =
        /no blocking|approve|looks good|no concrete issues/i.test(trimmed) && !/request changes/i.test(trimmed);

      if (!trimmed) {
        return <div key={index} className="h-2" />;
      }
      if (trimmed.startsWith("### ")) {
        return (
          <div key={index} className="pt-2 text-xs font-bold text-text-primary">
            {trimmed.slice(4)}
          </div>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <div key={index} className="pt-2 text-xs font-bold text-accent">
            {trimmed.slice(3)}
          </div>
        );
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <div
            key={index}
            className={`rounded-mac border px-2.5 py-1.5 ${
              isFinding
                ? "border-[#ff9f0a]/25 bg-[#ff9f0a]/10 text-text-primary"
                : isPositive
                  ? "border-[#30d158]/25 bg-[#30d158]/10 text-text-primary"
                  : "border-border-40 bg-surface-0/60 text-text-secondary"
            }`}
          >
            <span className="mr-1 text-text-muted">•</span>
            {renderTextWithFileLinks(trimmed.slice(2))}
          </div>
        );
      }
      return (
        <p key={index} className="text-text-secondary">
          {renderTextWithFileLinks(trimmed)}
        </p>
      );
    });
  };

  const aiPanelKind = aiReviewResult ? "review" : aiExplanation ? "explain" : null;

  // Parse AI review findings to extract file references for highlighting
  interface AIFinding {
    filePath: string;
    severity: "high" | "medium" | "low" | "info";
    line: string;
  }
  const aiFindings = useMemo<AIFinding[]>(() => {
    if (!aiReviewResult) return [];
    const findings: AIFinding[] = [];
    const lines = aiReviewResult.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("- ") && !trimmed.startsWith("* ")) continue;
      // Extract backtick-wrapped file paths
      const fileMatches = trimmed.matchAll(/`([^`]+\.[a-zA-Z0-9]+)`/g);
      for (const match of fileMatches) {
        const filePath = match[1];
        let severity: AIFinding["severity"] = "info";
        if (/critical|high|severe|blocking|security|vulnerability/i.test(trimmed)) severity = "high";
        else if (/medium|warning|caution|risk|regression/i.test(trimmed)) severity = "medium";
        else if (/low|minor|suggestion|nit|improvement/i.test(trimmed)) severity = "low";
        findings.push({ filePath, severity, line: trimmed });
      }
    }
    return findings;
  }, [aiReviewResult]);

  // Map of filePath -> findings for quick lookup
  const findingsByFile = useMemo(() => {
    const map = new Map<string, AIFinding[]>();
    for (const f of aiFindings) {
      const existing = map.get(f.filePath) || [];
      existing.push(f);
      map.set(f.filePath, existing);
    }
    return map;
  }, [aiFindings]);

  // Findings for the currently selected changed file
  const selectedFileFindings = useMemo(() => {
    if (!selectedChangedFile) return [];
    // Match by exact path or filename
    const byPath = findingsByFile.get(selectedChangedFile.path);
    if (byPath) return byPath;
    const fileName = selectedChangedFile.path.split("/").pop() || "";
    return findingsByFile.get(fileName) || [];
  }, [selectedChangedFile, findingsByFile]);

  const providerReviewUrl = useMemo(() => {
    if (!selectedMr) return "";
    if (remoteInfo?.provider === "github") return `${selectedMr.webUrl}/files`;
    if (remoteInfo?.provider === "gitlab") return `${selectedMr.webUrl}/diffs`;
    return selectedMr.webUrl;
  }, [selectedMr, remoteInfo]);

  const isGithubRateLimitError = !!error && remoteInfo?.provider === "github" && /403|rate limit/i.test(error);
  const errorMessage = isGithubRateLimitError
    ? "GitHub rate limit reached for unauthenticated requests. Add a GitHub token in Accounts, then retry."
    : error;

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
    <div ref={containerRef} tabIndex={-1} className="flex h-full w-full flex-row bg-surface-0 overflow-hidden select-none outline-none">
      {/* Sidebar - MR List */}
      <div className="w-[35%] min-w-[240px] max-w-[360px] shrink-0 border-r border-border-60 bg-surface-1 flex flex-col h-full">
        {/* Header */}
        <div className="px-3.5 py-3 border-b border-border-60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitPullRequest size={14} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary">Merge Requests</span>
          </div>
          {remoteUrl && (
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
              className={`flex-1 py-1 text-[10px] font-bold rounded capitalize border border-transparent transition-all cursor-pointer flex items-center justify-center gap-1 ${
                filterState === tab
                  ? `bg-surface-2 text-text-primary shadow-2xs border-border-40 font-bold ${
                      tab === "open" ? "ring-1 ring-[#30d158]/30" : tab === "merged" ? "ring-1 ring-[#bf5af2]/30" : "ring-1 ring-[#ff453a]/30"
                    }`
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  tab === "open"
                    ? "bg-[#30d158]"
                    : tab === "merged"
                    ? "bg-[#bf5af2]"
                    : "bg-[#ff453a]"
                }`}
              />
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

          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-2 text-text-muted">
              <AlertCircle size={18} className="text-[#ff453a]" />
              <span className="text-3xs font-semibold text-text-primary">Could not load merge requests</span>
              <span className="max-w-[220px] text-[10px] leading-relaxed">{errorMessage}</span>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={loadMRs}
                  className="h-7 px-3 rounded bg-accent text-accent-fg text-[10px] font-bold hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
                <button
                  onClick={openSettings}
                  className="h-7 px-3 rounded border border-border-40 bg-surface-2 text-text-primary text-[10px] font-bold hover:bg-surface-3 transition-colors"
                >
                  {isGithubRateLimitError ? "Add token" : "Settings"}
                </button>
              </div>
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
                      ? "bg-accent-10 border-accent-30 shadow-2xs"
                      : "bg-surface-1/40 hover:bg-surface-2 border-transparent"
                  }`}
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: isSelected
                      ? undefined
                      : mr.state === "open"
                      ? "#30d158"
                      : mr.state === "merged"
                      ? "#bf5af2"
                      : "#ff453a",
                  }}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span
                      className={`text-3xs font-bold font-mono shrink-0 ${
                        mr.state === "open"
                          ? "text-[#30d158]"
                          : mr.state === "merged"
                          ? "text-[#bf5af2]"
                          : "text-[#ff453a]"
                      }`}
                    >
                      #{mr.iid}
                    </span>
                    <span className="text-2xs font-semibold text-text-primary truncate flex-1 leading-snug">
                      {mr.title}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5 gap-1">
                  <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono min-w-0 flex-1 overflow-hidden">
                    <span className="truncate bg-[#30d158]/10 text-[#30d158] px-1 py-0.5 rounded-[3px] border border-[#30d158]/15 max-w-[45%]">
                      {mr.sourceBranch}
                    </span>
                    <ArrowRight size={8} className="shrink-0 text-accent" />
                    <span className="truncate bg-[#0a84ff]/10 text-[#0a84ff] px-1 py-0.5 rounded-[3px] border border-[#0a84ff]/15 max-w-[45%]">
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
      <div className="flex-1 min-w-0 flex flex-col h-full bg-surface-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-60 flex items-center justify-between shrink-0 bg-surface-1/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">MR Details</span>
            {selectedMr && (
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                #{selectedMr.iid}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-mac hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {selectedMr ? (
            <>
              {/* Title & Status Badge */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 min-w-0">
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
                  <h3 className="text-base font-semibold text-text-primary leading-snug min-w-0 break-words">
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
              <div className="flex flex-row items-center justify-between gap-3 p-3 bg-surface-1/40 border border-border-40 rounded-mac">
                <div className="min-w-0 flex items-center gap-2 text-xs flex-1 overflow-hidden">
                  <GitBranch size={13} className="text-accent shrink-0" />
                  <span className="min-w-0 max-w-[50%] truncate font-mono font-semibold bg-[#30d158]/10 text-[#30d158] px-1.5 py-0.5 rounded-[4px] border border-[#30d158]/20">
                    {selectedMr.sourceBranch}
                  </span>
                  <ArrowRight size={12} className="text-accent shrink-0" />
                  <span className="min-w-0 max-w-[35%] truncate font-mono font-semibold bg-[#0a84ff]/10 text-[#0a84ff] px-1.5 py-0.5 rounded-[4px] border border-[#0a84ff]/20">
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

              {/* Changed Files */}
              <div className="space-y-2 border-t border-border-60 pt-3">
                <div className="flex flex-row items-center justify-between gap-2">
                  <h4 className="text-2xs font-bold text-[#ff9f0a] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={10} className="text-[#ff9f0a]" />
                    Changed Files {changedFiles.length > 0 ? `(${changedFiles.length})` : ""}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={handleExplainMergeRequest}
                      disabled={aiExplain.isPending || loadingFiles || !selectedMr}
                      className={`h-8 px-3 rounded-mac border text-[11px] font-bold transition-colors flex items-center gap-1.5 disabled:opacity-45 ${
                        aiExplanation && !aiReviewResult
                          ? "border-accent-30 bg-accent-10 text-accent"
                          : "border-border-40 bg-surface-2 text-text-primary hover:bg-surface-3"
                      }`}
                      title="Explain this merge request with AI"
                    >
                      {aiExplain.isPending ? (
                        <Loader2 size={11} className="animate-spin text-accent" />
                      ) : (
                        <Sparkles size={11} className="text-accent" />
                      )}
                      <span>AI Explain</span>
                    </button>
                    <button
                      onClick={handleReviewMergeRequest}
                      disabled={aiReview.isPending || loadingFiles || changedFiles.length === 0 || !selectedMr}
                      className={`h-8 px-3 rounded-mac border text-[11px] font-bold transition-colors flex items-center gap-1.5 disabled:opacity-45 ${
                        aiReviewResult
                          ? "border-accent-40 bg-accent text-accent-fg"
                          : "border-accent-30 bg-accent-10 text-accent hover:bg-accent-20"
                      }`}
                      title="Review this merge request with AI"
                    >
                      {aiReview.isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <MessageSquareText size={11} />
                      )}
                      <span>AI Review</span>
                    </button>
                  </div>
                </div>

                {loadingFiles ? (
                  <div className="flex items-center gap-2 rounded-mac border border-border-40 bg-surface-1/20 p-3 text-2xs text-text-muted">
                    <Loader2 size={12} className="animate-spin text-accent" />
                    <span>Loading changed files...</span>
                  </div>
                ) : filesError ? (
                  <div className="rounded-mac border border-[#ff453a]/20 bg-[#ff453a]/10 p-3 text-2xs text-[#ff453a]">
                    {filesError}
                  </div>
                ) : changedFiles.length === 0 ? (
                  <div className="rounded-mac border border-border-40 bg-surface-1/20 p-3 text-2xs text-text-muted">
                    No changed files returned by the provider.
                  </div>
                ) : (
                  <div className="rounded-mac border border-border-40 bg-surface-1/20 min-w-0">
                    <div className="max-h-[190px] overflow-y-auto">
                      {changedFiles.map((file) => {
                        const isFileSelected =
                          selectedChangedFile?.path === file.path &&
                          selectedChangedFile?.oldPath === file.oldPath &&
                          selectedChangedFile?.status === file.status;
                        const fileHasFindings = findingsByFile.has(file.path) ||
                          findingsByFile.has(file.path.split("/").pop() || "");

                        return (
                          <button
                            key={`${file.status}:${file.path}:${file.oldPath || ""}`}
                            onClick={() => setSelectedChangedFile(file)}
                            className={`flex w-full items-center justify-between gap-2 border-b border-border-40 px-3 py-2 text-left last:border-b-0 transition-colors ${
                              isFileSelected
                                ? "bg-accent-10"
                                : "hover:bg-surface-2/70"
                            } ${fileHasFindings ? "border-l-2 border-l-[#ff9f0a]" : ""}`}
                            title={file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <div className="relative shrink-0">
                                <FileText
                                  size={11}
                                  className={`${
                                    file.status === "added"
                                      ? "text-[#30d158]"
                                      : file.status === "deleted"
                                      ? "text-[#ff453a]"
                                      : file.status === "renamed"
                                      ? "text-[#64d2ff]"
                                      : isFileSelected
                                      ? "text-accent"
                                      : "text-[#ff9f0a]"
                                  }`}
                                />
                                {fileHasFindings && (
                                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ff9f0a] border border-surface-1" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-2xs font-semibold text-text-primary">
                                  {file.path.split("/").pop() || file.path}
                                </div>
                                <div className="truncate text-[10px] text-text-muted">
                                  {file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path}
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {(file.additions !== undefined || file.deletions !== undefined) && (
                                <span className="font-mono text-[10px] text-text-muted">
                                  <span className="text-[#30d158]">+{file.additions ?? 0}</span>
                                  <span className="mx-0.5">/</span>
                                  <span className="text-[#ff453a]">-{file.deletions ?? 0}</span>
                                </span>
                              )}
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                file.status === "added"
                                  ? "bg-[#30d158]/10 text-[#30d158]"
                                  : file.status === "deleted"
                                    ? "bg-[#ff453a]/10 text-[#ff453a]"
                                    : file.status === "renamed"
                                      ? "bg-[#64d2ff]/10 text-[#64d2ff]"
                                      : "bg-[#ff9f0a]/10 text-[#ff9f0a]"
                              }`}>
                                {file.status}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedChangedFile && (
                      <div className="border-t border-border-40 bg-surface-0/60">
                        <div className="flex items-center justify-between gap-2 border-b border-border-40 px-2.5 py-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[9px] font-bold text-text-muted uppercase font-mono">
                              {(selectedChangedFile.path.split(".").pop() || "txt").slice(0, 5)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-2xs font-bold text-text-primary">
                                {selectedChangedFile.oldPath
                                  ? `${selectedChangedFile.oldPath} -> ${selectedChangedFile.path}`
                                  : selectedChangedFile.path}
                              </div>
                              <div className="text-[10px] text-text-muted flex items-center gap-2">
                                <span>File {selectedChangedFileIndex + 1} of {changedFiles.length}</span>
                                {hunkCount > 0 && (
                                  <span className="text-accent">{hunkCount} hunk{hunkCount > 1 ? "s" : ""}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => selectAdjacentChangedFile(-1)}
                              className="h-6 px-2 rounded border border-border-40 bg-surface-2 text-[10px] font-bold text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                              title="Previous file (k)"
                            >
                              Prev
                            </button>
                            <button
                              onClick={() => selectAdjacentChangedFile(1)}
                              className="h-6 px-2 rounded border border-border-40 bg-surface-2 text-[10px] font-bold text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                              title="Next file (j)"
                            >
                              Next
                            </button>
                          </div>
                        </div>

                        {/* AI Findings Banner for this file */}
                        {selectedFileFindings.length > 0 && (
                          <div className="border-b border-border-40 px-2.5 py-2 bg-[#ff9f0a]/5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#ff9f0a]">
                              <AlertTriangle size={10} />
                              <span>{selectedFileFindings.length} AI finding{selectedFileFindings.length > 1 ? "s" : ""} in this file</span>
                            </div>
                            <div className="mt-1 space-y-1">
                              {selectedFileFindings.map((finding, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-[10px] text-text-secondary">
                                  <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                                    finding.severity === "high" ? "bg-[#ff453a]" :
                                    finding.severity === "medium" ? "bg-[#ff9f0a]" :
                                    finding.severity === "low" ? "bg-[#0a84ff]" :
                                    "bg-text-muted"
                                  }`} />
                                  <span className="leading-snug">{finding.line.replace(/^[-*]\s*/, "").slice(0, 160)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedChangedFile.patch ? (
                          <div className="max-h-[320px] overflow-auto bg-[#0b0c0f] py-2 font-mono text-[11px] leading-5">
                            {parsedHunks.length > 0 ? (
                              parsedHunks.map((hunk, hunkIdx) => (
                                <div key={hunkIdx}>
                                  {/* Hunk header separator */}
                                  <div className="flex items-center gap-2 bg-surface-2/30 border-y border-border-40/40 px-3 py-1 text-[10px] text-text-muted">
                                    <span className="font-mono text-accent">{hunk.header.match(/@@ .+ @@/)?.[0] || hunk.header}</span>
                                  </div>
                                  {/* Hunk lines with line numbers */}
                                  {hunk.lines.filter(l => l.type !== "header").map((dLine, lineIdx) => (
                                    <div
                                      key={`${hunkIdx}:${lineIdx}`}
                                      className={`flex ${
                                        dLine.type === "add"
                                          ? "bg-[#30d158]/10"
                                          : dLine.type === "delete"
                                          ? "bg-[#ff453a]/10"
                                          : ""
                                      }`}
                                    >
                                      {/* Old line number */}
                                      <span className="w-10 shrink-0 text-right pr-2 text-text-muted/40 select-none border-r border-border-40/20">
                                        {dLine.oldLineNumber ?? ""}
                                      </span>
                                      {/* New line number */}
                                      <span className="w-10 shrink-0 text-right pr-2 text-text-muted/40 select-none border-r border-border-40/20">
                                        {dLine.newLineNumber ?? ""}
                                      </span>
                                      {/* Diff type indicator */}
                                      <span className={`w-5 shrink-0 text-center select-none ${
                                        dLine.type === "add" ? "text-[#30d158]" : dLine.type === "delete" ? "text-[#ff453a]" : "text-text-muted/30"
                                      }`}>
                                        {dLine.type === "add" ? "+" : dLine.type === "delete" ? "-" : " "}
                                      </span>
                                      {/* Content */}
                                      <span className={`flex-1 whitespace-pre ${
                                        dLine.type === "add" ? "text-[#7ee787]" : dLine.type === "delete" ? "text-[#ff9b95]" : "text-text-secondary"
                                      }`}>
                                        {dLine.content.slice(1) || " "}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ))
                            ) : (
                              // Fallback to raw rendering if parseDiff fails
                              selectedChangedFile.patch.split("\n").map((line, index) => (
                                <div
                                  key={`${selectedChangedFile.path}:${index}`}
                                  className={`whitespace-pre px-3 ${getDiffLineClass(line)}`}
                                >
                                  {line || " "}
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                          <div className="p-3 text-2xs leading-relaxed text-text-muted">
                            No patch content returned by the provider. The file may be binary,
                            too large, or unavailable in the API response.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {aiExplain.error && (
                  <div className="rounded-mac border border-[#ff453a]/20 bg-[#ff453a]/10 p-3 text-2xs text-[#ff453a]">
                    {aiExplain.error.message || "Failed to explain merge request"}
                  </div>
                )}
                {aiReview.error && (
                  <div className="rounded-mac border border-[#ff453a]/20 bg-[#ff453a]/10 p-3 text-2xs text-[#ff453a]">
                    {aiReview.error.message || "Failed to review merge request"}
                  </div>
                )}
                {aiPanelKind && (
                  <div className="overflow-hidden rounded-mac border border-accent-30 bg-surface-1 select-text">
                    <div className="flex items-center justify-between gap-2 border-b border-border-40 bg-surface-2/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-mac bg-accent-10 text-accent">
                          {aiPanelKind === "review" ? (
                            <MessageSquareText size={14} />
                          ) : (
                            <Sparkles size={14} />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-text-primary">
                            {aiPanelKind === "review" ? "AI Review Report" : "AI Explanation"}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {aiPanelKind === "review"
                              ? "Findings, risks, tests, and recommendation"
                              : "Summary, motivation, and important changes"}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${
                          aiPanelKind === "review"
                            ? "bg-[#ff9f0a]/10 text-[#ff9f0a]"
                            : "bg-[#30d158]/10 text-[#30d158]"
                        }`}
                      >
                        {aiPanelKind === "review" ? (
                          <AlertTriangle size={11} />
                        ) : (
                          <Check size={11} />
                        )}
                        <span>{aiPanelKind === "review" ? "Review" : "Explain"}</span>
                      </div>
                    </div>
                    <div className="max-h-[280px] space-y-1.5 overflow-y-auto p-3 text-2xs leading-relaxed">
                      {renderAIText(aiPanelKind === "review" ? aiReviewResult : aiExplanation)}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedMr.description && (
                <div className="space-y-1.5 border-t border-border-60 pt-3">
                  <h4 className="text-2xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquareText size={10} className="text-accent" />
                    Description
                  </h4>
                  <div className="text-2xs text-text-secondary leading-relaxed bg-surface-1/20 border border-border-40 rounded-mac p-3 max-h-[120px] overflow-y-auto font-normal break-words whitespace-pre-line">
                    {selectedMr.description}
                  </div>
                </div>
              )}

              {/* Checks & Pipelines Section */}
              <div className="space-y-2 border-t border-border-60 pt-3">
                <h4 className="text-2xs font-bold text-[#0a84ff] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-[#0a84ff]" />
                  CI/CD Status
                </h4>
                
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
                            className={`flex items-center justify-between p-1.5 hover:bg-surface-2 rounded transition-colors text-3xs border-l-2 ${
                              run.conclusion === "success"
                                ? "border-l-[#30d158]"
                                : run.conclusion === "failure"
                                ? "border-l-[#ff453a]"
                                : "border-l-[#0a84ff]"
                            }`}
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
          <div className="px-4 py-3 border-t border-border-60 bg-surface-1 flex flex-wrap justify-end gap-2 shrink-0">
            <a
              href={providerReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-4 bg-accent hover:opacity-95 text-accent-fg text-xs font-semibold rounded-mac border border-accent-30 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Open provider review page"
            >
              <MessageSquareText size={11} />
              <span>Review MR</span>
            </a>
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
