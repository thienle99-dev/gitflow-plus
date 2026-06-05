import { ChevronDown, Keyboard } from "lucide-react";
import { Switch } from "@/components/ui/form";

interface DiffTabProps {
  defaultDiffMode: "split" | "unified";
  setDefaultDiffMode: (mode: "split" | "unified") => void;
  diffContext: number;
  setDiffContext: (v: number) => void;
  diffLineWrap: boolean;
  setDiffLineWrap: (v: boolean) => void;
  largeDiffMode: "full" | "prompt" | "summary";
  setLargeDiffMode: (v: "full" | "prompt" | "summary") => void;
}

export function DiffTab({
  defaultDiffMode,
  setDefaultDiffMode,
  diffContext,
  setDiffContext,
  diffLineWrap,
  setDiffLineWrap,
  largeDiffMode,
  setLargeDiffMode,
}: DiffTabProps) {
  return (
    <div className="space-y-4">
      {/* Diff & Editor Preferences Card */}
      <div id="diff-editor" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        {/* Default Diff Mode Selector */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-primary">Default Diff View Mode</label>
          <div className="relative">
            <select
              value={defaultDiffMode}
              onChange={(e) => setDefaultDiffMode(e.target.value as "split" | "unified")}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              <option value="split">Split View (Side-by-Side)</option>
              <option value="unified">Unified View (Combined)</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-2xs text-text-muted">
            Choose the default presentation style when inspecting file differences.
          </p>
        </div>

        <div className="border-t border-border-40 pt-2.5">
          <Switch
            checked={diffLineWrap}
            onChange={setDiffLineWrap}
            label="Wrap long lines in diff viewer"
            description="Automatically wrap excessively long source code lines in the diff panel."
          />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border-40 pt-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Diff Context Lines</label>
            <input
              type="number"
              min={0}
              max={9999}
              value={diffContext}
              onChange={(e) => setDiffContext(Number(e.target.value))}
              className="w-full h-8 px-2.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent hover:bg-surface-2 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Large Diff Handling</label>
            <div className="relative">
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
        </div>
      </div>

      {/* System Keyboard Shortcuts Card */}
      <div id="diff-shortcuts" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
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
    </div>
  );
}
