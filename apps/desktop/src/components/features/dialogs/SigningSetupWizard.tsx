import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui";
import { useRepoStore } from "@/stores/repo";
import { showToast } from "@/lib/toast";
import { api } from "@/api/tauri";
import type { SigningKeyInfo, SigningConfig } from "@/api/tauri";
import {
  Fingerprint,
  Shield,
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Key,
} from "lucide-react";

type Step = "detect" | "choose" | "gpg-setup" | "ssh-setup" | "test";
type SigningMethod = "gpg" | "ssh";

export default function SigningSetupWizard() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const activeDialog = useUIStore((s) => s.activeDialog);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const open = activeDialog === "signing-setup";

  const [step, setStep] = useState<Step>("detect");
  const [method, setMethod] = useState<SigningMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Config state
  const [config, setConfig] = useState<SigningConfig | null>(null);
  const [keys, setKeys] = useState<SigningKeyInfo[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [emailForNewKey, setEmailForNewKey] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);

  // Detect current signing setup on mount
  useEffect(() => {
    if (!open) return;
    detectSigningSetup();
  }, [open]);

  const detectSigningSetup = async () => {
    setLoading(true);
    try {
      const [signingConfig, signingKeys] = await Promise.all([
        api.signing.getConfig(repoPath!),
        api.signing.listKeys(),
      ]);
      setConfig(signingConfig);
      setKeys(signingKeys);

      // Auto-detect method based on existing config
      if (signingConfig.signingKey) {
        if (signingConfig.gpgFormat === "ssh") {
          setMethod("ssh");
        } else {
          setMethod("gpg");
        }
        setSelectedKeyId(signingConfig.signingKey);
      } else if (signingKeys.length > 0) {
        // Default to first available key type
        const gpgKeys = signingKeys.filter((k) => k.keyType === "gpg");
        if (gpgKeys.length > 0) {
          setMethod("gpg");
          setSelectedKeyId(gpgKeys[0].keyId);
        } else {
          setMethod("ssh");
          setSelectedKeyId(signingKeys[0].keyId);
        }
      }

      setStep("choose");
    } catch (err) {
      setStep("choose");
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = async () => {
    if (!selectedKeyId) {
      showToast("Select a signing key first", "error");
      return;
    }
    setLoading(true);
    try {
      const format = method === "ssh" ? "ssh" : "openpgp";

      await api.gitConfig.set(repoPath!, "user.signingkey", selectedKeyId, "local");
      await api.gitConfig.set(repoPath!, "commit.gpgsign", "true", "local");

      if (method === "ssh") {
        await api.gitConfig.set(repoPath!, "gpg.format", "ssh", "local");
      }

      showToast("Signing configured", "success");
      setStep("test");
      setConfig((prev) =>
        prev
          ? { ...prev, signingKey: selectedKeyId, commitGpgsign: true, gpgFormat: format }
          : prev
      );
    } catch (err) {
      showToast(`Failed to configure signing: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const testSigning = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Create a test commit to verify signing works
      const testCommit = await commitSigningTest();
      if (testCommit) {
        const result = await api.signing.verify(repoPath!, testCommit);
        if (result.status === "valid") {
          setTestResult({
            success: true,
            message: `Signed with ${result.signatureType.toUpperCase()}: ${result.signerName}`,
          });
        } else {
          setTestResult({
            success: false,
            message: `Signature status: ${result.status} (type: ${result.signatureType})`,
          });
        }
      } else {
        setTestResult({ success: false, message: "No test commit was created" });
      }
    } catch (err) {
      setTestResult({ success: false, message: `${err}` });
    } finally {
      setTesting(false);
    }
  };

  const commitSigningTest = async () => {
    const testFilePath = ".gitflow-signing-test";
    const ts = Date.now();
    try {
      await api.diff.writeContent(repoPath!, testFilePath, `signing test ${ts}\n`);
      await api.commit.stage(repoPath!, testFilePath);
    } catch {
      return null;
    }

    try {
      const result = await api.commit.commit(
        repoPath!,
        "test: verify commit signing setup",
        false,
        true
      );
      return result;
    } catch {
      return null;
    }
  };

  const generateKey = async () => {
    if (!emailForNewKey) {
      showToast("Enter an email for the key", "error");
      return;
    }
    setGeneratingKey(true);
    try {
      showToast(
        "Run `gpg --batch --generate-key` in terminal. We'll detect the new key after.",
        "info"
      );

      // Refresh keys — user may have generated one externally
      const signingKeys = await api.signing.listKeys();
      setKeys(signingKeys);
      const newKeys = signingKeys.filter(
        (k) => !keys.some((ok) => ok.keyId === k.keyId)
      );
      if (newKeys.length > 0) {
        setSelectedKeyId(newKeys[0].keyId);
        showToast("New key detected", "success");
      }
    } catch (err) {
      showToast(`Failed: ${err}`, "error");
    } finally {
      setGeneratingKey(false);
    }
  };

  const resetAndClose = () => {
    setStep("detect");
    setMethod(null);
    setTestResult(null);
    setSelectedKeyId("");
    setEmailForNewKey("");
    closeDialog();
  };

  if (!open) return null;

  const gpgKeys = keys.filter((k) => k.keyType === "gpg" || k.keyType === "sec");
  const sshKeys = keys.filter((k) => k.keyType === "ssh" && k.keyId !== "gpg");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-1 border border-border rounded-mac shadow-2xl w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Fingerprint size={16} className="text-text-primary" />
            <span className="text-sm font-semibold text-text-primary">Signing Setup</span>
          </div>
          <button onClick={resetAndClose} className="ghost p-1 rounded">
            <XCircle size={14} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-surface-2/50">
          {(["detect", "choose", "gpg-setup", "ssh-setup", "test"] as const).map((s) => {
            const idx = ["detect", "choose", "gpg-setup", "ssh-setup", "test"].indexOf(s);
            const curIdx = ["detect", "choose", "gpg-setup", "ssh-setup", "test"].indexOf(step);
            const done = idx < curIdx;
            const active = s === step;
            const skipped = (s === "gpg-setup" && method !== "gpg") || (s === "ssh-setup" && method !== "ssh");
            if (skipped) return null;
            return (
              <div key={s} className="flex items-center gap-1">
                {idx > 0 && <div className={`h-px w-3 ${done ? "bg-[#30d158]" : "bg-border"}`} />}
                <span
                  className={`text-3xs px-1.5 py-0.5 rounded-full ${
                    done
                      ? "bg-[#30d158]/10 text-[#30d158]"
                      : active
                        ? "bg-accent/10 text-accent"
                        : "text-text-muted"
                  }`}
                >
                  {done ? "✓" : active ? "●" : "○"} {s === "detect" ? "Detect" : s === "choose" ? "Key" : s === "gpg-setup" ? "GPG" : s === "ssh-setup" ? "SSH" : "Test"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-text-muted" />
            </div>
          )}

          {/* Step: choose */}
          {!loading && step === "choose" && (
            <div className="space-y-4">
              {/* Current config summary */}
              {config && (config.signingKey || config.commitGpgsign) && (
                <div className="p-3 rounded-mac bg-surface-2 border border-border space-y-1">
                  <div className="text-xs font-medium text-text-primary">Current Configuration</div>
                  <div className="text-3xs text-text-muted font-mono">
                    {config.signingKey
                      ? `user.signingkey = ${config.signingKey.substring(0, 16)}…`
                      : "user.signingkey = (not set)"}
                  </div>
                  <div className="text-3xs text-text-muted font-mono">
                    commit.gpgsign = {config.commitGpgsign ? "true" : "false"}
                  </div>
                  {config.gpgFormat && (
                    <div className="text-3xs text-text-muted font-mono">
                      gpg.format = {config.gpgFormat}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-text-muted">
                Configure commit signing for this repository. Choose a signing method:
              </div>

              {/* Method Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setMethod("gpg");
                    const first = gpgKeys.length > 0 ? gpgKeys[0] : null;
                    if (first) setSelectedKeyId(first.keyId);
                    setStep("gpg-setup");
                  }}
                  className={`p-4 rounded-mac border transition-all text-left ${
                    method === "gpg"
                      ? "border-[#30d158] bg-[#30d158]/5"
                      : "border-border hover:border-border-60"
                  }`}
                >
                  <Shield size={20} className={method === "gpg" ? "text-[#30d158]" : "text-text-muted"} />
                  <div className="text-sm font-medium mt-2">GPG Key</div>
                  <div className="text-3xs text-text-muted mt-1">
                    OpenPGP / GnuPG — standard Git signing
                  </div>
                  {gpgKeys.length > 0 && (
                    <div className="text-3xs text-[#30d158] mt-1">
                      {gpgKeys.length} key{gpgKeys.length > 1 ? "s" : ""} available
                    </div>
                  )}
                </button>

                <button
                  onClick={() => {
                    setMethod("ssh");
                    const first = sshKeys.length > 0 ? sshKeys[0] : null;
                    if (first) setSelectedKeyId(first.keyId);
                    setStep("ssh-setup");
                  }}
                  className={`p-4 rounded-mac border transition-all text-left ${
                    method === "ssh"
                      ? "border-[#0a84ff] bg-[#0a84ff]/5"
                      : "border-border hover:border-border-60"
                  }`}
                >
                  <Key size={20} className={method === "ssh" ? "text-[#0a84ff]" : "text-text-muted"} />
                  <div className="text-sm font-medium mt-2">SSH Key</div>
                  <div className="text-3xs text-text-muted mt-1">
                    Use existing SSH key for signing
                  </div>
                  {sshKeys.length > 0 && (
                    <div className="text-3xs text-[#0a84ff] mt-1">
                      {sshKeys.length} key{sshKeys.length > 1 ? "s" : ""} available
                    </div>
                  )}
                </button>
              </div>

              {/* Available keys summary */}
              {keys.length > 0 && (
                <div className="p-3 rounded-mac bg-surface-2 border border-border space-y-1">
                  <div className="text-xs font-medium text-text-primary">Detected Keys</div>
                  {gpgKeys.map((k) => (
                    <div key={k.keyId} className="flex items-center gap-2 text-3xs">
                      <Fingerprint size={10} className="text-[#30d158]" />
                      <span className="font-mono">
                        {k.keyId.substring(0, 16)}…
                      </span>
                      {k.name && <span className="text-text-muted">({k.name})</span>}
                    </div>
                  ))}
                  {sshKeys.map((k) => (
                    <div key={k.keyId} className="flex items-center gap-2 text-3xs">
                      <Key size={10} className="text-[#0a84ff]" />
                      <span className="font-mono">{k.keyId}.pub</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: gpg-setup */}
          {!loading && step === "gpg-setup" && method === "gpg" && (
            <div className="space-y-4">
              <div className="text-xs text-text-muted">
                Select a GPG key for signing commits, or generate a new one.
              </div>

              {/* Existing GPG keys */}
              {gpgKeys.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium">Available GPG Keys</div>
                  {gpgKeys.map((k) => (
                    <label
                      key={k.keyId}
                      className={`flex items-center gap-3 p-3 rounded-mac border cursor-pointer transition-all ${
                        selectedKeyId === k.keyId
                          ? "border-[#30d158] bg-[#30d158]/5"
                          : "border-border hover:bg-surface-2"
                      }`}
                    >
                      <input
                        type="radio"
                        name="gpg-key"
                        checked={selectedKeyId === k.keyId}
                        onChange={() => setSelectedKeyId(k.keyId)}
                        className="accent-[#30d158]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate">
                          {k.keyId.substring(0, 20)}…{k.keyId.substring(k.keyId.length - 8)}
                        </div>
                        {k.name && (
                          <div className="text-3xs text-text-muted truncate">{k.name}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* No keys */}
              {gpgKeys.length === 0 && (
                <div className="p-4 rounded-mac bg-surface-2 border border-border text-center">
                  <div className="text-xs text-text-muted mb-3">
                    No GPG keys found. Generate one below, or use <code className="text-text-primary">gpg --full-generate-key</code> in terminal.
                  </div>
                </div>
              )}

              {/* Generate new key */}
              <div className="space-y-2">
                <div className="text-xs text-text-muted">Generate new GPG key</div>
                <input
                  type="email"
                  value={emailForNewKey}
                  onChange={(e) => setEmailForNewKey(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-mac focus:outline-none focus:border-[#30d158]"
                />
                <button
                  onClick={generateKey}
                  disabled={generatingKey || !emailForNewKey}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#30d158] text-black rounded-mac hover:opacity-90 disabled:opacity-50"
                >
                  {generatingKey ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  Generate Key
                </button>
              </div>
            </div>
          )}

          {/* Step: ssh-setup */}
          {!loading && step === "ssh-setup" && method === "ssh" && (
            <div className="space-y-4">
              <div className="text-xs text-text-muted">
                Select an SSH key for commit signing. Git will use the SSH key's public half for verification.
              </div>

              {/* SSH keys */}
              {sshKeys.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium">Available SSH Keys</div>
                  {sshKeys.map((k) => (
                    <label
                      key={k.keyId}
                      className={`flex items-center gap-3 p-3 rounded-mac border cursor-pointer transition-all ${
                        selectedKeyId === k.keyId
                          ? "border-[#0a84ff] bg-[#0a84ff]/5"
                          : "border-border hover:bg-surface-2"
                      }`}
                    >
                      <input
                        type="radio"
                        name="ssh-key"
                        checked={selectedKeyId === k.keyId}
                        onChange={() => setSelectedKeyId(k.keyId)}
                        className="accent-[#0a84ff]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate">{k.keyId}</div>
                        {k.name && (
                          <div className="text-3xs text-text-muted truncate">{k.name}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {sshKeys.length === 0 && (
                <div className="p-4 rounded-mac bg-surface-2 border border-border text-center">
                  <Key size={20} className="mx-auto text-text-muted mb-2" />
                  <div className="text-xs text-text-muted">
                    No SSH keys found in <code className="text-text-primary">~/.ssh/</code>.
                    Generate one via <span className="text-text-primary cursor-pointer hover:text-accent" onClick={() => { resetAndClose(); setTimeout(() => useUIStore.getState().openDialog("auth-setup"), 0); }}>Auth Setup Wizard</span> or <code className="text-text-primary">ssh-keygen</code>.
                  </div>
                </div>
              )}

              {/* SSH allowed signers note */}
              <div className="p-3 rounded-mac bg-surface-2 border border-border">
                <div className="text-3xs text-text-muted">
                  <div className="font-medium text-text-primary mb-1">SSH Allowed Signers</div>
                  To verify SSH-signed commits, configure <code className="text-text-primary">gpg.ssh.allowedSignersFile</code> in git config pointing to a file containing your public key:
                  <div className="mt-2 p-2 bg-black/20 rounded font-mono text-3xs break-all select-all">
                    {repoPath ? `git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers` : ""}
                  </div>
                  <div className="mt-2">
                    Each line: <code className="text-text-primary">your@email.com ssh-ed25519 AAA…</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: test */}
          {!loading && step === "test" && (
            <div className="space-y-4">
              {config && (
                <div className="p-3 rounded-mac bg-surface-2 border border-border space-y-1">
                  <div className="text-xs font-medium text-text-primary">Applied Configuration</div>
                  <div className="text-3xs text-text-muted font-mono">
                    user.signingkey = {config.signingKey ? `${config.signingKey.substring(0, 16)}…` : selectedKeyId.substring(0, 16)}
                  </div>
                  <div className="text-3xs text-text-muted font-mono">
                    commit.gpgsign = true
                  </div>
                  <div className="text-3xs text-text-muted font-mono">
                    gpg.format = {config.gpgFormat || method}
                  </div>
                </div>
              )}

              <div className="text-xs text-text-muted">
                Click "Test Signing" to create a test commit and verify the signature.
                A file named <code className="text-text-primary">.gitflow-signing-test</code> will be committed and then verified.
              </div>

              {testResult && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-mac border ${
                    testResult.success
                      ? "bg-[#30d158]/5 border-[#30d158]/20"
                      : "bg-[#ff453a]/5 border-[#ff453a]/20"
                  }`}
                >
                  {testResult.success ? (
                    <ShieldCheck size={14} className="text-[#30d158] mt-0.5 shrink-0" />
                  ) : (
                    <ShieldX size={14} className="text-[#ff453a] mt-0.5 shrink-0" />
                  )}
                  <div className="text-xs text-text-primary">{testResult.message}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button
            onClick={() => {
              if (step === "choose") {
                resetAndClose();
              } else if (step === "gpg-setup" || step === "ssh-setup") {
                setStep("choose");
              } else if (step === "test") {
                setMethod(null);
                setTestResult(null);
                setStep("choose");
              }
            }}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
          >
            <ArrowLeft size={12} /> Back
          </button>

          <div className="flex items-center gap-2">
            {/* Test button */}
            {(step === "test") && (
              <button
                onClick={testSigning}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-mac hover:opacity-90 disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Test Signing
              </button>
            )}

            {/* Configure button */}
            {(step === "gpg-setup" || step === "ssh-setup") && selectedKeyId && (
              <button
                onClick={handleConfigure}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#30d158] text-black rounded-mac hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ArrowRight size={12} />
                )}
                Apply & Test
              </button>
            )}

            {/* Done button */}
            {testResult?.success && (
              <button
                onClick={resetAndClose}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#30d158] text-black rounded-mac hover:opacity-90"
              >
                <CheckCircle2 size={12} /> Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
