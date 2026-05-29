import { useEffect, useRef, useState } from "react";
import { useRepoStore, type Theme } from "@/stores/repo";
import { Palette } from "lucide-react";

interface ThemeOption {
  id: Theme;
  label: string;
  group: "macOS" | "Gruvbox Dark" | "Gruvbox Light";
  colors: { bg: string; accent: string; text: string };
}

const THEME_OPTIONS: ThemeOption[] = [
  // macOS
  { id: "dark", label: "macOS Dark", group: "macOS", colors: { bg: "#1c1c1e", accent: "#0a84ff", text: "#f5f5f7" } },
  { id: "light", label: "macOS Light", group: "macOS", colors: { bg: "#ffffff", accent: "#007aff", text: "#1d1d1f" } },
  // Gruvbox Dark
  { id: "gruvbox-dark", label: "Dark Medium", group: "Gruvbox Dark", colors: { bg: "#282828", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-dark-soft", label: "Dark Soft", group: "Gruvbox Dark", colors: { bg: "#32302f", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-dark-hard", label: "Dark Hard", group: "Gruvbox Dark", colors: { bg: "#1d2021", accent: "#d79921", text: "#ebdbb2" } },
  // Gruvbox Light
  { id: "gruvbox-light", label: "Light Medium", group: "Gruvbox Light", colors: { bg: "#fbf1c7", accent: "#b57614", text: "#3c3836" } },
  { id: "gruvbox-light-soft", label: "Light Soft", group: "Gruvbox Light", colors: { bg: "#f2e5bc", accent: "#b57614", text: "#3c3836" } },
];

const GROUPS = ["macOS", "Gruvbox Dark", "Gruvbox Light"] as const;

export default function ThemePicker() {
  const theme = useRepoStore((s) => s.theme);
  const setTheme = useRepoStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button className="ghost" onClick={() => setOpen(!open)} title="Change theme">
        <Palette size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-surface-1 border border-border rounded-mac shadow-xl py-1.5">
          {GROUPS.map((group) => {
            const items = THEME_OPTIONS.filter((t) => t.group === group);
            return (
              <div key={group}>
                <div className="px-3 py-1 text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  {group}
                </div>
                {items.map((opt) => (
                  <button
                    key={opt.id}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors ${
                      theme === opt.id ? "text-accent" : "text-text-primary"
                    }`}
                    onClick={() => {
                      setTheme(opt.id);
                      setOpen(false);
                    }}
                  >
                    {/* Color swatch */}
                    <span className="shrink-0 flex items-center gap-0.5">
                      <span
                        className="inline-block w-4 h-4 rounded-[3px] border border-border"
                        style={{ background: opt.colors.bg }}
                      />
                      <span
                        className="inline-block w-[3px] h-4 rounded-sm"
                        style={{ background: opt.colors.accent }}
                      />
                    </span>
                    <span className="flex-1 text-left">{opt.label}</span>
                    {theme === opt.id && (
                      <span className="text-2xs text-accent font-medium">✓</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
