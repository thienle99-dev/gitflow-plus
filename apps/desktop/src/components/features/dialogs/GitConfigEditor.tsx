import { useState, useEffect, useCallback } from "react";
import { api, type GitConfigEntry } from "@/api/tauri";
import { useRepoStore } from "@/stores/repo";
import { showToast } from "@/lib/toast";
import {
  Settings,
  Search,
  X,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Globe,
  User,
  Folder,
  Loader2,
  Check,
} from "lucide-react";

export default function GitConfigEditor() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [scope, setScope] = useState<"local" | "global" | "system">("local");
  const [entries, setEntries] = useState<GitConfigEntry[]>([]);
  const [filtered, setFiltered] = useState<GitConfigEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!repoPath && scope === "local") return;
    setLoading(true);
    try {
      const result = await api.gitConfig.list(repoPath || "", scope);
      setEntries(result);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [repoPath, scope]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!search) {
      setFiltered(entries);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(entries.filter((e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)));
  }, [search, entries]);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      await api.gitConfig.set(repoPath || "", key, value, scope);
      setEditing(null);
      showToast(`Saved ${key}`, "success");
      load();
    } catch (err) {
      showToast(`Failed: ${err}`, "error");
    } finally {
      setSaving(null);
    }
  };

  const handleUnset = async (key: string) => {
    setSaving(key);
    try {
      await api.gitConfig.unset(repoPath || "", key, scope);
      showToast(`Removed ${key}`, "success");
      load();
    } catch (err) {
      showToast(`Failed: ${err}`, "error");
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async () => {
    if (!newKey || !newValue) return;
    setSaving("__add__");
    try {
      await api.gitConfig.set(repoPath || "", newKey, newValue, scope);
      setNewKey("");
      setNewValue("");
      showToast(`Added ${newKey}`, "success");
      load();
    } catch (err) {
      showToast(`Failed: ${err}`, "error");
    } finally {
      setSaving(null);
    }
  };

  const scopeIcon = (s: string) =>
    s === "global" ? <Globe size={12} /> : s === "system" ? <Folder size={12} /> : <User size={12} />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scope + Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Settings size={14} className="text-text-muted shrink-0" />
        <span className="text-xs font-medium text-text-primary">Git Config</span>
        <div className="flex gap-1 ml-2">
          {(["local", "global", "system"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`flex items-center gap-1 px-2 py-1 text-2xs rounded-mac border transition-all ${
                scope === s
                  ? "bg-[#0a84ff]/10 border-[#0a84ff]/30 text-[#0a84ff]"
                  : "bg-surface-2-40 border-border-40 text-text-muted hover:bg-surface-2"
              }`}
            >
              {scopeIcon(s)}
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={load} disabled={loading} className="ghost p-1 rounded text-text-muted hover:text-text-primary">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Search */}
      <div className="relative px-3 py-2 border-b border-border">
        <Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter config keys..."
          className="w-full pl-6 pr-2 py-1.5 text-2xs bg-surface-2 border border-border rounded-mac focus:outline-none focus:border-[#0a84ff]"
        />
      </div>

      {/* Add new */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="section.key"
          className="flex-1 min-w-0 px-2 py-1 text-2xs font-mono bg-surface-2 border border-border rounded-mac focus:outline-none focus:border-[#0a84ff]"
        />
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="value"
          className="flex-[2] min-w-0 px-2 py-1 text-2xs bg-surface-2 border border-border rounded-mac focus:outline-none focus:border-[#0a84ff]"
        />
        <button
          onClick={handleAdd}
          disabled={!newKey || !newValue || saving === "__add__"}
          className="flex items-center gap-1 px-2 py-1 text-2xs font-medium bg-[#30d158] text-black rounded-mac hover:opacity-90 disabled:opacity-40"
        >
          {saving === "__add__" ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
          Add
        </button>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto">
        {loading && entries.length === 0 && (
          <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-text-muted" /></div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-2xs text-text-muted text-center py-8">No config entries found</div>
        )}
        {filtered.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2 px-3 py-1.5 border-b border-border-40 hover:bg-surface-2-40 group min-h-8">
            <span className="font-mono text-2xs text-text-secondary w-1/3 truncate shrink-0">{entry.key}</span>
            {editing?.key === entry.key ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <input
                  defaultValue={editing.value}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(entry.key, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="flex-1 min-w-0 px-1.5 py-0.5 text-2xs font-mono bg-surface-2 border border-[#0a84ff] rounded-mac focus:outline-none"
                />
                <button
                  onClick={() => {
                    const input = document.activeElement as HTMLInputElement;
                    if (input) handleSave(entry.key, input.value);
                  }}
                  disabled={saving === entry.key}
                  className="ghost p-0.5 rounded text-[#30d158] hover:text-white"
                >
                  {saving === entry.key ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                </button>
              </div>
            ) : (
              <>
                <span className="text-2xs text-text-primary flex-1 min-w-0 truncate">{entry.value}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditing({ key: entry.key, value: entry.value })}
                    className="ghost p-0.5 rounded text-text-muted hover:text-text-primary"
                  >
                    <Save size={10} />
                  </button>
                  <button
                    onClick={() => handleUnset(entry.key)}
                    disabled={saving === entry.key}
                    className="ghost p-0.5 rounded text-text-muted hover:text-[#ff453a]"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}