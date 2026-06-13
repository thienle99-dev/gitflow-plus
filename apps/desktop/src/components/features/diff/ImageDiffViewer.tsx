import { useState, useCallback, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useImageDiff } from "@/queries/useImageDiff";
import { isImageFile } from "@/lib/file-utils";
import { ZoomIn, ZoomOut, Loader2, Info, AlertCircle } from "lucide-react";

interface ImageDiffViewerProps {
  filePath: string;
  source: "working" | "staged" | "commit";
  commitHash?: string | null;
}

export default function ImageDiffViewer({ filePath, source, commitHash }: ImageDiffViewerProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const oldImgRef = useRef<HTMLImageElement>(null);
  const newImgRef = useRef<HTMLImageElement>(null);
  const [oldDims, setOldDims] = useState<{ w: number; h: number } | null>(null);
  const [newDims, setNewDims] = useState<{ w: number; h: number } | null>(null);

  const { data, isLoading } = useImageDiff(repoPath, filePath, source, commitHash);

  const oldSrc = data?.oldImage
    ? `data:${data.oldImage.mime_type};base64,${data.oldImage.data}`
    : null;
  const newSrc = data?.newImage
    ? `data:${data.newImage.mime_type};base64,${data.newImage.data}`
    : null;

  const hasOld = !!oldSrc;
  const hasNew = !!newSrc;
  const deleted = hasOld && !hasNew;
  const added = !hasOld && hasNew;
  const modified = hasOld && hasNew;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.1, Math.min(20, z - e.deltaY * 0.005)));
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(20, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.1, z - 0.25));
  const handleZoomReset = () => setZoom(1);

  const infoLine = useCallback((dims: { w: number; h: number } | null, src: string | null) => {
    if (!dims || !src) return "";
    const estBytes = Math.round((dims.w * dims.h * 4) / 1024);
    const format = src.split(";")[0].replace("data:", "");
    return `${dims.w} × ${dims.h} · ~${estBytes} KB · ${format}`;
  }, []);

  if (!isImageFile(filePath)) return null;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted min-h-0">
        <Loader2 size={20} className="animate-spin text-accent" />
        <span className="text-xs">Loading image diff...</span>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted min-h-0">
        <AlertCircle size={20} className="text-red-400" />
        <span className="text-xs text-red-400">Failed to load image: {data.error}</span>
      </div>
    );
  }

  if (!oldSrc && !newSrc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted min-h-0">
        <AlertCircle size={20} />
        <span className="text-xs">No image data available</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-0">
      {/* Image toolbar */}
      <div className="border-b border-border px-3 py-1.5 text-2xs text-text-muted flex items-center gap-2 bg-surface-1-40 shrink-0">
        <span className="font-medium text-text-primary truncate min-w-0">{filePath}</span>
        <span className="text-text-muted">·</span>
        {deleted && <span className="text-[#ff375f] font-semibold">Deleted</span>}
        {added && <span className="text-[#30d158] font-semibold">Added</span>}
        {modified && <span className="text-[#ff9f0a] font-semibold">Modified</span>}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-2xs font-mono text-text-secondary w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="ghost p-1 text-text-muted hover:text-text-primary rounded"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={handleZoomReset}
            className="ghost px-1.5 py-0.5 text-2xs text-text-muted hover:text-text-primary rounded"
          >
            Fit
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`ghost p-1 rounded ${showInfo ? "text-accent" : "text-text-muted hover:text-text-primary"}`}
            title="Image info"
          >
            <Info size={13} />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="border-b border-border px-3 py-1.5 text-2xs text-text-muted bg-surface-1 space-y-0.5">
          {oldDims && oldSrc && (
            <div className="flex items-center gap-2">
              <span className="text-text-secondary font-medium">Old:</span>
              <span>{infoLine(oldDims, oldSrc)}</span>
            </div>
          )}
          {newDims && newSrc && (
            <div className="flex items-center gap-2">
              <span className="text-text-secondary font-medium">New:</span>
              <span>{infoLine(newDims, newSrc)}</span>
            </div>
          )}
        </div>
      )}

      {/* Image canvas */}
      <div
        className="flex-1 overflow-auto min-h-0 bg-surface-1 bg-[radial-gradient(circle,_var(--border)_1px,_transparent_1px)] bg-[length:12px_12px]"
        onWheel={handleWheel}
      >
        <div className="flex items-start justify-center gap-0 min-h-full p-6">
          {/* Old image */}
          {hasOld && (
            <div className={`flex flex-col items-center ${modified ? "w-1/2" : "w-auto"}`}>
              {modified && (
                <span className="text-[10px] font-semibold text-[#ff375f] mb-2">Before</span>
              )}
              <div className="relative">
                {oldDims && (
                  <img
                    ref={oldImgRef}
                    src={oldSrc!}
                    alt="Before"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                      maxWidth: modified ? "100%" : "none",
                    }}
                    className="rounded border border-border select-none"
                    onLoad={() => {
                      const img = oldImgRef.current;
                      if (img) setOldDims({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    draggable={false}
                  />
                )}
                {!oldDims && (
                  <div className="w-60 h-40 flex items-center justify-center text-2xs text-text-muted bg-surface-2 rounded border border-border">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New image */}
          {hasNew && (
            <div className={`flex flex-col items-center ${modified ? "w-1/2" : "w-auto"}`}>
              {modified && (
                <span className="text-[10px] font-semibold text-[#30d158] mb-2">After</span>
              )}
              <div className="relative">
                {newDims && (
                  <img
                    ref={newImgRef}
                    src={newSrc!}
                    alt="After"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                      maxWidth: modified ? "100%" : "none",
                    }}
                    className="rounded border border-border select-none"
                    onLoad={() => {
                      const img = newImgRef.current;
                      if (img) setNewDims({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    draggable={false}
                  />
                )}
                {!newDims && (
                  <div className="w-60 h-40 flex items-center justify-center text-2xs text-text-muted bg-surface-2 rounded border border-border">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
