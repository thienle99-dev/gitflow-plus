import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Save, ShieldAlert, GitFork } from "lucide-react";
import { Switch } from "@/components/ui/form";
import { api, type GitFlowConfig } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { useRepoStore } from "@/stores/repo";

interface GitTabProps {
  autoFetch: boolean;
  setAutoFetch: (v: boolean) => void;
  fetchInterval: number;
  setFetchInterval: (v: number) => void;
  autoPrune: boolean;
  setAutoPrune: (v: boolean) => void;
  confirmDangerous: boolean;
  setConfirmDangerous: (v: boolean) => void;

  commitLintEnabled: boolean;
  setCommitLintEnabled: (v: boolean) => void;
  codeLintEnabled: boolean;
  setCodeLintEnabled: (v: boolean) => void;
  lintStrictness: "warning" | "error" | "block_all";
  setLintStrictness: (v: "warning" | "error" | "block_all") => void;
}

export function GitTab({
  autoFetch,
  setAutoFetch,
  fetchInterval,
  setFetchInterval,
  autoPrune,
  setAutoPrune,
  confirmDangerous,
  setConfirmDangerous,

  commitLintEnabled,
  setCommitLintEnabled,
  codeLintEnabled,
  setCodeLintEnabled,
  lintStrictness,
  setLintStrictness,
}: GitTabProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [gitflowConfig, setGitflowConfig] = useState<GitFlowConfig>({
    initialized: false,
    master: "main",
    develop: "develop",
    feature_prefix: "feature/",
    release_prefix: "release/",
    hotfix_prefix: "hotfix/",
    versiontag_prefix: "v",
  });
  const [loadingGitflow, setLoadingGitflow] = useState(false);
  const [savingGitflow, setSavingGitflow] = useState(false);

  useEffect(() => {
    if (!repoPath) return;

    let cancelled = false;
    setLoadingGitflow(true);
    api.gitflow.detect(repoPath)
      .then((config) => {
        if (!cancelled) setGitflowConfig(config);
      })
      .catch((err) => {
        if (!cancelled) {
          console.debug("[settings] gitflow detect failed", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingGitflow(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repoPath]);

  const updateGitflowField = (field: keyof GitFlowConfig, value: string) => {
    setGitflowConfig((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveGitflow = async () => {
    if (!repoPath) return;

    setSavingGitflow(true);
    try {
      const updated = await api.gitflow.updateConfig(
        repoPath,
        gitflowConfig.master,
        gitflowConfig.develop,
        gitflowConfig.feature_prefix,
        gitflowConfig.release_prefix,
        gitflowConfig.hotfix_prefix,
        gitflowConfig.versiontag_prefix,
      );
      setGitflowConfig(updated);
      showToast("GitFlow configuration saved");
      window.dispatchEvent(new Event("gitflow-settings-updated"));
    } catch (err) {
      showToast(`Failed to save GitFlow config: ${err}`, "error");
    } finally {
      setSavingGitflow(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* GitFlow Configuration Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1">
              <GitFork size={13} className="text-accent" />
              GitFlow Configuration
            </div>
            <p className="text-2xs text-text-muted leading-normal">
              Edit the repository GitFlow branch names and prefixes stored in <code>.git/config</code>.
            </p>
          </div>
          {loadingGitflow && <Loader2 size={13} className="animate-spin text-text-muted shrink-0 mt-0.5" />}
        </div>

        {!repoPath ? (
          <div className="rounded-mac border border-border-40 bg-surface-1 p-2.5 text-2xs text-text-muted">
            Open a repository to edit GitFlow configuration.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <GitFlowField
                label="Main branch"
                value={gitflowConfig.master}
                onChange={(value) => updateGitflowField("master", value)}
                placeholder="main"
              />
              <GitFlowField
                label="Develop branch"
                value={gitflowConfig.develop}
                onChange={(value) => updateGitflowField("develop", value)}
                placeholder="develop"
              />
              <GitFlowField
                label="Feature prefix"
                value={gitflowConfig.feature_prefix}
                onChange={(value) => updateGitflowField("feature_prefix", value)}
                placeholder="feature/"
              />
              <GitFlowField
                label="Release prefix"
                value={gitflowConfig.release_prefix}
                onChange={(value) => updateGitflowField("release_prefix", value)}
                placeholder="release/"
              />
              <GitFlowField
                label="Hotfix prefix"
                value={gitflowConfig.hotfix_prefix}
                onChange={(value) => updateGitflowField("hotfix_prefix", value)}
                placeholder="hotfix/"
              />
              <GitFlowField
                label="Version tag prefix"
                value={gitflowConfig.versiontag_prefix}
                onChange={(value) => updateGitflowField("versiontag_prefix", value)}
                placeholder="v"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border-40 pt-3">
              <span className="text-2xs text-text-muted">
                {gitflowConfig.initialized ? "GitFlow is configured for this repository." : "Saving will create a GitFlow config section."}
              </span>
              <button
                type="button"
                onClick={handleSaveGitflow}
                disabled={savingGitflow || loadingGitflow}
                className="h-7 px-3 text-xs font-medium rounded-mac bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {savingGitflow ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save GitFlow
              </button>
            </div>
          </>
        )}
      </div>

      {/* Background Synchronization Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div>
          <Switch
            checked={autoFetch}
            onChange={setAutoFetch}
            label="Enable Background Auto-Fetch"
            description="Periodically refresh upstream status while a repository is open."
          />
        </div>
        <div className={`border-t border-border-40 pt-3 flex items-center justify-between gap-4 transition-opacity ${!autoFetch ? "opacity-40" : ""}`}>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary">Fetch Interval</span>
            <span className="text-2xs text-text-muted mt-0.5 leading-normal">How frequently GitFlow queries remotes for background updates.</span>
          </div>
          <div className="relative w-40 shrink-0">
            <select
              value={fetchInterval}
              onChange={(e) => setFetchInterval(Number(e.target.value))}
              disabled={!autoFetch}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all disabled:cursor-not-allowed"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Launch Preferences Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <Switch
          checked={autoPrune}
          onChange={setAutoPrune}
          label="Prune deleted remote branches during fetch"
          description="Automatically clean up stale remote-tracking references during fetch operations."
        />
        
        <div className="border-t border-border-40 pt-2.5">
          <Switch
            checked={confirmDangerous}
            onChange={setConfirmDangerous}
            label="Confirm destructive actions"
            description="Show confirmation modals before carrying out dangerous Git tasks (force push, discard shifts)."
          />
        </div>


      </div>

      {/* Pre-Commit Quality Gates Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1">
          <ShieldAlert size={13} className="text-accent" />
          Pre-Commit Quality Gates
        </div>

        <Switch
          checked={commitLintEnabled}
          onChange={setCommitLintEnabled}
          label="Enable Commit Message Linting"
          description="Validate commit messages against Conventional Commits spec before committing."
        />

        <div className="border-t border-border-40 pt-2.5">
          <Switch
            checked={codeLintEnabled}
            onChange={setCodeLintEnabled}
            label="Enable Code Quality Linting"
            description="Run project linters (ESLint, Biome, Ruff, golangci-lint, Cargo Clippy) on staged files."
          />
        </div>

        <div className={`border-t border-border-40 pt-3 flex items-center justify-between gap-4 transition-opacity ${(!commitLintEnabled && !codeLintEnabled) ? "opacity-40" : ""}`}>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary">Gate Strictness Policy</span>
            <span className="text-2xs text-text-muted mt-0.5 leading-normal">Configure strictness behavior when linter issues or format warnings are found.</span>
          </div>
          <div className="relative w-48 shrink-0">
            <select
              value={lintStrictness}
              onChange={(e) => setLintStrictness(e.target.value as "warning" | "error" | "block_all")}
              disabled={!commitLintEnabled && !codeLintEnabled}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all disabled:cursor-not-allowed"
            >
              <option value="warning">Warning only (allow skip)</option>
              <option value="error">Block on errors (allow skip warnings)</option>
              <option value="block_all">Block all (strictly forbid skip)</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GitFlowField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-2xs font-semibold text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full h-8 px-2.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent hover:bg-surface-2 transition-all"
      />
    </label>
  );
}
