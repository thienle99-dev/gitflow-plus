import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Save, GitFork } from "lucide-react";
import { api, type GitFlowConfig } from "@/api/tauri";
import { showToast } from "@/lib/toast";
import { useRepoStore } from "@/stores/repo";

export function GitFlowTab() {
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
      <div id="gitflow-config" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
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
