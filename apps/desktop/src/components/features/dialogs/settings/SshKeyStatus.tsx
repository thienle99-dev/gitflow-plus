import { useState, useEffect } from "react";
import { Key, ShieldCheck, ShieldAlert, ChevronDown, RefreshCw } from "lucide-react";
import { api, type SshKeyInfo } from "@/api/tauri";

interface SshKeyStatusProps {
  remoteProtocol?: string;
}

/**
 * Displays detected SSH keys from ~/.ssh/ and the remote protocol (HTTPS vs SSH).
 * Helps users verify their SSH setup is correct.
 */
export function SshKeyStatus({ remoteProtocol }: SshKeyStatusProps) {
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await api.remote.detectSshKeys();
      setKeys(result);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const isSsh = remoteProtocol === "ssh";
  const hasKeys = keys.length > 0;

  return (
    <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={13} className="text-text-muted" />
          <span className="text-xs font-medium text-text-primary">SSH Keys & Protocol</span>
        </div>
        <button
          onClick={() => loadKeys()}
          disabled={loading}
          className="ghost p-1 text-text-muted hover:text-text-primary rounded transition-colors"
          title="Refresh SSH keys"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Remote Protocol Badge */}
      <div className="flex items-center gap-2">
        <span className="text-2xs text-text-muted">Remote Protocol:</span>
        {remoteProtocol === "ssh" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#30d158]/10 border border-[#30d158]/20 text-2xs font-medium text-[#30d158]">
            <ShieldCheck size={10} />
            SSH
          </span>
        ) : remoteProtocol === "https" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0a84ff]/10 border border-[#0a84ff]/20 text-2xs font-medium text-[#0a84ff]">
            HTTPS
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-border text-2xs font-medium text-text-muted">
            —
          </span>
        )}
      </div>

      {/* SSH Key Summary */}
      {isSsh && (
        <div className="space-y-2">
          {hasKeys ? (
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[#30d158]" />
              <span className="text-2xs text-[#30d158] font-medium">
                {keys.length} SSH {keys.length === 1 ? "key" : "keys"} detected
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-[#ff9f0a]" />
              <span className="text-2xs text-[#ff9f0a] font-medium">
                No SSH keys found in ~/.ssh/
              </span>
            </div>
          )}

          {/* Expandable Key List */}
          {hasKeys && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-primary transition-colors"
              >
                <ChevronDown
                  size={10}
                  className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                />
                {expanded ? "Hide" : "Show"} detected keys
              </button>
              {expanded && (
                <div className="space-y-1 pl-1">
                  {keys.map((key) => (
                    <div
                      key={key.file_name}
                      className="flex items-center gap-2 text-3xs text-text-secondary"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${key.readable ? "bg-[#30d158]" : "bg-[#ff375f]"}`} />
                      <span className="font-mono">{key.file_name}</span>
                      <span className="text-text-muted">({key.key_type})</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tips */}
          <div className="text-3xs text-text-muted leading-relaxed border-t border-border-40 pt-2">
            {hasKeys
              ? "Make sure your public key is added to your Git hosting provider."
              : "Generate a key with: ssh-keygen -t ed25519 -C 'your@email.com'"}
          </div>
        </div>
      )}

      {/* HTTPS Info */}
      {remoteProtocol === "https" && (
        <div className="text-3xs text-text-muted leading-relaxed">
          Using HTTPS. Consider a Personal Access Token for authentication.
          Git credential helpers (like macOS Keychain) can store credentials securely.
        </div>
      )}
    </div>
  );
}
