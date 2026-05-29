interface DiffViewerProps {
  diff: string;
  filePath: string;
}

export default function DiffViewer({ diff, filePath }: DiffViewerProps) {
  // Parse diff into hunks for display
  const lines = diff.split("\n");

  // Determine file extension for label
  const ext = filePath.split(".").pop() || "";

  return (
    <div className="flex-1 overflow-auto bg-surface-0 font-mono text-xs leading-[18px]">
      <div className="border-b border-border px-3 py-1 text-2xs text-text-muted">
        {filePath}
      </div>
      {lines.map((line, i) => {
        let className = "px-3 whitespace-pre";
        if (line.startsWith("+")) {
          className += " bg-[rgba(48,209,88,0.08)] text-[#30d158]";
        } else if (line.startsWith("-")) {
          className += " bg-[rgba(255,55,95,0.08)] text-[#ff375f]";
        } else if (line.startsWith("@")) {
          className += " bg-surface-1 text-text-muted";
        } else {
          className += " text-text-primary";
        }

        return (
          <div key={i} className={className}>
            {line}
          </div>
        );
      })}
    </div>
  );
}
