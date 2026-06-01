import { useState, useRef, useEffect } from "react";
import { Settings, Moon, Sun } from "lucide-react";
import { useRepoStore } from "@/stores/repo";

interface SettingsDropdownProps {
  onOpenSettings: () => void;
  onOpenKeyboardShortcuts: () => void;
}

export default function SettingsDropdown({ onOpenSettings, onOpenKeyboardShortcuts }: SettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const theme = useRepoStore((s) => s.theme);
  const toggleTheme = useRepoStore((s) => s.toggleTheme);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const isDark = theme?.startsWith("dark") || theme?.startsWith("gruvbox-dark");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="ghost h-8 w-8 flex items-center justify-center text-text-muted hover:text-text-primary rounded-mac hover:bg-surface-2 transition-all cursor-pointer"
        title="Settings & quick actions"
      >
        <Settings size={14} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-surface-0 border border-border rounded-mac shadow-lg z-50">
          <button
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors text-left"
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>

          <div className="h-[1px] bg-border/40 my-1" />

          <button
            onClick={() => {
              onOpenSettings();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors text-left"
          >
            <Settings size={13} />
            Settings
          </button>

          <button
            onClick={() => {
              onOpenKeyboardShortcuts();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors text-left"
          >
            <span className="text-2xs font-mono">⌘?</span>
            Keyboard Shortcuts
          </button>
        </div>
      )}
    </div>
  );
}
