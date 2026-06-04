import {
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { AI_REVIEW_CHECKLIST_OPTIONS, DEFAULT_AI_REVIEW_CHECKLIST, type AIReviewMode } from "@/lib/ai";
import type { ConventionFile } from "@/api/tauri";
import {
  AI_PROVIDER_OPTIONS,
  defaultApiUrlForProvider,
  providerNeedsApiKey,
  type AIProviderProfile,
  type AIProviderType,
} from "@/lib/ai-profiles";

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-haiku-3-20250101", label: "Claude Haiku 3" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

export const LOCAL_MODELS = [
  { id: "ollama", label: "Ollama (local)" },
  { id: "llama.cpp", label: "llama.cpp (local)" },
];

export const COMMIT_MESSAGE_STYLES = [
  { id: "conventional", label: "Conventional Commits" },
  { id: "plain", label: "Plain imperative" },
  { id: "gitmoji", label: "Gitmoji Conventional" },
  { id: "jira", label: "Jira ticket prefix" },
] as const;

export const AI_REVIEW_LANGUAGES = [
  { id: "auto", label: "Auto detect" },
  { id: "english", label: "English" },
  { id: "vietnamese", label: "Vietnamese" },
  { id: "japanese", label: "Japanese" },
  { id: "korean", label: "Korean" },
  { id: "chinese", label: "Chinese" },
  { id: "spanish", label: "Spanish" },
  { id: "french", label: "French" },
  { id: "german", label: "German" },
] as const;

interface AITabProps {
  // Profile management
  profiles: AIProviderProfile[];
  activeProfileId: string;
  onSwitchProfile: (id: string) => void;
  onAddProfile: () => void;
  onDuplicateProfile: () => void;
  onDeleteProfile: () => void;
  onRenameProfile: (name: string) => void;
  // Provider type (bound to active profile)
  provider: AIProviderType;
  setProvider: (v: AIProviderType) => void;
  // Credential / model props (bound to active profile)
  apiKey: string;
  setApiKey: (v: string) => void;
  apiUrl: string;
  setApiUrl: (v: string) => void;
  showKey: boolean;
  setShowKey: (v: boolean) => void;
  commitModel: string;
  setCommitModel: (v: string) => void;
  reviewModel: string;
  setReviewModel: (v: string) => void;
  tokenLimit: number;
  setTokenLimit: (v: number) => void;
  aiDetailLevel: "minimal" | "medium" | "detailed";
  setAiDetailLevel: (v: any) => void;
  commitStyle: "conventional" | "plain" | "gitmoji" | "jira";
  setCommitStyle: (v: any) => void;
  customRules: string;
  setCustomRules: (v: string) => void;
  reviewLanguage: string;
  setReviewLanguage: (v: string) => void;
  reviewChecklist: Exclude<AIReviewMode, "all" | "custom">[];
  setReviewChecklist: (v: Exclude<AIReviewMode, "all" | "custom">[]) => void;
  handleFetchModels: () => void;
  toggleReviewChecklistItem: (id: Exclude<AIReviewMode, "all" | "custom">) => void;
  maskKey: (key: string) => string;
  fetchedModels: { id: string; label: string }[];
  fetchingModels: boolean;
  conventions: ConventionFile[];
  expandedConvention: string | null;
  setExpandedConvention: (v: string | null) => void;
  repoPath: string | null;
}

export function AITab({
  profiles,
  activeProfileId,
  onSwitchProfile,
  onAddProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onRenameProfile,
  provider,
  setProvider,
  apiKey,
  setApiKey,
  apiUrl,
  setApiUrl,
  showKey,
  setShowKey,
  commitModel,
  setCommitModel,
  reviewModel,
  setReviewModel,
  tokenLimit,
  setTokenLimit,
  aiDetailLevel,
  setAiDetailLevel,
  commitStyle,
  setCommitStyle,
  customRules,
  setCustomRules,
  reviewLanguage,
  setReviewLanguage,
  reviewChecklist,
  setReviewChecklist,
  handleFetchModels,
  toggleReviewChecklistItem,
  maskKey,
  fetchedModels,
  fetchingModels,
  conventions,
  expandedConvention,
  setExpandedConvention,
  repoPath,
}: AITabProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const needsApiKey = providerNeedsApiKey(provider);

  const startRename = () => {
    setNameDraft(activeProfile?.name || "");
    setEditingName(true);
  };

  const commitRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== activeProfile?.name) {
      onRenameProfile(trimmed);
    }
    setEditingName(false);
  };

  const handleProviderChange = (newProvider: AIProviderType) => {
    setProvider(newProvider);
    // Auto-set API URL to the default for the selected provider
    setApiUrl(defaultApiUrlForProvider(newProvider));
  };

  return (
    <div className="space-y-4">
      {/* ── Profile Selector Card ──────────────────────────────────────── */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-accent shrink-0" />
          <label className="text-xs font-semibold text-text-primary">API Profile</label>
        </div>

        {/* Profile dropdown + actions */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <select
              value={activeProfileId}
              onChange={(e) => onSwitchProfile(e.target.value)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>

          <button
            type="button"
            onClick={onAddProfile}
            className="h-8 w-8 flex items-center justify-center rounded-mac border border-border-60 bg-surface-1 hover:bg-surface-2 transition-all text-text-muted hover:text-accent"
            title="Add new profile"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={onDuplicateProfile}
            className="h-8 w-8 flex items-center justify-center rounded-mac border border-border-60 bg-surface-1 hover:bg-surface-2 transition-all text-text-muted hover:text-accent"
            title="Duplicate active profile"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            onClick={onDeleteProfile}
            disabled={profiles.length <= 1}
            className="h-8 w-8 flex items-center justify-center rounded-mac border border-border-60 bg-surface-1 hover:bg-surface-2 transition-all text-text-muted hover:text-red-400 disabled:opacity-30 disabled:hover:text-text-muted"
            title="Delete active profile"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Profile name (inline rename) */}
        <div className="flex items-center gap-2">
          <span className="text-2xs text-text-muted">Name:</span>
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 h-6 px-2 text-xs bg-surface-1 border border-accent rounded-mac text-text-primary outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={startRename}
              className="text-xs text-text-primary font-medium hover:text-accent transition-colors underline-offset-2 hover:underline"
            >
              {activeProfile?.name || "Untitled"}
            </button>
          )}
        </div>
      </div>

      {/* ── Provider Type Dropdown ──────────────────────────────────────── */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-primary">Provider Type</label>
        <div className="relative">
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as AIProviderType)}
            className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
          >
            {AI_PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            <ChevronDown size={11} strokeWidth={2.5} />
          </div>
        </div>
        <p className="text-2xs text-text-muted">
          Select your AI provider type first, then configure the API key and endpoint below.
        </p>
      </div>

      {/* AI Provider Configuration Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        {/* API Key — only shown when the provider needs one */}
        {needsApiKey && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full h-8 pr-7 pl-2.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 ghost p-1 text-text-muted hover:text-text-primary"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <p className="text-2xs text-text-muted">
              {apiKey ? maskKey(apiKey) : "Provide an API key to enable AI-powered Commit Message suggestions."}
            </p>
          </div>
        )}

        {/* Custom API URL */}
        <div className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">Custom API URL (Endpoint)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={
                provider === "ollama" ? "http://localhost:11434"
                : provider === "llamacpp" ? "http://localhost:8080"
                : provider === "anthropic" ? "https://api.anthropic.com"
                : "https://api.openai.com/v1 or local gateway address"
              }
              className="flex-1 h-8 px-2.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={fetchingModels || !apiUrl}
              className="px-3 h-8 text-2xs font-semibold btn-accent-soft border border-border-60 disabled:opacity-40 rounded-mac transition-all shrink-0 flex items-center justify-center gap-1"
            >
              <RefreshCw size={11} className={fetchingModels ? "animate-spin" : ""} />
              {fetchingModels ? "Fetching..." : "Fetch Models"}
            </button>
          </div>
          <p className="text-2xs text-text-muted">
            {provider === "ollama"
              ? "Default: http://localhost:11434. Override if your Ollama server runs on a different address."
              : provider === "llamacpp"
                ? "Default: http://localhost:8080. Override if your llama.cpp server runs on a different address."
                : "Override default provider endpoints (e.g. for proxies, self-hosted gateways). Leave blank for default."}
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">AI Models</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-2xs font-semibold text-text-muted">Generate Commit</span>
              <div className="relative">
                <select
                  value={commitModel}
                  onChange={(e) => setCommitModel(e.target.value)}
                  className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
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
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown size={11} strokeWidth={2.5} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-2xs font-semibold text-text-muted">Review / Explain</span>
              <div className="relative">
                <select
                  value={reviewModel}
                  onChange={(e) => setReviewModel(e.target.value)}
                  className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
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
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown size={11} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Token Limit */}
        <div className="space-y-1 border-t border-border-40 pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary">Token Response Limit</label>
            <span className="text-2xs font-mono text-accent font-semibold">{tokenLimit.toLocaleString()} tokens</span>
          </div>
          <input
            type="range"
            min={512}
            max={32768}
            step={512}
            value={tokenLimit}
            onChange={(e) => setTokenLimit(Number(e.target.value))}
            className="w-full h-1 bg-surface-2 rounded-full appearance-none cursor-pointer accent-accent my-2"
          />
          <div className="flex justify-between text-3xs text-text-muted">
            <span>512</span>
            <span>4,096 (Default)</span>
            <span>32,768</span>
          </div>
        </div>
      </div>

      {/* Suggestion Preferences Card */}
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
        {/* Commit Message Style */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-primary">Commit Message Style</label>
          <div className="relative">
            <select
              value={commitStyle}
              onChange={(e) => setCommitStyle(e.target.value as any)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              {COMMIT_MESSAGE_STYLES.map((style) => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Commit Message Detail Level */}
        <div className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">Commit Message Detail</label>
          <div className="relative">
            <select
              value={aiDetailLevel}
              onChange={(e) => setAiDetailLevel(e.target.value as any)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              <option value="ultra-minimal">Ultra-Minimal (Subject only)</option>
              <option value="minimal">Minimal (Subject + brief context)</option>
              <option value="medium">Standard (Subject + 3-4 bullet points)</option>
              <option value="detailed">Detailed (Subject + body + 5-8 bullets)</option>
              <option value="comprehensive">Comprehensive (Full format + reasoning)</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* AI Review Language */}
        <div className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">AI Review Language</label>
          <div className="relative">
            <select
              value={reviewLanguage}
              onChange={(e) => setReviewLanguage(e.target.value)}
              className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all"
            >
              {AI_REVIEW_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <ChevronDown size={11} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-2xs text-text-muted">
            Used for AI diff reviews, commit explanations, and merge request reviews.
          </p>
        </div>

        {/* AI Review Checklist */}
        <div className="space-y-2 border-t border-border-40 pt-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-text-primary">Custom Review Checklist</label>
            <button
              type="button"
              onClick={() => setReviewChecklist(DEFAULT_AI_REVIEW_CHECKLIST)}
              className="text-2xs font-medium text-text-muted hover:text-accent transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {AI_REVIEW_CHECKLIST_OPTIONS.map((option) => {
              const checked = reviewChecklist.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleReviewChecklistItem(option.id)}
                  className={`flex items-start gap-2 rounded-mac border px-2.5 py-2 text-left transition-all ${
                    checked
                      ? "border-accent-30 bg-accent-10 text-text-primary"
                      : "border-border-40 bg-surface-1-40 text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  <span className={`mt-0.5 h-3.5 w-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${
                    checked ? "border-accent bg-accent text-accent-fg" : "border-border"
                  }`}>
                    {checked && <span className="text-[9px] leading-none">✓</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-2xs font-semibold">{option.label}</span>
                    <span className="block text-3xs text-text-muted leading-normal">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-2xs text-text-muted">
            Used when you choose "Custom checklist" from any AI Review dropdown.
          </p>
        </div>

        {/* Custom Rules */}
        <div className="space-y-1 border-t border-border-40 pt-3">
          <label className="text-xs font-semibold text-text-primary">Custom Guidelines / Prompt Rules</label>
          <textarea
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            placeholder="e.g. Always start with Jira ticket number [PROJ-XXXX] extracted from the branch name, or write in Vietnamese."
            rows={3}
            className="w-full px-2.5 py-1.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary focus:border-accent outline-none resize-y placeholder:text-text-muted-60 hover:bg-surface-2 transition-all"
          />
        </div>

        {/* Convention Files Preview */}
        {repoPath && (
          <div className="space-y-1.5 border-t border-border-40 pt-3">
            <label className="text-xs font-semibold text-text-primary">Detected Convention Files</label>
            <p className="text-2xs text-text-muted">
              Project conventions from <code className="px-1 py-0.5 bg-surface-2 rounded text-text-secondary">CLAUDE.md</code>,{" "}
              <code className="px-1 py-0.5 bg-surface-2 rounded text-text-secondary">.cursorrules</code>,{" "}
              <code className="px-1 py-0.5 bg-surface-2 rounded text-text-secondary">AGENTS.md</code>, etc. are auto-injected into all AI prompts.
            </p>
            {conventions.length === 0 ? (
              <p className="text-2xs text-text-muted italic">No convention files found in this repository.</p>
            ) : (
              <div className="space-y-1 mt-1.5">
                {conventions.map((file) => (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => setExpandedConvention(expandedConvention === file.name ? null : file.name)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-mac bg-surface-1 border border-border hover:bg-surface-2 transition-all text-left"
                  >
                    <FileText size={12} className="text-accent shrink-0" />
                    <span className="text-text-primary font-medium truncate">{file.name}</span>
                    <span className="text-2xs text-text-muted ml-auto">{file.content.length} chars</span>
                    <ChevronDown
                      size={11}
                      className={`text-text-muted shrink-0 transition-transform ${expandedConvention === file.name ? "rotate-180" : ""}`}
                    />
                  </button>
                ))}
                {expandedConvention && conventions.find((f) => f.name === expandedConvention) && (
                  <div className="mt-1 p-2.5 text-2xs text-text-secondary bg-surface-1 border border-border rounded-mac max-h-40 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                    {conventions.find((f) => f.name === expandedConvention)!.content}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
