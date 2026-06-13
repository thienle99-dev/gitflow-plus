import { lazy, Suspense } from "react";
import { isImageFile, isBinaryFile, diffIsBinary } from "@/lib/file-utils";
import ImageDiffViewer from "./ImageDiffViewer";
import BinaryFileDiffViewer from "./BinaryFileDiffViewer";

const DiffViewer = lazy(() => import("./DiffViewer"));

interface LazyDiffViewerProps {
  diff: string;
  filePath: string;
  source?: "working" | "staged" | "commit";
  onPatchApplied?: () => void;
  autoInlineReview?: boolean;
  commitHash?: string | null;
}

function DiffLoadingSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 bg-surface-0">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-40">
        <div className="h-5 w-16 rounded bg-surface-2-30 animate-pulse" />
        <div className="h-5 w-20 rounded bg-surface-2-30 animate-pulse" />
        <div className="flex-1" />
        <div className="h-5 w-24 rounded bg-surface-2-30 animate-pulse" />
      </div>
      {/* Editor skeleton — mimic CodeMirror line structure */}
      <div className="flex-1 min-h-0 overflow-hidden p-4 space-y-1.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-surface-2-30 animate-pulse"
            style={{ width: `${40 + ((i * 17) % 50)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function LazyDiffViewer(props: LazyDiffViewerProps) {
  const { filePath, source, commitHash, diff } = props;

  // Route image files to ImageDiffViewer
  if (isImageFile(filePath)) {
    return <ImageDiffViewer filePath={filePath} source={source || "commit"} commitHash={commitHash} />;
  }

  // Route binary files to BinaryFileDiffViewer
  if (isBinaryFile(filePath) || diffIsBinary(diff)) {
    return <BinaryFileDiffViewer filePath={filePath} source={source || "commit"} commitHash={commitHash} diff={diff} />;
  }

  return (
    <Suspense fallback={<DiffLoadingSkeleton />}>
      <DiffViewer {...props} />
    </Suspense>
  );
}
