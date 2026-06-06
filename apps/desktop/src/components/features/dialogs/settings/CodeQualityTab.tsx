import { useState, useRef, useEffect } from "react";
import { ChevronDown, ShieldAlert, Plus, Trash2, GripVertical, X, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/form";

const PRESET_COLORS = [
  "#0a84ff",
  "#ff453a",
  "#bf5af2",
  "#30d158",
  "#ff9f0a",
  "#64d2ff",
  "#ffd60a",
  "#ff375f",
  "#ac8e68",
  "#8e8e93",
];

const DEFAULT_QUICK_COMMIT_TYPES = [
  { label: "feat", prefix: "feat: ", color: "#0a84ff" },
  { label: "fix", prefix: "fix: ", color: "#ff453a" },
  { label: "docs", prefix: "docs: ", color: "#bf5af2" },
  { label: "refactor", prefix: "refactor: ", color: "#30d158" },
  { label: "chore", prefix: "chore: ", color: "#ff9f0a" },
  { label: "test", prefix: "test: ", color: "#64d2ff" },
];

interface CodeQualityTabProps {
  commitLintEnabled: boolean;
  setCommitLintEnabled: (v: boolean) => void;
  codeLintEnabled: boolean;
  setCodeLintEnabled: (v: boolean) => void;
  lintStrictness: "warning" | "error" | "block_all";
  setLintStrictness: (v: "warning" | "error" | "block_all") => void;
  quickCommitTypes: { label: string; prefix: string; color: string }[];
  setQuickCommitTypes: (v: { label: string; prefix: string; color: string }[]) => void;
}

export function CodeQualityTab({
  commitLintEnabled,
  setCommitLintEnabled,
  codeLintEnabled,
  setCodeLintEnabled,
  lintStrictness,
  setLintStrictness,
  quickCommitTypes,
  setQuickCommitTypes,
}: CodeQualityTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPrefix, setEditPrefix] = useState("");
  const [editColor, setEditColor] = useState("#0a84ff");
  const [showAddNew, setShowAddNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPrefix, setNewPrefix] = useState("");
  const [newColor, setNewColor] = useState("#0a84ff");
  const newLabelRef = useRef<HTMLInputElement>(null);
  const editLabelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddNew) newLabelRef.current?.focus();
  }, [showAddNew]);

  useEffect(() => {
    if (editingIndex !== null) editLabelRef.current?.focus();
  }, [editingIndex]);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditLabel(quickCommitTypes[index].label);
    setEditPrefix(quickCommitTypes[index].prefix);
    setEditColor(quickCommitTypes[index].color);
    setShowAddNew(false);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const label = editLabel.trim();
    const prefix = editPrefix.trim();
    if (!label || !prefix) return;
    const updated = [...quickCommitTypes];
    updated[editingIndex] = { label, prefix: prefix.endsWith(": ") ? prefix : prefix + ": ", color: editColor };
    setQuickCommitTypes(updated);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const deleteType = (index: number) => {
    setQuickCommitTypes(quickCommitTypes.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const addNew = () => {
    const label = newLabel.trim();
    const prefix = newPrefix.trim();
    if (!label || !prefix) return;
    setQuickCommitTypes([
      ...quickCommitTypes,
      { label, prefix: prefix.endsWith(": ") ? prefix : prefix + ": ", color: newColor },
    ]);
    setNewLabel("");
    setNewPrefix("");
    setNewColor("#0a84ff");
    setShowAddNew(false);
  };

  const resetDefaults = () => {
    setQuickCommitTypes(DEFAULT_QUICK_COMMIT_TYPES);
  };

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

      {/* Quick Commit Types */}
      <div id="quick-commit-types" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <span className="text-accent">#</span>
            Quick Commit Types
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={resetDefaults}
              className="h-6 px-2 rounded-mac text-[10px] font-medium text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all cursor-pointer inline-flex items-center gap-1"
              title="Reset to defaults"
            >
              <RotateCcw size={10} />
              Reset
            </button>
            <button
              type="button"
              onClick={() => { setShowAddNew(!showAddNew); setEditingIndex(null); }}
              className="h-6 px-2 rounded-mac bg-accent/10 text-accent text-[10px] font-semibold hover:bg-accent/20 transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <Plus size={10} />
              Add Type
            </button>
          </div>
        </div>
        <p className="text-2xs text-text-muted leading-normal -mt-1">
          Customize the quick-pick commit type prefixes shown in the commit box.
        </p>

        {/* Type list */}
        <div className="space-y-1">
          {quickCommitTypes.map((tpl, index) => (
            <div key={`${tpl.label}-${index}`}>
              {editingIndex === index ? (
                /* Edit mode */
                <div className="bg-surface-2 border border-accent/40 rounded-mac p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={editLabelRef}
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label"
                      className="h-7 flex-1 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent"
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    />
                    <input
                      value={editPrefix}
                      onChange={(e) => setEditPrefix(e.target.value)}
                      placeholder="Prefix (e.g. feat: )"
                      className="h-7 flex-1 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent font-mono"
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    />
                    <div className="relative">
                      <div
                        className="w-7 h-7 rounded-mac border border-border cursor-pointer"
                        style={{ backgroundColor: editColor }}
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-4 h-4 rounded-full border-2 transition-all cursor-pointer ${editColor === c ? "border-text-primary scale-110" : "border-transparent hover:scale-110"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="h-6 px-2 rounded-mac text-[10px] font-medium text-text-muted hover:bg-surface-2 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={!editLabel.trim() || !editPrefix.trim()}
                      className="h-6 px-2.5 rounded-mac bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-center gap-2 py-1 px-1.5 rounded-mac hover:bg-surface-2/50 group transition-all">
                  <GripVertical size={12} className="text-text-muted/40 shrink-0" />
                  <span
                    className="h-5 px-2 rounded-full border text-[9px] font-semibold shrink-0"
                    style={{
                      borderColor: `${tpl.color}30`,
                      backgroundColor: `${tpl.color}10`,
                      color: tpl.color,
                    }}
                  >
                    {tpl.label}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono truncate">{tpl.prefix}</span>
                  <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEdit(index)}
                      className="h-5 px-1.5 rounded-mac text-[10px] text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteType(index)}
                      className="h-5 px-1.5 rounded-mac text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new form */}
        {showAddNew && (
          <div className="bg-surface-2 border border-accent/40 rounded-mac p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={newLabelRef}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (e.g. feat)"
                className="h-7 flex-1 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent"
                onKeyDown={(e) => { if (e.key === "Enter") addNew(); if (e.key === "Escape") setShowAddNew(false); }}
              />
              <input
                value={newPrefix}
                onChange={(e) => setNewPrefix(e.target.value)}
                placeholder="Prefix (e.g. feat: )"
                className="h-7 flex-1 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent font-mono"
                onKeyDown={(e) => { if (e.key === "Enter") addNew(); if (e.key === "Escape") setShowAddNew(false); }}
              />
              <div className="relative">
                <div
                  className="w-7 h-7 rounded-mac border border-border cursor-pointer"
                  style={{ backgroundColor: newColor }}
                />
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-4 h-4 rounded-full border-2 transition-all cursor-pointer ${newColor === c ? "border-text-primary scale-110" : "border-transparent hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <button
                type="button"
                onClick={() => setShowAddNew(false)}
                className="h-6 px-2 rounded-mac text-[10px] font-medium text-text-muted hover:bg-surface-2 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addNew}
                disabled={!newLabel.trim() || !newPrefix.trim()}
                className="h-6 px-2.5 rounded-mac bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
