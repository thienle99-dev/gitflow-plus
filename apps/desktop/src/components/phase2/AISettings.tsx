import { useState, useEffect } from "react";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/common/form";
import Select from "@/components/common/form/Select";

const LS_KEY_API_KEY = "gitflowAiApiKey";
const LS_KEY_MODEL = "gitflowAiModel";
const LS_KEY_TOKEN_LIMIT = "gitflowAiTokenLimit";

interface AISettingsProps {
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

export default function AISettings({ onClose }: AISettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [tokenLimit, setTokenLimit] = useState(4096);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load persisted settings on mount (theme-like pattern from repo store)
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem(LS_KEY_API_KEY);
      const savedModel = localStorage.getItem(LS_KEY_MODEL);
      const savedLimit = localStorage.getItem(LS_KEY_TOKEN_LIMIT);
      if (savedKey) setApiKey(savedKey);
      if (savedModel) setModel(savedModel);
      if (savedLimit) setTokenLimit(Number(savedLimit));
    } catch {
      // localStorage not available
    }
  }, []);

  // Track if there are unsaved changes
  useEffect(() => {
    const storedKey = localStorage.getItem(LS_KEY_API_KEY) || "";
    const storedModel = localStorage.getItem(LS_KEY_MODEL) || "claude-sonnet-4-20250514";
    const storedLimit = localStorage.getItem(LS_KEY_TOKEN_LIMIT) || "4096";
    setHasChanges(
      apiKey !== storedKey ||
      model !== storedModel ||
      tokenLimit !== Number(storedLimit)
    );
  }, [apiKey, model, tokenLimit]);

  const handleSave = () => {
    try {
      localStorage.setItem(LS_KEY_API_KEY, apiKey);
      localStorage.setItem(LS_KEY_MODEL, model);
      localStorage.setItem(LS_KEY_TOKEN_LIMIT, String(tokenLimit));
      setHasChanges(false);
      showToast("AI settings saved");
      onClose?.();
    } catch (e: any) {
      showToast(`Error saving: ${e}`);
    }
  };

  const handleCancel = () => {
    // Reload original values
    setApiKey(localStorage.getItem(LS_KEY_API_KEY) || "");
    setModel(localStorage.getItem(LS_KEY_MODEL) || "claude-sonnet-4-20250514");
    setTokenLimit(Number(localStorage.getItem(LS_KEY_TOKEN_LIMIT)) || 4096);
    setHasChanges(false);
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
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-1">
        <Sparkles size={14} className="text-accent" />
        <span className="text-xs font-medium text-text-primary flex-1">
          AI Integration Settings
        </span>
      </div>

      {/* Settings form */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* API Key */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-primary">API Key</label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              variant="surface-1"
              className="h-8 pr-7 pl-2 text-xs"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 ghost p-1"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <p className="text-2xs text-text-muted">
            {apiKey ? maskKey(apiKey) : "Enter an API key for Claude or OpenAI"}
          </p>
        </div>

        {/* Model selector */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-primary">Model</label>
          <Select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            variant="surface-1"
            className="h-8 px-2 text-xs"
          >
            <optgroup label="Cloud Models">
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
              ))}
            </optgroup>
            <optgroup label="Local Models">
              {LOCAL_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
          </Select>
        </div>

        {/* Token limit slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-primary">Max Tokens</label>
            <span className="text-2xs font-mono text-text-muted">{tokenLimit.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={512}
            max={32768}
            step={512}
            value={tokenLimit}
            onChange={(e) => setTokenLimit(Number(e.target.value))}
            className="w-full h-1.5 bg-surface-2 rounded-full appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
          />
          <div className="flex justify-between text-2xs text-text-muted">
            <span>512</span>
            <span>4K (default)</span>
            <span>32K</span>
          </div>
        </div>
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
