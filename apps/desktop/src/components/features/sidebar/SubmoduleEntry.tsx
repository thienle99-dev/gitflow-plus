import { SubmoduleInfo } from "@/api/tauri";
import { useUIStore } from "@/stores/ui";
import { Folder, Link2 } from "lucide-react";

interface SubmoduleEntryProps {
  submodule: SubmoduleInfo;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function SubmoduleEntry({
  submodule,
  isSelected,
  onContextMenu,
}: SubmoduleEntryProps) {
  const selectFile = useUIStore((s) => s.selectFile);

  const statusBadge = {
    ok: "✓",
    not_initialized: "✗",
    modified: "⚠",
    conflict: "⚡",
  }[submodule.status] || "?";

  const statusColor = {
    ok: "text-green-500",
    not_initialized: "text-red-500",
    modified: "text-yellow-500",
    conflict: "text-orange-500",
  }[submodule.status] || "text-gray-500";

  return (
    <div
      onClick={() => selectFile(submodule.path)}
      onContextMenu={onContextMenu}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
        isSelected
          ? "bg-accent-20 text-accent"
          : "hover:bg-surface-2-40 text-text-primary"
      }`}
    >
      <div className="relative">
        <Folder size={14} className="text-accent" />
        <Link2 size={10} className="absolute -bottom-1 -right-1" />
      </div>
      <span className="flex-1 text-xs font-medium truncate">
        {submodule.name}
      </span>
      <span className={`text-xs font-bold ${statusColor}`}>
        {statusBadge}
      </span>
    </div>
  );
}
