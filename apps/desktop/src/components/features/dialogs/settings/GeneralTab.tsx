import { useState, useEffect } from "react";
import { ChevronDown, Download, Check, RefreshCw, Loader2, AlertCircle, ArrowUpCircle, Database, Trash2, ShieldAlert } from "lucide-react";
import { applyTheme } from "@/stores/repo";
import { Switch } from "@/components/ui/form";
import { useAppUpdater } from "@/queries/useAppUpdater";
import { formatDateString, formatRelativeTime } from "@/lib/date";

export const THEME_CARDS = [
  { id: "system",           label: "Auto (OS Sync)", group: "OS Sync",       colors: { bg: "#1e1e1e", surface: "#2d2d2d", sidebar: "#181818", accent: "#0a84ff", text: "#e0e0e0" } },
  { id: "dark",             label: "macOS Dark",   group: "OS Sync",       colors: { bg: "#1c1c1e", surface: "#2c2c2e", sidebar: "#111113", accent: "#0a84ff", text: "#f5f5f7" } },
  { id: "light",            label: "macOS Light",  group: "OS Sync",       colors: { bg: "#ffffff", surface: "#f2f2f7", sidebar: "#e8e8ed", accent: "#007aff", text: "#1d1d1f" } },
  
  { id: "macos-26",         label: "macOS 26 Dark",  group: "macOS 26 Liquid Glass", colors: { bg: "#16161a", surface: "#26262c", sidebar: "#121216", accent: "#1472e6", text: "#f0f0f5" } },
  { id: "macos-26-light",   label: "macOS 26 Light", group: "macOS 26 Liquid Glass", colors: { bg: "#ffffff", surface: "#f2f2f7", sidebar: "#e4e4eb", accent: "#007aff", text: "#1d1d1f" } },
  
  { id: "github-dark",      label: "GitHub Dark",  group: "Developer Classics", colors: { bg: "#0d1117", surface: "#161b22", sidebar: "#010409", accent: "#2f81f7", text: "#c9d1d9" } },
  { id: "nord",             label: "Nord Arctic",  group: "Developer Classics", colors: { bg: "#2e3440", surface: "#3b4252", sidebar: "#242933", accent: "#88c0d0", text: "#d8dee9" } },
  { id: "tokyo-night",      label: "Tokyo Night",  group: "Developer Classics", colors: { bg: "#1a1b26", surface: "#1f2335", sidebar: "#16161e", accent: "#7aa2f7", text: "#a9b1d6" } },
  { id: "dracula",          label: "Dracula",      group: "Developer Classics", colors: { bg: "#282a36", surface: "#343746", sidebar: "#1e1f29", accent: "#ff79c6", text: "#f8f8f2" } },
  { id: "one-dark",         label: "One Dark Pro",   group: "Developer Classics", colors: { bg: "#282c34", surface: "#21252b", sidebar: "#181a1f", accent: "#61afef", text: "#abb2bf" } },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha",group: "Developer Classics", colors: { bg: "#1e1e2e", surface: "#181825", sidebar: "#11111b", accent: "#b4befe", text: "#cdd6f4" } },
  { id: "rose-pine",        label: "Rose Pine",      group: "Developer Classics", colors: { bg: "#191724", surface: "#1f1d2e", sidebar: "#14121d", accent: "#ebbcba", text: "#e0def4" } },
  { id: "solarized-dark",   label: "Solarized Dark", group: "Developer Classics", colors: { bg: "#002b36", surface: "#073642", sidebar: "#001f27", accent: "#268bd2", text: "#93a1a1" } },
  
  { id: "cyberpunk-green",  label: "Cyberpunk Neon",group: "Highly Personalized",colors: { bg: "#0c0f12", surface: "#161b22", sidebar: "#080a0d", accent: "#39ff14", text: "#e0e6ed" } },
  { id: "monokai-pro",      label: "Monokai Pro",  group: "Highly Personalized",colors: { bg: "#2d2a2e", surface: "#3a373b", sidebar: "#222122", accent: "#ffd866", text: "#fcfcfa" } },
  
  { id: "gruvbox-dark",     label: "Dark Medium",  group: "Gruvbox Dark",  colors: { bg: "#282828", surface: "#3c3836", sidebar: "#1d2021", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-dark-soft",label: "Dark Soft",    group: "Gruvbox Dark",  colors: { bg: "#32302f", surface: "#3c3836", sidebar: "#282828", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-dark-hard",label: "Dark Hard",    group: "Gruvbox Dark",  colors: { bg: "#1d2021", surface: "#282828", sidebar: "#141617", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-light",    label: "Light Medium", group: "Gruvbox Light", colors: { bg: "#fbf1c7", surface: "#f9f5d7", sidebar: "#ebdbb2", accent: "#b57614", text: "#3c3836" } },
  { id: "gruvbox-light-soft",label:"Light Soft",   group: "Gruvbox Light", colors: { bg: "#f2e5bc", surface: "#ebdbb2", sidebar: "#d5c4a1", accent: "#b57614", text: "#3c3836" } },
] as const;

export const THEME_GROUPS = ["OS Sync", "macOS 26 Liquid Glass", "Developer Classics", "Highly Personalized", "Gruvbox Dark", "Gruvbox Light"] as const;

export function ThemeSkeletonCard({ card, selected, onClick }: {
  card: typeof THEME_CARDS[number];
  selected: boolean;
  onClick: () => void;
}) {
  const c = card.colors;
  const isCyberpunk = card.id === "cyberpunk-green";
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-1.5 rounded-mac border transition-all focus:outline-none cursor-pointer"
      style={{
        borderColor: selected ? c.accent : "transparent",
        background: selected ? c.accent + "18" : "transparent",
        boxShadow: selected
          ? (isCyberpunk
              ? "0 0 10px rgba(57, 255, 20, 0.5), 0 0 2px rgba(57, 255, 20, 0.3)"
              : `0 0 0 1px ${c.accent}`)
          : undefined,
      }}
      title={card.label}
    >
      {/* Skeleton preview */}
      <div style={{ width: 72, height: 48, borderRadius: 5, overflow: "hidden", background: c.bg, border: `1px solid ${c.text}18`, flexShrink: 0 }}>
        {/* Titlebar */}
        <div style={{ height: 9, background: c.surface, display: "flex", alignItems: "center", paddingLeft: 4, gap: 2 }}>
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#28c840" }} />
        </div>
        {/* Body */}
        <div style={{ display: "flex", height: "calc(100% - 9px)" }}>
          {/* Sidebar */}
          <div style={{ width: 18, background: c.sidebar, padding: "3px 3px", display: "flex", flexDirection: "column", gap: 2.5 }}>
            <div style={{ height: 2, borderRadius: 1, background: c.accent, width: "80%" }} />
            <div style={{ height: 2, borderRadius: 1, background: c.text + "50", width: "65%" }} />
            <div style={{ height: 2, borderRadius: 1, background: c.text + "35", width: "75%" }} />
            <div style={{ height: 2, borderRadius: 1, background: c.text + "35", width: "55%" }} />
          </div>
          {/* Graph + detail */}
          <div style={{ flex: 1, padding: "3px 4px", display: "flex", flexDirection: "column", gap: 3 }}>
            {[c.accent, c.text + "70", c.text + "50", c.text + "40"].map((color, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <div style={{ width: i === 0 ? 5 : 4, height: i === 0 ? 5 : 4, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div style={{ height: 1.5, borderRadius: 1, background: color + (i === 0 ? "" : "80"), flex: 1 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Label */}
      <span className="text-2xs font-medium leading-none" style={{ color: selected ? c.accent : undefined }}>
        {card.label}
      </span>
    </button>
  );
}

interface GeneralTabProps {
  reopenLastRepo: boolean;
  setReopenLastRepo: (v: boolean) => void;
  recentRepoLimit: number;
  setRecentRepoLimit: (v: number) => void;
  handleClearAiCredentials: () => void;
  handleClearRecentRepos: () => void;
}

export function GeneralTab({
  reopenLastRepo,
  setReopenLastRepo,
  recentRepoLimit,
  setRecentRepoLimit,
  handleClearAiCredentials,
  handleClearRecentRepos,
}: GeneralTabProps) {
  const updater = useAppUpdater();

  return (
    <div className="space-y-4">
      {/* App Updates Card */}
      <div id="general-updates" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-xs font-semibold text-text-primary">App Updates</label>
            <p className="text-2xs text-text-muted">
              Check for new versions of GitFlow Desktop.
            </p>
          </div>
          <button
            onClick={updater.checkForUpdates}
            disabled={updater.status === "checking" || updater.status === "downloading"}
            className="flex items-center justify-center gap-1.5 h-7 w-[140px] text-xs font-medium rounded-mac border border-border bg-surface-1 text-text-primary enabled:hover:bg-surface-2 enabled:active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all enabled:cursor-pointer shrink-0"
          >
            {updater.status === "checking" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            {updater.status === "checking" ? "Checking…" : "Check for Updates"}
          </button>
        </div>

        {/* Status Messages */}
        {updater.status === "not-available" && (
          <div className="flex items-center gap-2 p-2 rounded-mac bg-[#30d158]/10 border border-[#30d158]/20 text-2xs text-[#30d158]">
            <Check size={13} />
            <span>You're running the latest version.</span>
          </div>
        )}

        {updater.status === "error" && (
          <div className="flex items-center gap-2 p-2 rounded-mac bg-[#ff375f]/10 border border-[#ff375f]/20 text-2xs text-[#ff375f]">
            <AlertCircle size={13} />
            <span>{updater.error ?? "Update check failed."}</span>
          </div>
        )}

        {updater.status === "available" && updater.updateInfo && (
          <div className="p-2.5 rounded-mac bg-accent/10 border border-accent/20 space-y-2">
            <div className="flex items-center gap-2 text-xs text-accent font-semibold">
              <ArrowUpCircle size={14} />
              <span>Update available: v{updater.updateInfo.version}</span>
            </div>
            {updater.updateInfo.body && (
              <p className="text-2xs text-text-muted leading-relaxed whitespace-pre-wrap">
                {updater.updateInfo.body}
              </p>
            )}
            <button
              onClick={updater.downloadAndInstall}
              className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-mac bg-accent text-white hover:opacity-90 transition-all cursor-pointer"
            >
              <Download size={12} />
              Download & Install
            </button>
          </div>
        )}

        {updater.status === "downloading" && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-2xs text-text-secondary">
              <Loader2 size={11} className="animate-spin text-accent" />
              <span>Downloading update… {updater.downloadProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${updater.downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {updater.status === "ready" && (
          <div className="flex items-center gap-2 p-2 rounded-mac bg-accent/10 border border-accent/20">
            <Check size={13} className="text-accent" />
            <span className="text-2xs text-accent flex-1">Update installed. Restart to apply.</span>
            <button
              onClick={updater.relaunch}
              className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-mac bg-accent text-white hover:opacity-90 transition-all cursor-pointer"
            >
              Restart Now
            </button>
          </div>
        )}
      </div>

      {/* Launch Preferences Card */}
      <div id="general-launch" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-1">
          Launch Preferences
        </div>
        <Switch
          checked={reopenLastRepo}
          onChange={setReopenLastRepo}
          label="Reopen last repository on launch"
          description="Automatically load the workspace you were last working on when opening GitFlow."
        />
        
        <div className="border-t border-border-40 pt-3 flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary">Recent Repositories Limit</span>
            <span className="text-2xs text-text-muted mt-0.5 leading-normal">Maximum number of entries in the recent workspaces list.</span>
          </div>
          <input
            type="number"
            min={3}
            max={30}
            value={recentRepoLimit}
            onChange={(e) => setRecentRepoLimit(Number(e.target.value))}
            className="w-20 h-8 px-2.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent hover:bg-surface-2 transition-all shrink-0 text-center"
          />
        </div>
      </div>

      {/* Diagnostics & Maintenance Card */}
      <div id="general-diagnostics" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
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

interface AppearanceTabProps {
  theme: string;
  setSelectedTheme: (theme: any) => void;
  graphDensity: "comfortable" | "compact";
  setGraphDensity: (density: "comfortable" | "compact") => void;
  graphShowHash: boolean;
  setGraphShowHash: (v: boolean) => void;
  graphShowAuthor: boolean;
  setGraphShowAuthor: (v: boolean) => void;
  graphShowDate: boolean;
  setGraphShowDate: (v: boolean) => void;
  dateFormat: string;
  setDateFormat: (v: string) => void;
  customDateFormat: string;
  setCustomDateFormat: (v: string) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

export function AppearanceTab({
  theme,
  setSelectedTheme,
  graphDensity,
  setGraphDensity,
  graphShowHash,
  setGraphShowHash,
  graphShowAuthor,
  setGraphShowAuthor,
  graphShowDate,
  setGraphShowDate,
  dateFormat,
  setDateFormat,
  customDateFormat,
  setCustomDateFormat,
  reducedMotion,
  setReducedMotion,
}: AppearanceTabProps) {
  return (
    <div className="space-y-4">
      {/* Color Theme Card */}
      <div id="appearance-theme" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-primary">Color Theme</label>
          <div className="space-y-3">
            {THEME_GROUPS.map((group) => {
              const cards = THEME_CARDS.filter((c) => c.group === group);
              return (
                <div key={group}>
                  <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    {group}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cards.map((card) => (
                      <ThemeSkeletonCard
                        key={card.id}
                        card={card}
                        selected={theme === card.id}
                        onClick={() => {
                          setSelectedTheme(card.id as any);
                          applyTheme(card.id as any);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Graph Layout & Accessibility preferences */}
      <div id="appearance-graph" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Commit Graph Density</label>
            <div className="relative">
              <select
                value={graphDensity}
                onChange={(e) => setGraphDensity(e.target.value as "comfortable" | "compact")}
                className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
              >
                <option value="comfortable">Comfortable rows</option>
                <option value="compact">Compact rows</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <ChevronDown size={11} strokeWidth={2.5} />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary">Commit List Columns</label>
            <div className="grid grid-cols-3 gap-2 bg-surface-1-40 rounded-mac p-2 border border-border-40">
              {[
                ["Hash", graphShowHash, setGraphShowHash],
                ["Author", graphShowAuthor, setGraphShowAuthor],
                ["Date", graphShowDate, setGraphShowDate],
              ].map(([label, checked, setter]) => (
                <label key={label as string} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checked as boolean}
                    onChange={(e) => (setter as (next: boolean) => void)(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  {label as string}
                </label>
              ))}
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

      {/* Date Format Card */}
      <div id="appearance-date" className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-primary">Commit Date Format</label>
          <div className="relative">
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              <option value="relative">Relative Time (e.g. 2 hours ago)</option>
              <option value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm (e.g. 2026-06-04 17:02)</option>
              <option value="DD/MM/YYYY HH:mm">DD/MM/YYYY HH:mm (e.g. 04/06/2026 17:02)</option>
              <option value="MM/DD/YYYY hh:mm A">MM/DD/YYYY hh:mm A (e.g. 06/04/2026 05:02 PM)</option>
              <option value="MMM DD, YYYY, hh:mm A">MMM DD, YYYY, hh:mm A (e.g. Jun 04, 2026, 05:02 PM)</option>
              <option value="custom">Custom Format...</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-2xs text-text-muted">
            Choose how timestamps are rendered in commit lists, details, history, and blame views.
          </p>
        </div>

        {dateFormat === "custom" && (
          <div className="space-y-1 border-t border-border-40 pt-2.5 animate-in fade-in duration-150">
            <label className="text-xs font-semibold text-text-primary">Custom Format Pattern</label>
            <input
              type="text"
              value={customDateFormat}
              onChange={(e) => setCustomDateFormat(e.target.value)}
              placeholder="e.g. YYYY-MM-DD HH:mm:ss"
              className="w-full h-8 px-2.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent hover:bg-surface-2 transition-all"
            />
            <p className="text-3xs text-text-muted mt-1 leading-relaxed">
              Use tokens: <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">YYYY</code> (year), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">MM</code> (month), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">DD</code> (day), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">HH</code> (24h hour), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">hh</code> (12h hour), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">mm</code> (minute), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">ss</code> (second), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">A</code> (AM/PM), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">MMM</code> (short month), <code className="bg-surface-2 px-1 py-0.5 rounded text-text-primary">MMMM</code> (long month).
            </p>
          </div>
        )}

        <div className="border-t border-border-40 pt-2.5 flex items-center justify-between text-2xs">
          <span className="text-text-muted font-medium">Live Preview:</span>
          <span className="font-mono text-accent font-semibold bg-accent/5 border border-accent/15 px-2.5 py-1 rounded-mac">
            {(() => {
              const now = new Date();
              if (dateFormat === "relative") {
                return formatRelativeTime(now);
              }
              const pattern = dateFormat === "custom" ? customDateFormat : dateFormat;
              return formatDateString(now, pattern);
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
