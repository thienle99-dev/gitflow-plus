import { ChevronDown, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/form";

interface CodeQualityTabProps {
  commitLintEnabled: boolean;
  setCommitLintEnabled: (v: boolean) => void;
  codeLintEnabled: boolean;
  setCodeLintEnabled: (v: boolean) => void;
  lintStrictness: "warning" | "error" | "block_all";
  setLintStrictness: (v: "warning" | "error" | "block_all") => void;
}

export function CodeQualityTab({
  commitLintEnabled,
  setCommitLintEnabled,
  codeLintEnabled,
  setCodeLintEnabled,
  lintStrictness,
  setLintStrictness,
}: CodeQualityTabProps) {
  return (
    <div className="space-y-4">
      <div id="git-lint" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1">
          <ShieldAlert size={13} className="text-accent" />
          Pre-Commit Quality Gates
        </div>

        <Switch
          checked={commitLintEnabled}
          onChange={setCommitLintEnabled}
          label="Enable Commit Message Linting"
          description="Validate commit messages against Conventional Commits spec before committing."
        />

        <div className="border-t border-border-40 pt-2.5">
          <Switch
            checked={codeLintEnabled}
            onChange={setCodeLintEnabled}
            label="Enable Code Quality Linting"
            description="Run project linters (ESLint, Biome, Ruff, golangci-lint, Cargo Clippy) on staged files."
          />
        </div>

        <div className={`border-t border-border-40 pt-3 flex items-center justify-between gap-4 transition-opacity ${(!commitLintEnabled && !codeLintEnabled) ? "opacity-40" : ""}`}>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary">Gate Strictness Policy</span>
            <span className="text-2xs text-text-muted mt-0.5 leading-normal">Configure strictness behavior when linter issues or format warnings are found.</span>
          </div>
          <div className="relative w-48 shrink-0">
            <select
              value={lintStrictness}
              onChange={(e) => setLintStrictness(e.target.value as "warning" | "error" | "block_all")}
              disabled={!commitLintEnabled && !codeLintEnabled}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all disabled:cursor-not-allowed"
            >
              <option value="warning">Warning only (allow skip)</option>
              <option value="error">Block on errors (allow skip warnings)</option>
              <option value="block_all">Block all (strictly forbid skip)</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
