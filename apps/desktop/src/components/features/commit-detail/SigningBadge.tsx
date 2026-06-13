import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldX, ShieldQuestion, Loader2 } from "lucide-react";
import { api } from "@/api/tauri";

const STATUS_CONFIG = {
  valid: {
    icon: ShieldCheck,
    color: "text-[#30d158]",
    bg: "bg-[#30d158]/10 border-[#30d158]/20",
    label: "Signed",
  },
  bad: {
    icon: ShieldX,
    color: "text-[#ff453a]",
    bg: "bg-[#ff453a]/10 border-[#ff453a]/20",
    label: "Invalid",
  },
  unverified: {
    icon: ShieldQuestion,
    color: "text-text-muted",
    bg: "bg-surface-2-40 border-border-40",
    label: "Unsigned",
  },
};

interface SigningBadgeProps {
  repoPath: string | null;
  commitHash: string | null;
  showLabel?: boolean;
  showSigner?: boolean;
  size?: "sm" | "xs";
}

export default function SigningBadge({
  repoPath,
  commitHash,
  showLabel = true,
  showSigner = false,
  size = "sm",
}: SigningBadgeProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["signing", repoPath, commitHash],
    queryFn: () => api.signing.verify(repoPath!, commitHash!),
    enabled: !!repoPath && !!commitHash,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  if (!repoPath || !commitHash) return null;
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-40 bg-surface-2-40">
        <Loader2 size={size === "sm" ? 10 : 8} className="animate-spin text-text-muted" />
        {showLabel && <span className="text-[9px] text-text-muted">GPG</span>}
      </span>
    );
  }

  if (!data || data.status === "unverified" || data.status === "none") {
    return null; // Don't show badge for unsigned commits by default
  }

  const cfg = STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unverified;
  const Icon = cfg.icon;

  const title = showSigner && data.signerName
    ? `${data.signatureType.toUpperCase()} signed by ${data.signerName} <${data.signerEmail}>`
    : `${data.status}: ${cfg.label}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}
      title={title}
    >
      <Icon size={size === "sm" ? 10 : 8} />
      {showLabel && (
        <span className="text-[9px] font-medium">
          {data.signerName && showSigner ? data.signerName.split(" ")[0] : cfg.label}
        </span>
      )}
    </span>
  );
}

// Hook to check if commit is signed (returns boolean for quick checks)
export function useHasSignature(repoPath: string | null, commitHash: string | null) {
  const { data } = useQuery({
    queryKey: ["hasSignature", repoPath, commitHash],
    queryFn: () => api.signing.hasSignature(repoPath!, commitHash!),
    enabled: !!repoPath && !!commitHash,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? false;
}

// Hook to list available signing keys
export function useSigningKeys() {
  return useQuery({
    queryKey: ["signingKeys"],
    queryFn: () => api.signing.listKeys(),
    staleTime: 60 * 1000, // 1 min
  });
}