interface IntegrationsTabProps {
  githubToken: string;
  setGithubToken: (v: string) => void;
  gitlabToken: string;
  setGitlabToken: (v: string) => void;
  gitlabHost: string;
  setGitlabHost: (v: string) => void;
}

export function IntegrationsTab({
  githubToken,
  setGithubToken,
  gitlabToken,
  setGitlabToken,
  gitlabHost,
  setGitlabHost,
}: IntegrationsTabProps) {
  return (
    <div className="space-y-4">
      {/* GitHub Card */}
      <div id="accounts-github" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[5px] bg-[#24292f] dark:bg-[#e6edf2] flex items-center justify-center text-white dark:text-[#24292f] shrink-0">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-text-primary">GitHub Integration</span>
        </div>
        <div className="space-y-1.5 pt-1">
          <label className="block text-2xs font-semibold text-text-secondary">
            Personal Access Token (PAT)
          </label>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_..."
            className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
          />
          <p className="text-3xs text-text-muted leading-normal">
            Requires `repo` scope to list pull requests, view diffs, and fetch branches.
          </p>
        </div>
      </div>

      {/* GitLab Card */}
      <div id="accounts-gitlab" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[5px] bg-[#e24329] flex items-center justify-center text-white shrink-0">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
              <path d="M15.97 9.076a.54.54 0 00-.196-.606l-1.07-1.075L8 14.7l6.705-7.305-1.07-1.075a.54.54 0 00-.197-.606L8 1 2.563 6.015a.54.54 0 00-.196.606l-1.07 1.075L8 14.7.227 6.315a.54.54 0 00-.197-.606L8 1l5.437 5.015z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-text-primary">GitLab Integration</span>
        </div>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="block text-2xs font-semibold text-text-secondary">
              Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={gitlabToken}
              onChange={(e) => setGitlabToken(e.target.value)}
              placeholder="glpat-..."
              className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
            />
          </div>
          <div className="space-y-1.5 border-t border-border-40 pt-3">
            <label className="block text-2xs font-semibold text-text-secondary">
              Custom Host / Self-Hosted Instance (Optional)
            </label>
            <input
              type="text"
              value={gitlabHost}
              onChange={(e) => setGitlabHost(e.target.value)}
              placeholder="e.g. https://gitlab.yourcompany.com"
              className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
            />
            <p className="text-3xs text-text-muted leading-normal">
              Leave blank to use public cloud GitLab (https://gitlab.com).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
