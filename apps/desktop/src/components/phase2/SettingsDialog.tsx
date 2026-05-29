import { useState, useEffect } from "react";
import { Sparkles, Eye, EyeOff, Settings, ShieldAlert, Sliders, Sun, Moon, RefreshCw } from "lucide-react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";

const LS_KEY_API_KEY = "gitflowAiApiKey";
const LS_KEY_API_URL = "gitflowAiApiUrl";
const LS_KEY_MODEL = "gitflowAiModel";
const LS_KEY_TOKEN_LIMIT = "gitflowAiTokenLimit";
const LS_KEY_DIFF_MODE = "gitflowDefaultDiffViewMode";
const LS_KEY_AUTO_FETCH = "gitflowAutoFetch";
const LS_KEY_FETCHED_MODELS = "gitflowAiFetchedModels";
const LS_KEY_AI_DETAIL_LEVEL = "gitflowAiDetailLevel";

interface SettingsDialogProps {
  onClose?: () => void;
}

const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-haiku-3-20250101", label: "Claude Haiku 3" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

const LOCAL_MODELS = [
  { id: "ollama", label: "Ollama (local)" },
  { id: "llama.cpp", label: "llama.cpp (local)" },
];

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const currentTheme = useRepoStore((s) => s.theme);
  const setTheme = useRepoStore((s) => s.setTheme);

  const [activeTab, setActiveTab] = useState<"general" | "ai">("general");
  
  // General Tab States
  const [theme, setSelectedTheme] = useState<"light" | "dark">(currentTheme);
  const [defaultDiffMode, setDefaultDiffMode] = useState<"split" | "unified">("split");
  const [autoFetch, setAutoFetch] = useState(true);

  // AI Tab States
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [tokenLimit, setTokenLimit] = useState(4096);
  const [fetchedModels, setFetchedModels] = useState<{ id: string; label: string }[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [aiDetailLevel, setAiDetailLevel] = useState<"minimal" | "medium" | "detailed">("medium");

  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load settings on mount
  useEffect(() => {
    try {
      const savedDiffMode = localStorage.getItem(LS_KEY_DIFF_MODE) as "split" | "unified";
      const savedAutoFetch = localStorage.getItem(LS_KEY_AUTO_FETCH);
      const savedKey = localStorage.getItem(LS_KEY_API_KEY);
      const savedApiUrl = localStorage.getItem(LS_KEY_API_URL);
      const savedModel = localStorage.getItem(LS_KEY_MODEL);
      const savedLimit = localStorage.getItem(LS_KEY_TOKEN_LIMIT);
      const savedFetched = localStorage.getItem(LS_KEY_FETCHED_MODELS);
      const savedDetailLevel = localStorage.getItem(LS_KEY_AI_DETAIL_LEVEL) as "minimal" | "medium" | "detailed";

      if (savedDiffMode) setDefaultDiffMode(savedDiffMode);
      if (savedAutoFetch !== null) setAutoFetch(savedAutoFetch === "true");
      if (savedKey) setApiKey(savedKey);
      if (savedApiUrl) setApiUrl(savedApiUrl);
      if (savedModel) setModel(savedModel);
      if (savedLimit) setTokenLimit(Number(savedLimit));
      if (savedFetched) {
        try {
          setFetchedModels(JSON.parse(savedFetched));
        } catch {}
      }
      if (savedDetailLevel) setAiDetailLevel(savedDetailLevel);
      setSelectedTheme(currentTheme);
    } catch {
      // localStorage is not available
    }
  }, [currentTheme]);

  // Check for unsaved changes
  useEffect(() => {
    const storedDiffMode = (localStorage.getItem(LS_KEY_DIFF_MODE) as "split" | "unified") || "split";
    const storedAutoFetch = localStorage.getItem(LS_KEY_AUTO_FETCH) !== "false"; // default to true
    const storedKey = localStorage.getItem(LS_KEY_API_KEY) || "";
    const storedApiUrl = localStorage.getItem(LS_KEY_API_URL) || "";
    const storedModel = localStorage.getItem(LS_KEY_MODEL) || "claude-sonnet-4-20250514";
    const storedLimit = localStorage.getItem(LS_KEY_TOKEN_LIMIT) || "4096";
    const storedFetched = localStorage.getItem(LS_KEY_FETCHED_MODELS) || "[]";
    const storedDetailLevel = (localStorage.getItem(LS_KEY_AI_DETAIL_LEVEL) as "minimal" | "medium" | "detailed") || "medium";

    setHasChanges(
      theme !== currentTheme ||
      defaultDiffMode !== storedDiffMode ||
      autoFetch !== storedAutoFetch ||
      apiKey !== storedKey ||
      apiUrl !== storedApiUrl ||
      model !== storedModel ||
      tokenLimit !== Number(storedLimit) ||
      JSON.stringify(fetchedModels) !== storedFetched ||
      aiDetailLevel !== storedDetailLevel
    );
  }, [theme, currentTheme, defaultDiffMode, autoFetch, apiKey, apiUrl, model, tokenLimit, fetchedModels, aiDetailLevel]);

  const handleFetchModels = async () => {
    if (!apiUrl) {
      showToast("Please enter a Custom API URL first");
      return;
    }

    setFetchingModels(true);
    showToast("Connecting to custom API and fetching models...");

    try {
      let modelsList: { id: string; label: string }[] = [];

      // 1. Try standard OpenAI /v1/models endpoint via backend proxy
      const baseUrl = apiUrl.replace(/\/+$/, "");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      try {
        const res = await api.ai.request(`${baseUrl}/models`, "GET", headers);
        if (res.status >= 200 && res.status < 300) {
          const data = JSON.parse(res.body);
          if (Array.isArray(data.data)) {
            modelsList = data.data.map((m: any) => ({
              id: m.id,
              label: m.id
            }));
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      // 2. If empty, try Ollama /api/tags endpoint via backend proxy
      if (modelsList.length === 0) {
        const possibleEndpoints = [
          `${baseUrl}/api/tags`,
          `${baseUrl.replace(/\/v1$/, "")}/api/tags`
        ];

        for (const endpoint of possibleEndpoints) {
          try {
            const res = await api.ai.request(endpoint, "GET", {});
            if (res.status >= 200 && res.status < 300) {
              const data = JSON.parse(res.body);
              if (Array.isArray(data.models)) {
                modelsList = data.models.map((m: any) => ({
                  id: m.name,
                  label: m.name
                }));
                break;
              }
            }
          } catch (e) {
            // keep trying
          }
        }
      }

      if (modelsList.length > 0) {
        setFetchedModels(modelsList);
        if (!modelsList.some((m) => m.id === model)) {
          setModel(modelsList[0].id);
        }
        showToast(`Successfully loaded ${modelsList.length} models!`);
      } else {
        throw new Error("Could not retrieve models from standard /models or /api/tags endpoints.");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error fetching models: ${err.message || err}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = () => {
    try {
      setTheme(theme);
      localStorage.setItem(LS_KEY_DIFF_MODE, defaultDiffMode);
      localStorage.setItem(LS_KEY_AUTO_FETCH, String(autoFetch));
      localStorage.setItem(LS_KEY_API_KEY, apiKey);
      localStorage.setItem(LS_KEY_API_URL, apiUrl);
      localStorage.setItem(LS_KEY_MODEL, model);
      localStorage.setItem(LS_KEY_TOKEN_LIMIT, String(tokenLimit));
      localStorage.setItem(LS_KEY_FETCHED_MODELS, JSON.stringify(fetchedModels));
      localStorage.setItem(LS_KEY_AI_DETAIL_LEVEL, aiDetailLevel);
      
      setHasChanges(false);
      showToast("Settings saved successfully");
      
      // Instantly dispatch event so UI updates if necessary
      window.dispatchEvent(new Event("gitflow-settings-updated"));
      
      onClose?.();
    } catch (e: any) {
      showToast(`Error saving: ${e}`);
    }
  };

  const handleCancel = () => {
    onClose?.();
  };

  const maskKey = (key: string) => {
    if (!key) return "Not configured";
    if (showKey) return key;
    return key.slice(0, 8) + "..." + key.slice(-4);
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-surface-1">
        <div className="flex items-center gap-1.5 text-text-primary font-medium text-xs">
          <Settings size={14} className="text-accent" />
          <span>Application Settings</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex px-3 py-1.5 border-b border-border/60 bg-surface-1 gap-1">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-2.5 py-1 text-2xs font-medium rounded-mac flex items-center gap-1 transition-all ${
            activeTab === "general"
              ? "bg-accent/10 text-accent font-semibold"
              : "text-text-muted hover:text-text-primary hover:bg-surface-2"
          }`}
        >
          <Sliders size={12} />
          General
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-2.5 py-1 text-2xs font-medium rounded-mac flex items-center gap-1 transition-all ${
            activeTab === "ai"
              ? "bg-accent/10 text-accent font-semibold"
              : "text-text-muted hover:text-text-primary hover:bg-surface-2"
          }`}
        >
          <Sparkles size={12} />
          AI Integration
        </button>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "general" && (
          <div className="space-y-4">
            {/* Color Theme Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Color Theme</label>
              <select
                value={theme}
                onChange={(e) => setSelectedTheme(e.target.value as "light" | "dark")}
                className="w-full h-8 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
              <p className="text-2xs text-text-muted">
                Select your preferred user interface color scheme.
              </p>
            </div>

            {/* Default Diff Mode Selector */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-text-primary">Default Diff View Mode</label>
              <select
                value={defaultDiffMode}
                onChange={(e) => setDefaultDiffMode(e.target.value as "split" | "unified")}
                className="w-full h-8 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer"
              >
                <option value="split">Split View (Side-by-Side)</option>
                <option value="unified">Unified View (Combined)</option>
              </select>
              <p className="text-2xs text-text-muted">
                Choose the default presentation style when inspecting file differences.
              </p>
            </div>

            {/* Auto Fetch Toggle */}
            <div className="space-y-2 pt-2 border-t border-border/40 mt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoFetch}
                  onChange={(e) => setAutoFetch(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                Enable Background Auto-Fetch
              </label>
              <p className="text-2xs text-text-muted pl-5">
                Automatically queries git remote servers periodically to keep the branch commits and upstream status up-to-date.
              </p>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-4">
            {/* API Key */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full h-8 pr-7 pl-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 ghost p-1"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <p className="text-2xs text-text-muted">
                {apiKey ? maskKey(apiKey) : "Provide an API key to enable AI-powered Commit Message suggestions."}
              </p>
            </div>

            {/* Custom API URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Custom API URL (Endpoint)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1 or local gateway address"
                  className="flex-1 h-8 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={fetchingModels || !apiUrl}
                  className="px-3 h-8 text-2xs font-semibold bg-accent/15 text-accent border border-accent/25 hover:bg-accent/25 disabled:opacity-40 rounded-mac transition-all shrink-0 flex items-center justify-center gap-1"
                >
                  <RefreshCw size={11} className={fetchingModels ? "animate-spin" : ""} />
                  {fetchingModels ? "Fetching..." : "Fetch Models"}
                </button>
              </div>
              <p className="text-2xs text-text-muted">
                Override default provider endpoints (e.g. for proxies, self-hosted gateways, Ollama, etc.). Leave blank for default endpoints.
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">AI LLM Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer"
              >
                {fetchedModels.length > 0 && (
                  <optgroup label="Custom / Local API Models">
                    {fetchedModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Cloud Models (requires Key)">
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Local Models (Open Source)">
                  {LOCAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Token Limit */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-primary">Token Response Limit</label>
                <span className="text-2xs font-mono text-text-muted">{tokenLimit.toLocaleString()} tokens</span>
              </div>
              <input
                type="range"
                min={512}
                max={32768}
                step={512}
                value={tokenLimit}
                onChange={(e) => setTokenLimit(Number(e.target.value))}
                className="w-full h-1 bg-surface-2 rounded-full appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-2xs text-text-muted">
                <span>512</span>
                <span>4,096 (Default)</span>
                <span>32,768</span>
              </div>
            </div>

            {/* Commit Message Detail Level */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-text-primary">Commit Message Style</label>
              <select
                value={aiDetailLevel}
                onChange={(e) => setAiDetailLevel(e.target.value as any)}
                className="w-full h-7 px-2 text-xs bg-surface-1 border border-border rounded-mac text-text-primary focus:border-accent outline-none"
              >
                <option value="minimal">Minimal (Subject only, max 50 chars)</option>
                <option value="medium">Standard (Subject + brief change list)</option>
                <option value="detailed">Detailed (Comprehensive conventional format)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-surface-1">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 px-3 py-1 bg-accent text-accent-fg text-xs font-medium rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 px-3 py-1 text-xs text-text-muted hover:text-text-primary border border-border rounded-mac transition-colors"
        >
          Cancel
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
