import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRepoStore } from "@/stores/repo";
import { api, type GitFlowConfig } from "@/api/tauri";
import { useGitFlowDetect, useGitFlowInit } from "@/queries/useGitFlow";
import { useGitBranches } from "@/queries/useGitLog";
import { useGenerateTagDescription } from "@/queries/useAI";
import { toKebabCase, validateGitFlowName, validateSemver, getActiveGitFlowBranches } from "@/lib/gitflow-helpers";
import { showToast } from "@/lib/toast";
import Dialog from "@/components/ui/overlay/Dialog";
import {
  GitBranch, Plus, Check, Merge, Tag, AlertTriangle,
  Rocket, Shield, Zap, ChevronRight, Sparkles,
  ArrowRight, Trash2, FileCode2,
} from "lucide-react";

type ViewMode =
  | "init"
  | "feature-start" | "feature-finish"
  | "release-start" | "release-finish"
  | "hotfix-start" | "hotfix-finish";

interface GitFlowDialogProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "init" | "feature-start" | "feature-finish" | "release-start" | "release-finish" | "hotfix-start" | "hotfix-finish";
}

const MERGE_STRATEGIES = [
  { value: "merge", label: "Regular Merge" },
  { value: "squash", label: "Squash Merge" },
  { value: "rebase", label: "Rebase" },
] as const;

