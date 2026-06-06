import { type ReactNode } from "react";
import {
  FileDiff,
  GitCommitHorizontal,
  GitBranch,
  Search,
  FolderOpen,
  Tag,
  Archive,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export type EmptyStateVariant =
  | "changes"
  | "commits"
  | "branches"
  | "tags"
  | "search"
  | "repo"
  | "stash"
  | "generic";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  { icon: LucideIcon; color: string; bgColor: string }
> = {
  changes: { icon: FileDiff, color: "text-text-muted", bgColor: "bg-surface-2-40" },
  commits: { icon: GitCommitHorizontal, color: "text-text-muted", bgColor: "bg-surface-2-40" },
  branches: { icon: GitBranch, color: "text-text-muted", bgColor: "bg-surface-2-40" },
  tags: { icon: Tag, color: "text-text-muted", bgColor: "bg-surface-2-40" },
  search: { icon: Search, color: "text-text-muted", bgColor: "bg-surface-2-40" },
  repo: { icon: FolderOpen, color: "text-text-muted", bgColor: "bg-surface-2-40" },
  stash: { icon: Archive, color: "text-text-muted", bgColor: "bg-surface-2-40" },
  generic: { icon: Inbox, color: "text-text-muted", bgColor: "bg-surface-2-40" },
};

export function EmptyState({
  variant = "generic",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
      <div className={`w-12 h-12 rounded-xl ${config.bgColor} border border-border-40 flex items-center justify-center mb-3`}>
        <Icon size={20} className={config.color} strokeWidth={1.5} />
      </div>
      <p className="text-xs font-semibold text-text-secondary mb-0.5">{title}</p>
      {description && (
        <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/**
 * Inline empty state for compact areas (panels, sidebars).
 * Smaller than EmptyState, no background container.
 */
export function EmptyStateInline({
  variant = "generic",
  title,
  className = "",
}: {
  variant?: EmptyStateVariant;
  title: string;
  className?: string;
}) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={`flex items-center justify-center gap-2 py-4 text-center ${className}`}>
      <Icon size={13} className={config.color} strokeWidth={1.5} />
      <span className="text-xs text-text-muted">{title}</span>
    </div>
  );
}
