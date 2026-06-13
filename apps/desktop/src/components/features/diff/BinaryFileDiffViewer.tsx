import { useRepoStore } from "@/stores/repo";
import { api, type BinaryFileInfo } from "@/api/tauri";
import { useQuery } from "@tanstack/react-query";
import { isBinaryFile } from "@/lib/file-utils";
import { FileWarning, Loader2 } from "lucide-react";

interface BinaryFileDiffViewerProps {
  filePath: string;
  source: "working" | "staged" | "commit";
  commitHash?: string | null;
  diff: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const n = bytes / Math.pow(1024, i);
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const BINARY_TYPE_LABELS: Record<string, string> = {
  exe: "Windows Executable",
  dll: "Windows DLL",
  so: "Shared Library",
  dylib: "macOS Dynamic Library",
  wasm: "WebAssembly Module",
  pdf: "PDF Document",
  doc: "Word Document",
  docx: "Word Document",
  xls: "Excel Spreadsheet",
  xlsx: "Excel Spreadsheet",
  ppt: "PowerPoint Presentation",
  pptx: "PowerPoint Presentation",
  zip: "ZIP Archive",
  tar: "TAR Archive",
  gz: "GZip Archive",
  gzip: "GZip Archive",
  bz2: "BZip2 Archive",
  xz: "XZ Archive",
  zst: "Zstandard Archive",
  rar: "RAR Archive",
  "7z": "7-Zip Archive",
  deb: "Debian Package",
  rpm: "RPM Package",
  apk: "APK Package",
  aab: "Android App Bundle",
  dmg: "macOS Disk Image",
  pkg: "macOS Installer",
  msi: "Windows Installer",
  mp3: "MP3 Audio",
  mp4: "MP4 Video",
  avi: "AVI Video",
  mov: "QuickTime Video",
  wav: "WAV Audio",
  flac: "FLAC Audio",
  ogg: "OGG Audio",
  mkv: "MKV Video",
  wmv: "WMV Video",
  psd: "Photoshop Document",
  ai: "Adobe Illustrator",
  eps: "EPS Graphic",
  ttf: "TrueType Font",
  otf: "OpenType Font",
  woff: "Web Font",
  woff2: "Web Font",
  eot: "Embedded OpenType Font",
  jar: "Java Archive",
  "class": "Java Class",
  pyc: "Python Compiled",
  bin: "Binary Data",
  iso: "ISO Disc Image",
  sqlite: "SQLite Database",
  sqlite3: "SQLite Database",
};

function formatType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_TYPE_LABELS[ext] || `${ext.toUpperCase()} File`;
}

function formatHash(hash: string | null): string {
  if (!hash) return "—";
  return hash.length > 7 ? hash.slice(0, 7) : hash;
}

export default function BinaryFileDiffViewer({
  filePath,
  source,
  commitHash,
  diff,
}: BinaryFileDiffViewerProps) {
  const repoPath = useRepoStore((s) => s.repoPath);

  const { data: info, isLoading } = useQuery<BinaryFileInfo>({
    queryKey: ["git", repoPath, "binary-info", source, commitHash || "", filePath],
    queryFn: () => api.diff.binaryFileInfo(repoPath!, filePath, source, commitHash ?? null),
    enabled: !!repoPath,
    staleTime: 60_000,
    gcTime: 60_000,
  });

  // Parse status from diff
  const hasOld = diff.includes("a/") && !diff.includes("/dev/null");
  const hasNew = diff.includes("b/") && !diff.includes("/dev/null");
  const isNewFile = diff.includes("new file mode");
  const isDeletedFile = diff.includes("deleted file mode");
  const status = isNewFile ? "added" : isDeletedFile ? "deleted" : "modified";

  if (!isBinaryFile(filePath)) return null;

  const oldSize = info?.old_size ?? null;
  const newSize = info?.new_size ?? null;
  const sizeChanged =
    oldSize !== null && newSize !== null && oldSize !== newSize;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-0">
      {/* Toolbar */}
      <div className="border-b border-border px-3 py-1.5 text-2xs text-text-muted flex items-center gap-2 bg-surface-1-40 shrink-0">
        <span className="font-medium text-text-primary truncate min-w-0">{filePath}</span>
        <span className="text-text-muted">·</span>
        {status === "added" && <span className="text-[#30d158] font-semibold">Added</span>}
        {status === "deleted" && <span className="text-[#ff375f] font-semibold">Deleted</span>}
        {status === "modified" && <span className="text-[#ff9f0a] font-semibold">Modified</span>}
        <span className="text-text-muted">·</span>
        <span>{formatType(filePath)}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center min-h-0 p-8">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-40 flex items-center justify-center">
            <FileWarning size={28} className="text-[#ff9f0a]" />
          </div>

          <div>
            <div className="text-sm font-semibold text-text-primary mb-1">
              Binary File
            </div>
            <div className="text-xs text-text-muted leading-relaxed">
              This is a binary file — diff cannot display text changes.
            </div>
          </div>

          {/* Size info */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={12} className="animate-spin" />
              Loading file info...
            </div>
          ) : (
            <div className="w-full bg-surface-1-30 border border-border-40 rounded-mac p-3 space-y-1.5">
              {oldSize !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Old size</span>
                  <span className="text-text-primary font-mono">{formatSize(oldSize)}</span>
                </div>
              )}
              {newSize !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">New size</span>
                  <span className={`font-mono ${sizeChanged ? (newSize > oldSize! ? "text-[#ff375f]" : "text-[#30d158]") : "text-text-primary"}`}>
                    {formatSize(newSize)}
                    {sizeChanged && (
                      <span className="ml-1">
                        ({newSize > oldSize! ? "+" : ""}{formatSize(newSize - oldSize!)})
                      </span>
                    )}
                  </span>
                </div>
              )}
              {(info?.old_hash || info?.new_hash) && (
                <div className="border-t border-border-40 pt-1.5 space-y-0.5">
                  {info?.old_hash && oldSize !== null && (
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-text-muted">Old blob</span>
                      <span className="text-text-muted font-mono">{formatHash(info.old_hash)}</span>
                    </div>
                  )}
                  {info?.new_hash && newSize !== null && (
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-text-muted">New blob</span>
                      <span className="text-text-muted font-mono">{formatHash(info.new_hash)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Diff preview (show first N chars of the diff header) */}
          {diff && (
            <div className="w-full bg-surface-2 border border-border-40 rounded-mac p-2.5 text-left">
              <div className="text-2xs font-mono text-text-muted leading-relaxed whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                {diff.split("\n").slice(0, 4).join("\n")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
