import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useCommitPRStatus } from "@/queries/useCommitPRStatus";
import { CheckCircle2, XCircle, Clock, GitPullRequest, ExternalLink, Loader2 } from "lucide-react";

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: "text-[#30d158]", bg: "bg-[#30d158]/10 border-[#30d158]/20", label: "CI Passing" },
  failure: { icon: XCircle, color: "text-[#ff453a]", bg: "bg-[#ff453a]/10 border-[#ff453a]/20", label: "CI Failing" },
  pending: { icon: Clock, color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/10 border-[#ff9f0a]/20", label: "CI Pending" },
  unknown: { icon: GitPullRequest, color: "text-text-muted", bg: "bg-surface-2-40 border-border-40", label: "No CI" },
};

interface PRStatusBadgeProps {
  commitHash: string | null;
  showLabel?: boolean;
  size?: "sm" | "xs";
}

export default function PRStatusBadge({ commitHash, showLabel = true, size = "sm" }: PRStatusBadgeProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data, isLoading } = useCommitPRStatus(repoPath, commitHash);
  const openDialog = useUIStore((s) => s.openDialog);

  if (!commitHash) return null;
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-40 bg-surface-2-40 text-text-muted">
        <Loader2 size={size === "sm" ? 10 : 8} className="animate-spin" />
        {showLabel && <span className="text-[9px]">CI</span>}
      </span>
    );
  }

  if (!data || data.overall === "unknown" && data.prs.length === 0) return null;

  const cfg = STATUS_CONFIG[data.overall] || STATUS_CONFIG.unknown;
  const Icon = cfg.icon;

  const handleClick = () => {
    if (data.prs.length > 0 && data.prs[0].webUrl) {
      window.open(data.prs[0].webUrl, "_blank");
    } else {
      openDialog("merge-request");
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} cursor-pointer hover:opacity-80 transition-opacity`}
      title={
        data.prs.length > 0
          ? `PR #${data.prs[0].iid}: ${data.prs[0].title}`
          : `CI: ${cfg.label}`
      }
    >
      <Icon size={size === "sm" ? 10 : 8} />
      {showLabel && (
        <span className={size === "sm" ? "text-[9px] font-medium" : "text-[8px] font-medium"}>
          {data.prs.length > 0 ? `#${data.prs[0].iid}` : cfg.label}
        </span>
      )}
      {data.prs.length > 0 && (
        <ExternalLink size={size === "sm" ? 8 : 6} className="opacity-60" />
      )}
    </span>
  );
}
