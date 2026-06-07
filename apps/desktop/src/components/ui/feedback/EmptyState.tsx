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
  ArrowDownToLine,
  Upload,
  Plus,
  Settings,
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

/** Preset action buttons for common empty states */
const actionClass =
  "h-7 px-3 rounded-mac text-[10px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer";

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

/** Fetch/Pull action button preset */
export function FetchAction({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className={`${actionClass} bg-accent-10 text-accent hover:bg-accent-15 disabled:opacity-40`}>
      <ArrowDownToLine size={11} />
      <span>{loading ? "Fetching…" : "Fetch Remote"}</span>
    </button>
  );
}

/** Open repository folder action preset */
export function OpenRepoAction({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className={`${actionClass} bg-surface-2-40 text-text-secondary hover:bg-surface-2 border border-border-40`}>
      <FolderOpen size={11} />
      <span>Open Repo Folder</span>
    </button>
  );
}

/** Stage All action preset */
export function StageAllAction({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${actionClass} bg-[#30d158]/10 text-[#30d158] hover:bg-[#30d158]/20 disabled:opacity-40`}>
      <Upload size={11} />
      <span>Stage All</span>
    </button>
  );
}

/** Configure AI action preset */
export function ConfigureAIAction({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className={`${actionClass} bg-accent-10 text-accent hover:bg-accent-15`}>
      <Settings size={11} />
      <span>Configure AI</span>
    </button>
  );
}

/** Create Tag action preset */
export function CreateTagAction({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className={`${actionClass} bg-accent-10 text-accent hover:bg-accent-15`}>
      <Plus size={11} />
      <span>Create Tag</span>
    </button>
  );
}

/** Stash Changes action preset */
export function StashChangesAction({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${actionClass} bg-accent-10 text-accent hover:bg-accent-15 disabled:opacity-40`}>
      <Upload size={11} />
      <span>Stash Changes</span>
    </button>
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
