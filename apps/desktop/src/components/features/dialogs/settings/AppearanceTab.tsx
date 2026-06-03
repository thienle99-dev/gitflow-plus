import { ChevronDown, Database, Gauge, Keyboard, ShieldAlert, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/form";

interface AppearanceTabProps {
  largeDiffMode: "full" | "prompt" | "summary";
  setLargeDiffMode: (v: "full" | "prompt" | "summary") => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  handleClearAiCredentials: () => void;
  handleClearRecentRepos: () => void;
}

export function AppearanceTab({
  largeDiffMode,
  setLargeDiffMode,
  reducedMotion,
  setReducedMotion,
  handleClearAiCredentials,
  handleClearRecentRepos,
}: AppearanceTabProps) {
  return (
    <div className="space-y-4">
      {/* Performance Tuning Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1">
          <Gauge size={13} className="text-accent" />
          Performance Tuning
        </div>
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary">Large Diff Handling</span>
            <span className="text-2xs text-text-muted mt-0.5 leading-normal">Behavior when rendering exceptionally large changes.</span>
          </div>
          <div className="relative w-44 shrink-0">
            <select
              value={largeDiffMode}
              onChange={(e) => setLargeDiffMode(e.target.value as "full" | "prompt" | "summary")}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              <option value="prompt">Ask before opening</option>
              <option value="summary">Show summary first</option>
              <option value="full">Always render full diff</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>
        <div className="border-t border-border-40 pt-2.5">
          <Switch
            checked={reducedMotion}
            onChange={setReducedMotion}
            label="Reduce animations"
            description="Disable cosmetic transitions and UI animations to speed up navigation response."
          />
        </div>
      </div>

      {/* System Keyboard Shortcuts Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1">
          <Keyboard size={13} className="text-accent" />
          System Shortcuts
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs pt-1">
          {[
            ["Toggle sidebar", "Cmd+B"],
            ["Close dialog", "Esc"],
            ["Commit staged changes", "Cmd+Enter"],
            ["Open search", "Toolbar"],
          ].map(([label, shortcut]) => (
            <div key={label} className="flex items-center justify-between gap-3 bg-surface-1-40 border border-border-40 rounded-mac px-2.5 py-1.5">
              <span className="text-text-secondary text-2xs font-medium">{label}</span>
              <span className="font-mono text-3xs font-semibold text-text-muted bg-surface-2 border border-border rounded px-1.5 py-0.5">
                {shortcut}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostics & Maintenance Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1">
          <ShieldAlert size={13} className="text-[#ff9f0a]" />
          Maintenance & Diagnostics
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleClearAiCredentials}
            className="h-8 px-2 text-2xs font-semibold border border-border rounded-mac text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors flex items-center justify-center gap-1.5"
          >
            <Database size={12} className="text-accent" />
            Clear AI Credentials
          </button>
          <button
            type="button"
            onClick={handleClearRecentRepos}
            className="h-8 px-2 text-2xs font-semibold border border-border rounded-mac text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={12} className="text-[#ff453a]" />
            Clear Recent Repositories
          </button>
        </div>
        <p className="text-3xs text-text-muted leading-normal pt-1">
          Warning: Diagnostic operations apply immediately. Local credentials and recently accessed work lists will be completely reset.
        </p>
      </div>
    </div>
  );
}
