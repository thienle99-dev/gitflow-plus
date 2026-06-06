import { type ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Base shimmer line */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`rounded bg-surface-2-30 animate-pulse ${className}`}
      style={style}
    />
  );
}

/** Shimmer circle (avatars, status dots) */
export function SkeletonCircle({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`rounded-full bg-surface-2-30 animate-pulse shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Pre-built skeleton for a commit row (graph + message + author + time) */
export function SkeletonCommitRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 ${className}`}>
      <SkeletonCircle size={8} />
      <Skeleton className="h-3 flex-1" style={{ maxWidth: "60%" }} />
      <Skeleton className="h-2.5 w-16 shrink-0" />
      <Skeleton className="h-2.5 w-10 shrink-0" />
    </div>
  );
}

/** Pre-built skeleton for a file change row (icon + path + badges) */
export function SkeletonFileRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 ${className}`}>
      <Skeleton className="h-3 w-3 rounded-sm shrink-0" />
      <Skeleton className="h-2.5 flex-1" style={{ maxWidth: "70%" }} />
      <Skeleton className="h-2.5 w-8 shrink-0" />
    </div>
  );
}

/** Pre-built skeleton for a branch row */
export function SkeletonBranchRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${className}`}>
      <SkeletonCircle size={10} />
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-2 w-12 shrink-0 ml-auto" />
    </div>
  );
}

/** Pre-built skeleton for a sidebar section */
export function SkeletonSection({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-1 px-3 py-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <Skeleton className="h-2.5 w-2.5 rounded-sm shrink-0" />
          <Skeleton
            className="h-2.5"
            style={{ width: `${40 + ((i * 23) % 40)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** Pre-built skeleton for a tag row */
export function SkeletonTagRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${className}`}>
      <Skeleton className="h-3 w-3 rounded-sm shrink-0" />
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-2 w-16 shrink-0 ml-auto" />
    </div>
  );
}