export default function GitFlowDialog({ open, onClose, initialMode }: GitFlowDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const queryClient = useQueryClient();

  const { data: gitflowConfig, isLoading: configLoading } = useGitFlowDetect(repoPath);
  const { data: branches } = useGitBranches(repoPath);
  const initMutation = useGitFlowInit(repoPath);
  const generateTagDescription = useGenerateTagDescription(repoPath);

  const [mode, setMode] = useState<ViewMode>(initialMode || "init");
  const [loading, setLoading] = useState(false);

  // Init wizard state
  const [initMaster, setInitMaster] = useState("main");
  const [initDevelop, setInitDevelop] = useState("develop");
  const [initFeaturePrefix, setInitFeaturePrefix] = useState("feature/");
  const [initReleasePrefix, setInitReleasePrefix] = useState("release/");
  const [initHotfixPrefix, setInitHotfixPrefix] = useState("hotfix/");
  const [initVersiontagPrefix, setInitVersiontagPrefix] = useState("v");

  // Start/finish state
  const [branchName, setBranchName] = useState("");
  const [mergeStrategy, setMergeStrategy] = useState<"merge" | "squash" | "rebase">("merge");
  const [deleteAfterFinish, setDeleteAfterFinish] = useState(true);
  const [createTag, setCreateTag] = useState(true);
  const [tagMessage, setTagMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Determine initial mode from config
  useEffect(() => {
    if (!open) return;
    if (initialMode) {
      setMode(initialMode);
    } else if (gitflowConfig && !gitflowConfig.initialized) {
      setMode("init");
    } else if (gitflowConfig?.initialized) {
      setMode("feature-start");
    }
    setBranchName("");
    setError(null);
    setLoading(false);
  }, [open, initialMode, gitflowConfig]);

  const currentBranch = branches?.find((b) => b.current)?.name || "";
  const isInitialized = gitflowConfig?.initialized ?? false;

  const featureBranches = branches && gitflowConfig
    ? getActiveGitFlowBranches(branches, gitflowConfig, "feature")
    : [];
  const releaseBranches = branches && gitflowConfig
    ? getActiveGitFlowBranches(branches, gitflowConfig, "release")
    : [];
  const hotfixBranches = branches && gitflowConfig
    ? getActiveGitFlowBranches(branches, gitflowConfig, "hotfix")
    : [];

  const loadCommitsForTagDescription = async () => {
    if (!repoPath || !gitflowConfig) throw new Error("No repository selected");
    const isHotfix = mode === "hotfix-finish";
    const branchPrefix = isHotfix ? gitflowConfig.hotfix_prefix : gitflowConfig.release_prefix;
    const targetRef = branchPrefix + branchName;
    const tagName = gitflowConfig.versiontag_prefix + branchName;
    const tags = await api.tag.list(repoPath);
    const previousTag = tags.find((tag) => tag.name !== tagName);
    const commits = previousTag
      ? await api.logSince(repoPath, previousTag.name, 200, targetRef)
      : await api.log(repoPath, 0, 80, targetRef);

    return { tagName, previousTag: previousTag?.name, targetRef, commits };
  };

  const handleGenerateTagMessage = async () => {
    if (!branchName.trim()) {
      setError("Select a release or hotfix branch first");
      return;
    }

    setError(null);
    try {
      const { tagName, previousTag, targetRef, commits } = await loadCommitsForTagDescription();
      const result = await generateTagDescription.mutateAsync({
        tagName,
        previousTag,
        targetRef,
        commits,
      });
      setTagMessage(result.description);
      showToast(result.fallback ? result.reason || "Generated local tag description" : "Generated tag description");
    } catch (e: any) {
      setError(e?.message || e?.toString() || "Failed to generate tag description");
    }
  };

  // --- Init ---
  const handleInit = async () => {
    if (!repoPath) return;
    setError(null);
    setLoading(true);
    try {
      await initMutation.mutateAsync({
        master: initMaster,
        develop: initDevelop,
        featurePrefix: initFeaturePrefix,
        releasePrefix: initReleasePrefix,
        hotfixPrefix: initHotfixPrefix,
        versiontagPrefix: initVersiontagPrefix,
      });
      showToast("GitFlow initialized successfully");
      onClose();
    } catch (e: any) {
      setError(e?.toString() || "Failed to initialize GitFlow");
    } finally {
      setLoading(false);
    }
  };

  // --- Feature Start ---
  const handleFeatureStart = async () => {
    if (!repoPath || !gitflowConfig) return;
    const validationError = validateGitFlowName(branchName, branches?.map((b) => b.name) || [], gitflowConfig.feature_prefix);
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      const fullName = gitflowConfig.feature_prefix + toKebabCase(branchName);
      await api.branches.create(repoPath, fullName, gitflowConfig.develop);
      await api.branches.checkout(repoPath, fullName);
      showToast(`Feature branch "${fullName}" created`);
      queryClient.invalidateQueries({ queryKey: ["branches", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["git-log", repoPath] });
      onClose();
    } catch (e: any) {
      setError(e?.toString() || "Failed to create feature branch");
    } finally {
      setLoading(false);
    }
  };

  // --- Feature Finish ---
  const handleFeatureFinish = async () => {
    if (!repoPath || !gitflowConfig) return;
    setError(null);
    setLoading(true);
    try {
      const fullName = gitflowConfig.feature_prefix + branchName;
      await api.branches.checkout(repoPath, gitflowConfig.develop);
      const squash = mergeStrategy === "squash";
      await api.merge.start(repoPath, fullName, squash);
      if (deleteAfterFinish) {
        await api.branches.delete(repoPath, fullName);
      }
      showToast(`Feature "${branchName}" merged into ${gitflowConfig.develop}`);
      queryClient.invalidateQueries({ queryKey: ["branches", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["git-log", repoPath] });
      onClose();
    } catch (e: any) {
      setError(e?.toString() || "Failed to finish feature");
    } finally {
      setLoading(false);
    }
  };

  // --- Release Start ---
  const handleReleaseStart = async () => {
    if (!repoPath || !gitflowConfig) return;
    const validationError = validateSemver(branchName);
    if (validationError) { setError(validationError); return; }
    if (branches?.some((b) => b.name === gitflowConfig.release_prefix + branchName)) {
      setError(`Release branch "${gitflowConfig.release_prefix + branchName}" already exists`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fullName = gitflowConfig.release_prefix + branchName;
      await api.branches.create(repoPath, fullName, gitflowConfig.develop);
      await api.branches.checkout(repoPath, fullName);
      showToast(`Release branch "${fullName}" created`);
      queryClient.invalidateQueries({ queryKey: ["branches", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["git-log", repoPath] });
      onClose();
    } catch (e: any) {
      setError(e?.toString() || "Failed to create release branch");
    } finally {
      setLoading(false);
    }
  };

  // --- Release Finish ---
  const handleReleaseFinish = async () => {
    if (!repoPath || !gitflowConfig) return;
    setError(null);
    setLoading(true);
    try {
      const fullName = gitflowConfig.release_prefix + branchName;
      // Merge into main
      await api.branches.checkout(repoPath, gitflowConfig.master);
      await api.merge.start(repoPath, fullName, mergeStrategy === "squash");
      // Merge back into develop
      await api.branches.checkout(repoPath, gitflowConfig.develop);
      await api.merge.start(repoPath, fullName, mergeStrategy === "squash");
      // Create tag
      if (createTag) {
        const tagName = gitflowConfig.versiontag_prefix + branchName;
        await api.tag.create(repoPath, tagName, gitflowConfig.master, tagMessage || `Release ${branchName}`);
      }
      // Delete release branch
      await api.branches.delete(repoPath, fullName);
      showToast(`Release "${branchName}" completed`);
      queryClient.invalidateQueries({ queryKey: ["branches", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["git-log", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["tags", repoPath] });
      onClose();
    } catch (e: any) {
      setError(e?.toString() || "Failed to finish release");
    } finally {
      setLoading(false);
    }
  };

  // --- Hotfix Start ---
  const handleHotfixStart = async () => {
    if (!repoPath || !gitflowConfig) return;
    if (!branchName.trim()) { setError("Hotfix name/version cannot be empty"); return; }
    if (branches?.some((b) => b.name === gitflowConfig.hotfix_prefix + branchName)) {
      setError(`Hotfix branch "${gitflowConfig.hotfix_prefix + branchName}" already exists`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fullName = gitflowConfig.hotfix_prefix + branchName;
      await api.branches.create(repoPath, fullName, gitflowConfig.master);
      await api.branches.checkout(repoPath, fullName);
      showToast(`Hotfix branch "${fullName}" created from ${gitflowConfig.master}`);
      queryClient.invalidateQueries({ queryKey: ["branches", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["git-log", repoPath] });
      onClose();
    } catch (e: any) {
      setError(e?.toString() || "Failed to create hotfix branch");
    } finally {
      setLoading(false);
    }
  };

  // --- Hotfix Finish ---
  const handleHotfixFinish = async () => {
    if (!repoPath || !gitflowConfig) return;
    setError(null);
    setLoading(true);
    try {
      const fullName = gitflowConfig.hotfix_prefix + branchName;
      // Merge into main
      await api.branches.checkout(repoPath, gitflowConfig.master);
      await api.merge.start(repoPath, fullName, mergeStrategy === "squash");
      // Merge back into develop
      await api.branches.checkout(repoPath, gitflowConfig.develop);
      await api.merge.start(repoPath, fullName, mergeStrategy === "squash");
      // Create tag
      if (createTag) {
        const tagName = gitflowConfig.versiontag_prefix + branchName;
        await api.tag.create(repoPath, tagName, gitflowConfig.master, tagMessage || `Hotfix ${branchName}`);
      }
      // Delete hotfix branch
      await api.branches.delete(repoPath, fullName);
      showToast(`Hotfix "${branchName}" completed`);
      queryClient.invalidateQueries({ queryKey: ["branches", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["git-log", repoPath] });
      queryClient.invalidateQueries({ queryKey: ["tags", repoPath] });
      onClose();
    } catch (e: any) {
      setError(e?.toString() || "Failed to finish hotfix");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const getTitle = (): string => {
    switch (mode) {
      case "init": return "Initialize GitFlow";
      case "feature-start": return "Start New Feature";
      case "feature-finish": return "Finish Feature";
      case "release-start": return "Start New Release";
      case "release-finish": return "Finish Release";
      case "hotfix-start": return "Start New Hotfix";
      case "hotfix-finish": return "Finish Hotfix";
      default: return "GitFlow";
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={getTitle()} maxWidth="480px">
      <div className="flex flex-col gap-4 px-1">
        {/* Mode tabs (only when initialized) */}
        {isInitialized && (
          <div className="flex gap-1 border-b border-border-40 pb-2">
            <ModeTab
              icon={<Rocket size={13} />}
              label="Feature"
              color="text-amber-400"
              active={mode.startsWith("feature")}
              onClick={() => { setMode(featureBranches.length > 0 ? "feature-finish" : "feature-start"); setBranchName(""); setError(null); }}
            />
            <ModeTab
              icon={<Tag size={13} />}
              label="Release"
              color="text-blue-400"
              active={mode.startsWith("release")}
              onClick={() => { setMode(releaseBranches.length > 0 ? "release-finish" : "release-start"); setBranchName(""); setError(null); }}
            />
            <ModeTab
              icon={<Zap size={13} />}
              label="Hotfix"
              color="text-red-400"
              active={mode.startsWith("hotfix")}
              onClick={() => { setMode(hotfixBranches.length > 0 ? "hotfix-finish" : "hotfix-start"); setBranchName(""); setError(null); }}
            />
          </div>
        )}

        {/* Init wizard */}
        {mode === "init" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">
              Set up GitFlow branching model for this repository. This will create a <code className="text-accent">develop</code> branch if it doesn't exist.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Main branch" value={initMaster} onChange={setInitMaster} />
              <Field label="Develop branch" value={initDevelop} onChange={setInitDevelop} />
              <Field label="Feature prefix" value={initFeaturePrefix} onChange={setInitFeaturePrefix} />
              <Field label="Release prefix" value={initReleasePrefix} onChange={setInitReleasePrefix} />
              <Field label="Hotfix prefix" value={initHotfixPrefix} onChange={setInitHotfixPrefix} />
              <Field label="Tag prefix" value={initVersiontagPrefix} onChange={setInitVersiontagPrefix} />
            </div>
          </div>
        )}

        {/* Feature start */}
        {mode === "feature-start" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">
              Create a new feature branch from <code className="text-accent">{gitflowConfig?.develop}</code>.
            </p>
            <Field
              label="Feature name"
              value={branchName}
              onChange={setBranchName}
              placeholder="e.g. user-auth"
              prefix={gitflowConfig?.feature_prefix}
            />
          </div>
        )}

        {/* Feature finish */}
        {mode === "feature-finish" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">
              Merge feature branch into <code className="text-accent">{gitflowConfig?.develop}</code>.
            </p>
            <SelectField
              label="Feature branch"
              value={branchName}
              onChange={setBranchName}
              options={featureBranches.map((b) => ({
                value: b.replace(gitflowConfig?.feature_prefix || "", ""),
                label: b,
              }))}
              prefix={gitflowConfig?.feature_prefix}
            />
            <SelectField
              label="Merge strategy"
              value={mergeStrategy}
              onChange={(v) => setMergeStrategy(v as typeof mergeStrategy)}
              options={MERGE_STRATEGIES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <Checkbox label="Delete branch after merge" checked={deleteAfterFinish} onChange={setDeleteAfterFinish} />
            {branchName && (
              <ActionPreview steps={[
                { icon: "checkout", label: `Checkout ${gitflowConfig?.develop}` },
                { icon: "merge", label: `Merge ${gitflowConfig?.feature_prefix}${branchName} → ${gitflowConfig?.develop}`, detail: mergeStrategy === "squash" ? "Squash merge" : mergeStrategy === "rebase" ? "Rebase" : "Regular merge" },
                ...(deleteAfterFinish ? [{ icon: "delete" as const, label: `Delete branch ${gitflowConfig?.feature_prefix}${branchName}` }] : []),
              ]} />
            )}
          </div>
        )}

        {/* Release start */}
        {mode === "release-start" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">
              Create a release branch from <code className="text-accent">{gitflowConfig?.develop}</code>. Use semver format.
            </p>
            <Field
              label="Version"
              value={branchName}
              onChange={setBranchName}
              placeholder="e.g. 1.2.3"
              prefix={gitflowConfig?.release_prefix}
            />
          </div>
        )}

        {/* Release finish */}
        {mode === "release-finish" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">
              Merge release into <code className="text-accent">{gitflowConfig?.master}</code> and back into <code className="text-accent">{gitflowConfig?.develop}</code>.
            </p>
            <SelectField
              label="Release branch"
              value={branchName}
              onChange={setBranchName}
              options={releaseBranches.map((b) => ({
                value: b.replace(gitflowConfig?.release_prefix || "", ""),
                label: b,
              }))}
              prefix={gitflowConfig?.release_prefix}
            />
            <SelectField
              label="Merge strategy"
              value={mergeStrategy}
              onChange={(v) => setMergeStrategy(v as typeof mergeStrategy)}
              options={MERGE_STRATEGIES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <Checkbox label="Create tag" checked={createTag} onChange={setCreateTag} />
            {createTag && (
              <TagMessageField
                label="Tag message (optional)"
                value={tagMessage}
                onChange={setTagMessage}
                placeholder={`Release ${branchName}`}
                onGenerate={handleGenerateTagMessage}
                generating={generateTagDescription.isPending}
                canGenerate={!!branchName.trim()}
              />
            )}
            {branchName && (
              <ActionPreview steps={[
                { icon: "checkout", label: `Checkout ${gitflowConfig?.master}` },
                { icon: "merge", label: `Merge ${gitflowConfig?.release_prefix}${branchName} → ${gitflowConfig?.master}`, detail: mergeStrategy === "squash" ? "Squash merge" : mergeStrategy === "rebase" ? "Rebase" : "Regular merge" },
                { icon: "checkout", label: `Checkout ${gitflowConfig?.develop}` },
                { icon: "merge", label: `Merge ${gitflowConfig?.release_prefix}${branchName} → ${gitflowConfig?.develop}` },
                ...(createTag ? [{ icon: "tag" as const, label: `Create tag ${gitflowConfig?.versiontag_prefix}${branchName} on ${gitflowConfig?.master}` }] : []),
                { icon: "delete", label: `Delete branch ${gitflowConfig?.release_prefix}${branchName}` },
              ]} />
            )}
          </div>
        )}

        {/* Hotfix start */}
        {mode === "hotfix-start" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded bg-red-500/10 border border-red-500/30 px-3 py-2">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-300">
                Hotfix is created from <strong>{gitflowConfig?.master}</strong>, not develop.
              </span>
            </div>
            <Field
              label="Hotfix name / version"
              value={branchName}
              onChange={setBranchName}
              placeholder="e.g. 1.2.4"
              prefix={gitflowConfig?.hotfix_prefix}
            />
          </div>
        )}

        {/* Hotfix finish */}
        {mode === "hotfix-finish" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">
              Merge hotfix into <code className="text-accent">{gitflowConfig?.master}</code> and back into <code className="text-accent">{gitflowConfig?.develop}</code>.
            </p>
            <SelectField
              label="Hotfix branch"
              value={branchName}
              onChange={setBranchName}
              options={hotfixBranches.map((b) => ({
                value: b.replace(gitflowConfig?.hotfix_prefix || "", ""),
                label: b,
              }))}
              prefix={gitflowConfig?.hotfix_prefix}
            />
            <SelectField
              label="Merge strategy"
              value={mergeStrategy}
              onChange={(v) => setMergeStrategy(v as typeof mergeStrategy)}
              options={MERGE_STRATEGIES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <Checkbox label="Create tag" checked={createTag} onChange={setCreateTag} />
            {createTag && (
              <TagMessageField
                label="Tag message (optional)"
                value={tagMessage}
                onChange={setTagMessage}
                placeholder={`Hotfix ${branchName}`}
                onGenerate={handleGenerateTagMessage}
                generating={generateTagDescription.isPending}
                canGenerate={!!branchName.trim()}
              />
            )}
            {branchName && (
              <ActionPreview steps={[
                { icon: "checkout", label: `Checkout ${gitflowConfig?.master}` },
                { icon: "merge", label: `Merge ${gitflowConfig?.hotfix_prefix}${branchName} → ${gitflowConfig?.master}`, detail: mergeStrategy === "squash" ? "Squash merge" : mergeStrategy === "rebase" ? "Rebase" : "Regular merge" },
                { icon: "checkout", label: `Checkout ${gitflowConfig?.develop}` },
                { icon: "merge", label: `Merge ${gitflowConfig?.hotfix_prefix}${branchName} → ${gitflowConfig?.develop}` },
                ...(createTag ? [{ icon: "tag" as const, label: `Create tag ${gitflowConfig?.versiontag_prefix}${branchName} on ${gitflowConfig?.master}` }] : []),
                { icon: "delete", label: `Delete branch ${gitflowConfig?.hotfix_prefix}${branchName}` },
              ]} />
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded bg-red-500/10 border border-red-500/30 px-3 py-2">
            <AlertTriangle size={14} className="text-red-400 shrink-0" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1 border-t border-border-40">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded bg-surface-2 hover:bg-surface-3 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={
              mode === "init" ? handleInit
              : mode === "feature-start" ? handleFeatureStart
              : mode === "feature-finish" ? handleFeatureFinish
              : mode === "release-start" ? handleReleaseStart
              : mode === "release-finish" ? handleReleaseFinish
              : mode === "hotfix-start" ? handleHotfixStart
              : handleHotfixFinish
            }
            disabled={loading || configLoading || generateTagDescription.isPending || (mode !== "init" && !branchName.trim())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
            ) : mode.includes("start") ? (
              <Plus size={13} />
            ) : mode === "init" ? (
              <Check size={13} />
            ) : (
              <Merge size={13} />
            )}
            {mode === "init" ? "Initialize GitFlow"
              : mode.includes("start") ? `Start ${mode.split("-")[0]}`
              : `Finish ${mode.split("-")[0]}`}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// --- Helper sub-components ---

function Field({
  label, value, onChange, placeholder, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-center">
        {prefix && (
          <span className="text-xs text-text-muted bg-surface-3 px-2 py-1.5 rounded-l border border-r-0 border-border-40 select-none">
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 text-xs bg-surface-1 border border-border-40 text-text-primary px-2.5 py-1.5 focus:outline-none focus:border-accent-60 transition-colors ${prefix ? "rounded-r" : "rounded"}`}
        />
      </div>
    </label>
  );
}

function SelectField({
  label, value, onChange, options, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>; prefix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-center">
        {prefix && (
          <span className="text-xs text-text-muted bg-surface-3 px-2 py-1.5 rounded-l border border-r-0 border-border-40 select-none">
            {prefix}
          </span>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 text-xs bg-surface-1 border border-border-40 text-text-primary px-2.5 py-1.5 focus:outline-none focus:border-accent-60 transition-colors appearance-none cursor-pointer ${prefix ? "rounded-r" : "rounded"}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function TagMessageField({
  label,
  value,
  onChange,
  placeholder,
  onGenerate,
  generating,
  canGenerate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onGenerate: () => void;
  generating: boolean;
  canGenerate: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between gap-2">
        <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          className="inline-flex items-center gap-1 h-6 px-2 text-3xs font-semibold rounded bg-accent/10 border border-accent/30 text-accent hover:bg-accent/15 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          title="Generate tag description from commits since the previous tag"
        >
          {generating ? (
            <span className="h-3 w-3 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
          ) : (
            <Sparkles size={11} />
          )}
          Generate
        </button>
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="text-xs bg-surface-1 border border-border-40 text-text-primary px-2.5 py-2 rounded focus:outline-none focus:border-accent-60 transition-colors resize-y min-h-24"
      />
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-border-40 bg-surface-1 text-accent focus:ring-accent/40"
      />
      <span className="text-xs text-text-primary">{label}</span>
    </label>
  );
}

function ModeTab({
  icon, label, color, active, onClick,
}: {
  icon: React.ReactNode; label: string; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
        active
          ? "bg-accent/15 text-accent border border-accent/30"
          : "text-text-muted hover:text-text-primary hover:bg-surface-2 border border-transparent"
      }`}
    >
      <span className={active ? color : ""}>{icon}</span>
      {label}
    </button>
  );
}

interface PreviewStep {
  icon: "checkout" | "merge" | "tag" | "delete";
  label: string;
  detail?: string;
}

function ActionPreview({ steps }: { steps: PreviewStep[] }) {
  return (
    <div className="rounded border border-accent/20 bg-accent/5 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-accent/15 flex items-center gap-1.5">
        <FileCode2 size={11} className="text-accent" />
        <span className="text-2xs font-semibold text-accent uppercase tracking-wider">Action Preview</span>
      </div>
      <div className="px-3 py-2 space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2 relative">
            {/* Vertical connector line */}
            {i < steps.length - 1 && (
              <div className="absolute left-[7px] top-[18px] w-px h-[calc(100%)] bg-accent/20" />
            )}
            {/* Step icon */}
            <div className="shrink-0 mt-0.5">
              {step.icon === "checkout" && <GitBranch size={11} className="text-blue-400" />}
              {step.icon === "merge" && <Merge size={11} className="text-green-400" />}
              {step.icon === "tag" && <Tag size={11} className="text-purple-400" />}
              {step.icon === "delete" && <Trash2 size={11} className="text-red-400" />}
            </div>
            {/* Step label */}
            <div className="flex-1 min-w-0 pb-1">
              <span className="text-2xs text-text-primary leading-tight">
                {step.icon === "checkout" && <ArrowRight size={9} className="inline mr-1 text-blue-400" />}
                {step.label}
              </span>
              {step.detail && (
                <span className="ml-1.5 text-3xs text-text-muted">({step.detail})</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
