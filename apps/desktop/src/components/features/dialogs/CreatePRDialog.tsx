import { useState, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { api } from "@/api/tauri";
import { useAIPRDraft } from "@/queries/useAI";
import { parseRemoteUrl, createPullRequest, createMergeRequest, type MergeRequest } from "@/api/gitHost";
import { showToast } from "@/lib/toast";
import {
  GitPullRequest,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface CreatePRDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreatePRDialog({ open, onClose }: CreatePRDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const currentBranch = useRepoStore((s) => s.selectedRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<MergeRequest | null>(null);

  // Form state
  const [remoteUrl, setRemoteUrl] = useState("");
  const [provider, setProvider] = useState<"github" | "gitlab" | null>(null);
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // AI draft
  const prDraft = useAIPRDraft(repoPath);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Detect remote + current branch on mount
  useEffect(() => {
    if (!open || !repoPath) return;
    detectRemote();
  }, [open, repoPath]);

  const detectRemote = async () => {
    try {
      const remotes = await api.remote.listRemotes(repoPath!);
      const origin = remotes.find((r: { name: string }) => r.name === "origin") || remotes[0];
      if (origin) {
        const info = parseRemoteUrl(origin.url);
        setRemoteUrl(origin.url);
        setProvider(info.provider);
        // Extract default branch from remote (best guess)
        if (info.provider === "github" || info.provider === "gitlab") {
          setTargetBranch("main");
        }
      }
    } catch {
      // No remote
    }
  };

  // Set source branch
  useEffect(() => {
    if (open && currentBranch) {
      setSourceBranch(currentBranch.replace("refs/heads/", ""));
    }
  }, [open, currentBranch]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [open]);

  const handleGenerateAI = async () => {
    setAiGenerating(true);
    try {
      const changes = await api.status(repoPath!).catch(() => []) as any[];
      const staged = changes.filter((c: any) => c.staged);
      const recentLog = await api.log(repoPath!, 1).catch(() => []) as any[];
      const commitMessage = recentLog?.[0]?.message || "";
      const draft = await prDraft.mutateAsync({
        branchName: sourceBranch,
        staged,
        commitMessage,
      });
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      showToast("PR draft generated", "success");
    } catch (err) {
      showToast(`AI generation failed: ${err}`, "error");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!sourceBranch) {
      setError("Source branch is required");
      return;
    }
    if (!targetBranch) {
      setError("Target branch is required");
      return;
    }
    if (!provider) {
      setError("No Git hosting provider detected from remote URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: MergeRequest;
      if (provider === "github") {
        result = await createPullRequest(remoteUrl, title.trim(), description.trim(), sourceBranch, targetBranch);
      } else {
        result = await createMergeRequest(remoteUrl, title.trim(), description.trim(), sourceBranch, targetBranch);
      }
      setSuccess(result);
      showToast(
        provider === "github" ? "Pull request created" : "Merge request created",
        "success",
      );
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const providerLabel = provider === "github" ? "Pull Request" : provider === "gitlab" ? "Merge Request" : "PR";

  return (
    <div className="fixed inset-0 bg-[#000000]/65 backdrop-blur-md z-[9998] flex items-center justify-center p-6 anim-overlay-enter">
      <div className="w-full max-w-lg bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden anim-dialog-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1-40">
          <div className="flex items-center gap-2">
            <GitPullRequest size={14} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">
              Create {providerLabel}
            </span>
          </div>
          <button
            onClick={loading ? undefined : onClose}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Provider indicator */}
          {!provider && !loading && (
            <div className="text-xs text-text-muted bg-surface-2-40 border border-border-40 rounded-mac px-3 py-2">
              No Git hosting provider detected. Set up a remote (origin) first.
            </div>
          )}

          {/* Success state */}
          {success ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-[#30d158]/10 border border-[#30d158]/20 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-[#30d158]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {providerLabel} Created
                  </div>
                  <div className="text-xs text-text-muted mt-1">{success.title}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Branch</span>
                  <span className="text-text-primary font-mono">{sourceBranch} → {targetBranch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Author</span>
                  <span className="text-text-primary">{success.author}</span>
                </div>
              </div>

              {/* Open in browser */}
              <a
                href={success.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-9 bg-accent text-accent-fg text-sm font-semibold rounded-mac hover:opacity-90 transition-opacity"
              >
                <ExternalLink size={14} />
                Open in Browser
              </a>
            </div>
          ) : (
            /* Form */
            <div className="space-y-3">
              {/* Source branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-primary">Source Branch</label>
                <input
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary outline-none focus:border-accent transition-colors font-mono"
                  disabled
                  placeholder="current-branch"
                />
              </div>

              {/* Target branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-primary">Target Branch</label>
                <input
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors font-mono"
                  disabled={loading}
                  placeholder="main"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-primary">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                  disabled={loading}
                  autoFocus
                  placeholder="Brief summary of changes"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-primary">Description</label>
                  <button
                    onClick={handleGenerateAI}
                    disabled={aiGenerating || loading || !sourceBranch}
                    className="flex items-center gap-1 px-2 py-0.5 text-2xs text-text-muted hover:text-accent border border-border hover:border-accent/40 rounded transition-colors disabled:opacity-40"
                  >
                    {aiGenerating ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} />
                    )}
                    AI Draft
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-36 text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors resize-none leading-relaxed"
                  disabled={loading}
                  placeholder="Detailed description of changes, motivation, testing notes..."
                />
              </div>

              {/* Error */}
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded border border-red-500/20">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border-60 bg-surface-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !provider || !title.trim() || !sourceBranch}
              className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ArrowRight size={12} />
              )}
              {loading ? "Creating..." : `Create ${providerLabel}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
