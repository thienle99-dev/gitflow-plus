import { useState } from "react";
import { Lock, User, KeyRound, Terminal, ExternalLink, X } from "lucide-react";

interface CredentialPromptProps {
  open: boolean;
  error: string;
  onCredentials: (username: string, password: string) => void;
  onClose: () => void;
}

/**
 * Inline credential prompt shown when a git operation fails with an auth error.
 * Provides username/password fields for HTTPS repos, and tips for SSH repos.
 */
export default function CredentialPrompt({ open, error, onCredentials, onClose }: CredentialPromptProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (!open) return null;

  const isSshError = /publickey|ssh|key (is invalid|not found|not recognised)/i.test(error);
  const isHttpsError = /could not read.*?(password|credential)|authentication failed/i.test(error);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    onCredentials(username.trim(), password.trim());
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/65 backdrop-blur-md z-[9998] flex items-center justify-center p-6 anim-overlay-enter">
      <div className="w-full max-w-sm bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden anim-dialog-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1-40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#ff9f0a]/15 flex items-center justify-center">
              <Lock size={12} className="text-[#ff9f0a]" />
            </div>
            <span className="text-sm font-semibold text-text-primary">Authentication Required</span>
          </div>
          <button
            onClick={onClose}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded"
          >
            <X size={14} />
          </button>
        </div>

        {/* Error Summary */}
        <div className="px-4 pt-3">
          <div className="text-2xs text-[#ff9f0a] bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 rounded px-2.5 py-1.5 leading-tight">
            {error.replace(/^fatal:\s*/i, "").replace(/^error:\s*/i, "").slice(0, 150)}
          </div>
        </div>

        {isSshError ? (
          /* SSH Error Tips */
          <div className="p-4 space-y-3">
            <div className="text-xs text-text-primary font-medium flex items-center gap-1.5">
              <Terminal size={12} className="text-accent" />
              SSH Authentication Issue
            </div>
            <div className="space-y-2 text-2xs text-text-secondary leading-relaxed">
              <p>This appears to be an SSH authentication error. Make sure:</p>
              <ul className="list-none space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">1.</span>
                  <span>Your SSH key is added to <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">ssh-agent</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">2.</span>
                  <span>The public key is added to your Git hosting provider (GitHub/GitLab/etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">3.</span>
                  <span>Your SSH key has the correct permissions (<code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">chmod 600 ~/.ssh/id_*</code>)</span>
                </li>
              </ul>
            </div>
            <button
              onClick={onClose}
              className="w-full h-8 bg-surface-2 border border-border text-xs text-text-primary rounded hover:bg-surface-3 transition-colors"
            >
              Dismiss
            </button>
          </div>
        ) : (
          /* HTTPS Credential Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <p className="text-2xs text-text-secondary leading-relaxed">
              Enter your credentials for this HTTPS repository. For GitHub/GitLab, consider using a
              <span className="text-accent"> Personal Access Token</span> instead of your password.
            </p>

            {/* Username */}
            <div className="space-y-1">
              <label className="text-2xs font-medium text-text-muted flex items-center gap-1">
                <User size={10} />
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. your-username or oauth2:token"
                className="w-full text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            {/* Password / Token */}
            <div className="space-y-1">
              <label className="text-2xs font-medium text-text-muted flex items-center gap-1">
                <KeyRound size={10} />
                Password / Access Token
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Personal access token or password"
                className="w-full text-xs bg-surface-2 border border-border rounded px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!username.trim() || !password.trim()}
                className="flex-1 h-8 bg-accent text-accent-fg text-xs font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <Lock size={11} />
                Authenticate & Retry
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 h-8 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-1.5 text-3xs text-text-muted">
              <ExternalLink size={9} className="shrink-0 mt-0.5" />
              <span>
                For GitHub: Settings → Developer Settings → Personal Access Tokens.
                For GitLab: Preferences → Access Tokens.
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
