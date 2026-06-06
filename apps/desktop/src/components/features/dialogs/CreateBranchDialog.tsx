import { useState, useEffect } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useGitBranches } from "@/queries/useGitLog";
import { useTagList } from "@/queries/useGitTag";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/tauri";
import { GitBranch, X, HelpCircle, Check, ChevronDown } from "lucide-react";

function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 py-1.5 select-none ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-text-primary">{label}</span>
        {description && <span className="text-2xs text-text-muted mt-0.5 leading-normal">{description}</span>}
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-8 h-[18px] bg-surface-3 rounded-full transition-colors duration-200 peer-checked:bg-accent"></div>
        <div className="absolute left-[2px] top-[2px] bg-white w-[14px] h-[14px] rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-3.5"></div>
      </div>
    </label>
  );
}

interface CreateBranchDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateBranchDialog({ open, onClose }: CreateBranchDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const selectRef = useRepoStore((s) => s.selectRef);
  const queryClient = useQueryClient();

  const { data: branches } = useGitBranches(repoPath);
  const { data: tags } = useTagList(repoPath);

  const [name, setName] = useState("");
  const [baseType, setBaseType] = useState<"branch" | "tag" | "hash">("branch");
  const [baseRef, setBaseRef] = useState("");
  const [customHash, setCustomHash] = useState("");
  const [checkoutNew, setCheckoutNew] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentBranch = branches?.find((b) => b.current)?.name || "";

  // Set default base ref when branches list is loaded
  useEffect(() => {
    if (branches && branches.length > 0 && !baseRef) {
      const active = branches.find((b) => b.current)?.name || branches[0].name;
      setBaseRef(active);
    }
  }, [branches, baseRef]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Branch name cannot be empty");
      return;
    }

    if (/\s/.test(trimmedName)) {
      setError("Branch name cannot contain spaces");
      return;
    }

    let finalBase: string | undefined = undefined;
    if (baseType === "branch") {
      finalBase = baseRef;
    } else if (baseType === "tag") {
      finalBase = baseRef;
    } else if (baseType === "hash") {
      const trimmedHash = customHash.trim();
      if (!trimmedHash) {
        setError("Commit hash cannot be empty");
        return;
      }
      finalBase = trimmedHash;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create branch
      await api.branches.create(repoPath, trimmedName, finalBase);

      // 2. Checkout if requested
      if (checkoutNew) {
        await api.branches.checkout(repoPath, trimmedName);
        selectRef(trimmedName);
      }

      // 3. Invalidate queries & close
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
      onClose();
      
      // Reset state
      setName("");
      setCustomHash("");
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center anim-overlay-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-[#000000]/45" />
      <div className="relative w-[400px] bg-surface-0 border border-border rounded-mac shadow-2xl overflow-hidden anim-dialog-enter">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-1-40">
          <GitBranch size={15} className="text-accent shrink-0" />
          <span className="text-xs font-semibold text-text-primary flex-1">
            Create Branch
          </span>
          <button onClick={onClose} className="ghost p-1 text-text-muted hover:text-text-primary">
            <X size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-2xs text-[#ff453a] leading-relaxed break-words select-text">
              {error}
            </div>
          )}

          {/* New Branch Details Card */}
          <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
            {/* New Branch Name */}
            <div className="space-y-1.5">
              <label className="block text-2xs font-semibold text-text-secondary">
                Branch Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. feature/login-page"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {/* Source Base Selection Card */}
          <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
            {/* Source Type Selector */}
            <div className="space-y-1.5">
              <label className="block text-2xs font-semibold text-text-secondary">
                Based On
              </label>
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-surface-2 rounded-mac border border-border-40">
                <button
                  type="button"
                  className={`py-1 rounded text-3xs font-medium transition-all border border-transparent outline-none ${
                    baseType === "branch"
                      ? "bg-surface-0 text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => {
                    setBaseType("branch");
                    if (branches && branches.length > 0) {
                      const active = branches.find((b) => b.current)?.name || branches[0].name;
                      setBaseRef(active);
                    }
                  }}
                  disabled={loading}
                >
                  Branch
                </button>
                <button
                  type="button"
                  className={`py-1 rounded text-3xs font-medium transition-all border border-transparent outline-none ${
                    baseType === "tag"
                      ? "bg-surface-0 text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => {
                    setBaseType("tag");
                    if (tags && tags.length > 0) {
                      setBaseRef(tags[0].name);
                    } else {
                      setBaseRef("");
                    }
                  }}
                  disabled={loading}
                >
                  Tag
                </button>
                <button
                  type="button"
                  className={`py-1 rounded text-3xs font-medium transition-all border border-transparent outline-none ${
                    baseType === "hash"
                      ? "bg-surface-0 text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setBaseType("hash")}
                  disabled={loading}
                >
                  Commit Hash
                </button>
              </div>
            </div>

            {/* Selector Dropdown / Text Input depending on type */}
            {baseType === "branch" && (
              <div className="space-y-1.5 anim-slide-down-enter border-t border-border-40 pt-3">
                <label className="block text-3xs font-semibold text-text-muted">
                  Select Base Branch
                </label>
                <div className="relative">
                  <select
                    value={baseRef}
                    onChange={(e) => setBaseRef(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-8 bg-surface-1 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none cursor-pointer appearance-none hover:bg-surface-2 transition-all"
                    disabled={loading || !branches || branches.length === 0}
                  >
                    {branches?.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} {b.current ? "(current)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                    <ChevronDown size={11} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            )}

            {baseType === "tag" && (
              <div className="space-y-1.5 anim-slide-down-enter border-t border-border-40 pt-3">
                <label className="block text-3xs font-semibold text-text-muted">
                  Select Base Tag
                </label>
                {tags && tags.length > 0 ? (
                  <div className="relative">
                    <select
                      value={baseRef}
                      onChange={(e) => setBaseRef(e.target.value)}
                      className="w-full h-8 pl-2.5 pr-8 bg-surface-1 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none cursor-pointer appearance-none hover:bg-surface-2 transition-all"
                      disabled={loading}
                    >
                      {tags.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                      <ChevronDown size={11} strokeWidth={2.5} />
                    </div>
                  </div>
                ) : (
                  <div className="text-2xs text-text-muted bg-surface-1 p-2 rounded-mac text-center border border-border-40">
                    No tags available in this repository
                  </div>
                )}
              </div>
            )}

            {baseType === "hash" && (
              <div className="space-y-1.5 anim-slide-down-enter border-t border-border-40 pt-3">
                <label className="block text-3xs font-semibold text-text-muted">
                  Enter Commit Hash
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8a2f4c9"
                  value={customHash}
                  onChange={(e) => {
                    setCustomHash(e.target.value);
                    setError(null);
                  }}
                  className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Options Card */}
          <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5">
            <Switch
              checked={checkoutNew}
              onChange={setCheckoutNew}
              label="Checkout branch immediately"
              description="Automatically switch active workspace to the newly created branch."
              disabled={loading}
            />
          </div>

          {/* Actions Footer */}
          <div className="flex justify-end gap-2 pt-3.5 border-t border-border-60 -mx-4 -mb-4 px-4 py-2.5 bg-surface-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors min-w-[64px]"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (baseType === "tag" && (!tags || tags.length === 0))}
              className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center gap-1 min-w-[64px] justify-center"
            >
              {loading ? "Creating..." : "Create Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
