import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { showToast } from "@/lib/toast";
import { api } from "@/api/tauri";
import {
  Key,
  Shield,
  Github,
  Gitlab,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  RefreshCw,
  Terminal,
  Loader2,
  ExternalLink,
  Lock,
} from "lucide-react";

type AuthMethod = "ssh" | "https";
type Step = "detect" | "choose" | "ssh-setup" | "https-setup" | "test";

interface SshKeyInfo {
  file_name: string;
  key_type: string;
  readable: boolean;
}

export default function AuthSetupWizard() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { open } = useUIStore((s) => s.dialogs["auth-setup"] || { open: false, onClose: () => {} });
  const closeDialog = useUIStore((s) => s.closeDialog);
  const onClose = useUIStore((s) => s.closeDialog) as () => void;
  const [step, setStep] = useState<Step>("detect");
  const [method, setMethod] = useState<AuthMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // SSH state
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  const [newKeyEmail, setNewKeyEmail] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // HTTPS state
  const [token, setToken] = useState("");
  const [host, setHost] = useState<"github" | "gitlab">("github");

  // Detect current auth on mount
  useEffect(() => {
    if (!open) return;
    detectAuth();
  }, [open]);

  const detectAuth = async () => {
    setLoading(true);
    try {
      const sshKeys = await api.remote.detectSshKeys();
      setKeys(sshKeys);
      const remoteUrl = await api.remote.getRemoteUrl(repoPath!);
      // Auto-detect method
      if (remoteUrl?.startsWith("git@") || remoteUrl?.includes(":git")) {
        setMethod("ssh");
      } else if (remoteUrl?.startsWith("https://")) {
        setMethod("https");
      }
      setStep("choose");
    } catch {
      setStep("choose");
    } finally {
      setLoading(false);
    }
  };

  const generateSshKey = async () => {
    if (!newKeyEmail) {
      showToast("Please enter your email", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await api.remote.generateSshKey(repoPath!, newKeyEmail);
      setGeneratedKey(result.publicKey);
      // Refresh key list
      const sshKeys = await api.remote.detectSshKeys();
      setKeys(sshKeys);
      showToast("SSH key generated", "success");
    } catch (err) {
      showToast(`Failed: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = method === "ssh"
        ? await api.remote.testSshConnection(repoPath!)
        : await api.remote.testHttpsToken(repoPath!, token);
      setTestResult({ success: result, message: result ? "Connected!" : "Failed to connect" });
    } catch (err) {
      setTestResult({ success: false, message: `${err}` });
    } finally {
      setTesting(false);
    }
  };

  const resetAndClose = () => {
    setStep("detect");
    setMethod(null);
    setTestResult(null);
    setGeneratedKey(null);
    setToken("");
    closeDialog("auth-setup");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-1 border border-border rounded-mac shadow-2xl w-[480px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-text-primary" />
            <span className="text-sm font-semibold text-text-primary">Auth Setup</span>
          </div>
          <button onClick={resetAndClose} className="ghost p-1 rounded">
            <XCircle size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-text-muted" />
            </div>
          )}

          {!loading && step === "choose" && (
            <div className="space-y-4">
              <div className="text-xs text-text-muted">
                Choose authentication method for this repository.
              </div>

              {/* Method Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setMethod("ssh");
                    setStep("ssh-setup");
                  }}
                  className={`p-4 rounded-mac border transition-all ${
                    method === "ssh"
                      ? "border-[#30d158] bg-[#30d158]/5"
                      : "border-border hover:border-border-60"
                  }`}
                >
                  <Key size={20} className={method === "ssh" ? "text-[#30d158]" : "text-text-muted"} />
                  <div className="text-sm font-medium mt-2">SSH Key</div>
                  <div className="text-3xs text-text-muted mt-1">
                    Use existing or generate new SSH key
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMethod("https");
                    setStep("https-setup");
                  }}
                  className={`p-4 rounded-mac border transition-all ${
                    method === "https"
                      ? "border-[#0a84ff] bg-[#0a84ff]/5"
                      : "border-border hover:border-border-60"
                  }`}
                >
                  <Lock size={20} className={method === "https" ? "text-[#0a84ff]" : "text-text-muted"} />
                  <div className="text-sm font-medium mt-2">HTTPS Token</div>
                  <div className="text-3xs text-text-muted mt-1">
                    Personal Access Token
                  </div>
                </button>
              </div>
            </div>
          )}

          {!loading && step === "ssh-setup" && method === "ssh" && (
            <div className="space-y-4">
              {/* Existing Keys */}
              {keys.length > 0 && (
                <div className="p-3 rounded-mac bg-surface-2 border border-border">
                  <div className="text-xs font-medium mb-2">Detected SSH Keys</div>
                  {keys.map((key) => (
                    <div key={key.file_name} className="flex items-center gap-2 text-3xs">
                      <CheckCircle2 size={10} className="text-[#30d158]" />
                      <span className="font-mono">{key.file_name}</span>
                    </div>
                  ))}
                </div>
              )}

              {keys.length === 0 && (
                <div className="text-xs text-text-muted">
                  No SSH keys detected. Generate one below.
                </div>
              )}

              {/* Generate */}
              <div className="space-y-2">
                <label className="text-xs text-text-muted">Generate new key</label>
                <input
                  type="email"
                  value={newKeyEmail}
                  onChange={(e) => setNewKeyEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-mac focus:outline-none focus:border-[#30d158]"
                />
                <button
                  onClick={generateSshKey}
                  disabled={loading}
                  className="px-3 py-2 text-sm font-medium bg-[#30d158] text-black rounded-mac hover:opacity-90"
                >
                  Generate SSH Key
                </button>
              </div>

              {/* Generated Key */}
              {generatedKey && (
                <div className="space-y-2">
                  <div className="text-xs font-medium">Public Key (add to provider)</div>
                  <div className="p-2 bg-surface-2 rounded-mac font-mono text-3xs break-all max-h-24 overflow-y-auto">
                    {generatedKey}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedKey!)}
                    className="flex items-center gap-1 text-3xs text-text-muted hover:text-text-primary"
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && step === "https-setup" && method === "https" && (
            <div className="space-y-4">
              {/* Host Selection */}
              <div className="space-y-2">
                <label className="text-xs text-text-muted">Git Provider</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHost("github")}
                    className={`flex-1 p-3 rounded-mac border flex items-center gap-2 ${
                      host === "github" ? "border-[#30d158]" : "border-border"
                    }`}
                  >
                    <Github size={16} />
                    GitHub
                  </button>
                  <button
                    onClick={() => setHost("gitlab")}
                    className={`flex-1 p-3 rounded-mac border flex items-center gap-2 ${
                      host === "gitlab" ? "border-[#fc6d26]" : "border-border"
                    }`}
                  >
                    <Gitlab size={16} />
                    GitLab
                  </button>
                </div>
              </div>

              {/* Token Input */}
              <div className="space-y-2">
                <label className="text-xs text-text-muted">
                  {host === "github" ? "Personal Access Token" : "GitLab Token"}
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={host === "github" ? "ghp_xxxx..." : "glpat-xxxx..."}
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-mac focus:outline-none focus:border-[#0a84ff]"
                />
                <a
                  href={host === "github" ? "https://github.com/settings/tokens" : "https://gitlab.com/-/profile/personal_access_tokens"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-3xs text-[#0a84ff] hover:underline"
                >
                  <ExternalLink size={10} /> Generate token on {host === "github" ? "GitHub" : "GitLab"}
                </a>
              </div>

              {/* Credential Helper */}
              <div className="p-3 rounded-mac bg-surface-2 border border-border text-3xs text-text-muted">
                <div className="font-medium mb-1">macOS Keychain</div>
                <code className="text-text-muted">git config --global credential.helper osxkeychain</code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button
            onClick={() => step === "choose" ? setStep("detect") : setStep("choose")}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
          >
            <ArrowLeft size={12} /> Back
          </button>

          {step !== "choose" && (
            <button
              onClick={testConnection}
              disabled={testing || (method === "https" && !token)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#30d158] text-black rounded-mac hover:opacity-90 disabled:opacity-50"
            >
              {testing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Test Connection
            </button>
          )}

          {testResult && (
            <div className={`flex items-center gap-1 text-xs ${testResult.success ? "text-[#30d158]" : "text-[#ff453a]"}`}>
              {testResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}