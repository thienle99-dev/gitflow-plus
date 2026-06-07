import { useState, useMemo, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useTagCreate, useTagPush, useTagList } from "@/queries/useGitTag";
import { useGenerateTagDescription } from "@/queries/useAI";
import { showToast } from "@/lib/toast";
import { api } from "@/api/tauri";
import { suggestNextVersions, groupCommitsByType, type VersionOption } from "@/lib/semver";
import { GitCommit, Rocket, Sparkles, RefreshCw, Tag, ArrowRight, ExternalLink, ChevronDown } from "lucide-react";
import Dialog from "@/components/ui/overlay/Dialog";

const TYPE_COLORS: Record<string, string> = {
  feat: "text-[#30d158]", fix: "text-[#ff9f0a]", breaking: "text-[#ff453a]",
  docs: "text-[#0a84ff]", chore: "text-text-muted", refactor: "text-[#5e5ce6]",
  perf: "text-[#bf5af2]", test: "text-[#64d2ff]", ci: "text-text-muted", build: "text-text-muted",
  other: "text-text-muted",
};

interface CreateReleaseDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateReleaseDialog({ open, onClose }: CreateReleaseDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: tags } = useTagList(repoPath);
  const tagCreate = useTagCreate(repoPath);
  const tagPush = useTagPush(repoPath);
  const generateDescription = useGenerateTagDescription(repoPath);

  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [selectedBump, setSelectedBump] = useState<"Major" | "Minor" | "Patch">("Patch");
  const [customVersion, setCustomVersion] = useState("");
  const [description, setDescription] = useState("");
  const [pushAfterCreate, setPushAfterCreate] = useState(false);
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const latestTag = useMemo(() => {
    if (!tags || tags.length === 0) return null;
    return tags.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [tags]);

  // Load commits and compute versions on mount
  useEffect(() => {
    if (!open || !repoPath) return;
    (async () => {
      setLoading(true);
      try {
        const since = latestTag ? latestTag.hash : "HEAD~30";
        const log = await api.logSince(repoPath, since, 200, "HEAD");
        setCommits(log);
        const verOpts = suggestNextVersions(latestTag?.name || null, log);
        setVersions(verOpts);
      } catch {
        setCommits([]);
        setVersions(suggestNextVersions(null, []));
      }
      setLoading(false);
    })();
  }, [open, repoPath, latestTag]);

  // Auto-generate description
  useEffect(() => {
    if (!open || !repoPath || loading || generatingDesc || description) return;
    (async () => {
      setGeneratingDesc(true);
      try {
        const targetRef = latestTag
          ? await api.logSince(repoPath, latestTag.hash, 200, "HEAD")
          : [];
        const result = await generateDescription.mutateAsync({
          tagName: getVersionString(),
          previousTag: latestTag?.name || undefined,
          targetRef: "HEAD",
          commits: targetRef,
        });
        if (result.description) setDescription(result.description);
      } catch {}
      setGeneratingDesc(false);
    })();
  }, [open, loading]);

  const getVersionString = () => {
    if (customVersion.trim()) return customVersion.trim();
    const opt = versions.find((v) => v.label === selectedBump);
    return opt?.version || "v0.1.0";
  };

  const useCustomVersion = customVersion.trim().length > 0;
  const versionString = getVersionString();

  const handleCreate = async () => {
    if (!repoPath || !versionString) return;
    try {
      await tagCreate.mutateAsync({
        name: versionString,
        message: description || undefined,
        target: undefined,
      });
      if (pushAfterCreate) {
        try { await tagPush.mutateAsync({ name: versionString }); } catch {}
      }
      showToast(`Release ${versionString} created`);
      onClose();
    } catch (e: any) { showToast(`Error: ${e}`, "error"); }
  };

  const grouped = useMemo(() => groupCommitsByType(commits), [commits]);
  const typeOrder = ["breaking", "feat", "fix", "perf", "refactor", "docs", "test", "chore", "ci", "build", "other"];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="600px">
      <div className="flex flex-col h-[min(680px,85vh)] bg-surface-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-60 shrink-0">
          <Rocket size={14} className="text-accent" />
          <span className="text-xs font-bold text-text-primary">Create Release</span>
          {latestTag && <span className="text-2xs text-text-muted">from {latestTag.name}</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Version picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary">Version</label>
            <div className="flex gap-2">
              {versions.map((v) => (
                <button
                  key={v.label}
                  onClick={() => { setSelectedBump(v.label); setCustomVersion(""); }}
                  className={`flex-1 px-3 py-2 rounded-mac border text-left transition-all ${
                    !useCustomVersion && selectedBump === v.label
                      ? "bg-accent-10 border-accent-30 text-accent"
                      : "bg-surface-1 border-border-40 text-text-secondary hover:border-accent-30"
                  }`}
                >
                  <div className="text-xs font-bold">{v.version || "—"}</div>
                  <div className="text-[9px] text-text-muted">{v.description}</div>
                </button>
              ))}
            </div>
            <input
              value={customVersion}
              onChange={(e) => setCustomVersion(e.target.value)}
              placeholder="Or type custom version (e.g. v2.0.0-rc1)"
              className="w-full h-7 px-2.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
          </div>

          {/* Commits */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">
              Commits
              <span className="text-2xs text-text-muted ml-1 font-normal">({commits.length} since {latestTag?.name || "start"})</span>
            </label>
            <div className="max-h-[200px] overflow-y-auto border border-border-40 rounded-mac divide-y divide-border-20">
              {loading ? (
                <div className="px-3 py-4 text-xs text-text-muted text-center">
                  <RefreshCw size={13} className="animate-spin inline mr-1" />
                  Loading commits...
                </div>
              ) : typeOrder.map((type) => {
                const items = grouped[type];
                if (!items || items.length === 0) return null;
                return (
                  <div key={type}>
                    <div className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider bg-surface-1-40 ${TYPE_COLORS[type] || "text-text-muted"}`}>
                      {type} ({items.length})
                    </div>
                    {items.map((c) => (
                      <div key={c.hash} className="px-3 py-1 text-2xs flex items-center gap-2 text-text-secondary">
                        <code className="text-[9px] font-mono text-accent shrink-0">{c.hash.slice(0, 7)}</code>
                        <span className="truncate">{c.message.replace(/^(\w+)(\(.+\))?(!)?:\s/, "").slice(0, 80)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary">Release Notes</label>
              <button
                onClick={async () => {
                  setGeneratingDesc(true);
                  try {
                    const since = latestTag ? latestTag.hash : "HEAD~30";
                    const log = await api.logSince(repoPath!, since, 200, "HEAD");
                    const result = await generateDescription.mutateAsync({
                      tagName: versionString,
                      previousTag: latestTag?.name || undefined,
                      targetRef: "HEAD",
                      commits: log,
                    });
                    setDescription(result.description);
                  } catch { showToast("Failed to generate", "error"); }
                  setGeneratingDesc(false);
                }}
                disabled={generatingDesc}
                className="inline-flex items-center gap-1 h-6 px-2 text-2xs font-semibold rounded-mac border border-accent-30 bg-accent-10 text-accent hover:bg-accent-15 disabled:opacity-45 transition-colors"
              >
                {generatingDesc ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {generatingDesc ? "Generating..." : "Generate with AI"}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-2.5 py-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent resize-y min-h-[80px]"
              placeholder="Release notes..."
            />
          </div>

          {/* Options */}
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={pushAfterCreate}
              onChange={(e) => setPushAfterCreate(e.target.checked)}
              className="rounded"
            />
            Push tag to remote after creation
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-60 shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-mac hover:bg-surface-2 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!versionString || tagCreate.isPending}
            className="px-3 py-1.5 text-xs font-semibold bg-accent text-accent-fg rounded-mac hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            {tagCreate.isPending ? <RefreshCw size={11} className="animate-spin" /> : <Tag size={11} />}
            {tagCreate.isPending ? "Creating..." : `Create ${versionString}`}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
