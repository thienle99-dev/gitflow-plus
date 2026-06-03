import { useState, useEffect } from "react";
import {
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  Gauge,
  GitBranch,
  Keyboard,
  Link,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRepoStore } from "@/stores/repo";
import { api } from "@/api/tauri";
import { Switch } from "@/components/ui/form";
const LS_KEY_API_KEY = "gitflowAiApiKey";
const LS_KEY_API_URL = "gitflowAiApiUrl";
const LS_KEY_MODEL = "gitflowAiModel";
const LS_KEY_REVIEW_MODEL = "gitflowAiReviewModel";
const LS_KEY_TOKEN_LIMIT = "gitflowAiTokenLimit";
const LS_KEY_DIFF_MODE = "gitflowDefaultDiffViewMode";
const LS_KEY_AUTO_FETCH = "gitflowAutoFetch";
const LS_KEY_FETCHED_MODELS = "gitflowAiFetchedModels";
const LS_KEY_AI_DETAIL_LEVEL = "gitflowAiDetailLevel";
const LS_KEY_COMMIT_STYLE = "gitflowCommitMessageStyle";
const LS_KEY_AI_CUSTOM_RULES = "gitflowAiCustomRules";
const LS_KEY_AI_REVIEW_LANGUAGE = "gitflowAiReviewLanguage";
const LS_KEY_FETCH_INTERVAL = "gitflowFetchIntervalMinutes";
const LS_KEY_AUTO_PRUNE = "gitflowAutoPruneOnFetch";
const LS_KEY_CONFIRM_DANGEROUS = "gitflowConfirmDangerousActions";
const LS_KEY_REOPEN_LAST_REPO = "gitflowReopenLastRepo";
const LS_KEY_RECENT_REPO_LIMIT = "gitflowRecentRepoLimit";
const LS_KEY_GRAPH_DENSITY = "gitflowGraphDensity";
const LS_KEY_GRAPH_SHOW_HASH = "gitflowGraphShowHash";
const LS_KEY_GRAPH_SHOW_AUTHOR = "gitflowGraphShowAuthor";
const LS_KEY_GRAPH_SHOW_DATE = "gitflowGraphShowDate";
const LS_KEY_DIFF_CONTEXT = "gitflowDiffContextLines";
const LS_KEY_DIFF_LINE_WRAP = "gitflowDiffLineWrap";
const LS_KEY_LARGE_DIFF_MODE = "gitflowLargeDiffMode";
const LS_KEY_REDUCED_MOTION = "gitflowReducedMotion";
const LS_KEY_GITHUB_TOKEN = "gitflowGithubToken";
const LS_KEY_GITLAB_TOKEN = "gitflowGitlabToken";
const LS_KEY_GITLAB_HOST = "gitflowGitlabHost";
const LS_KEY_COMMIT_LINT_ENABLED = "gitflowCommitLintEnabled";
const LS_KEY_CODE_LINT_ENABLED = "gitflowCodeLintEnabled";
const LS_KEY_LINT_STRICTNESS = "gitflowLintStrictness";

const SETTINGS_KEYS = [
  LS_KEY_DIFF_MODE,
  LS_KEY_AUTO_FETCH,
  LS_KEY_FETCH_INTERVAL,
  LS_KEY_AUTO_PRUNE,
  LS_KEY_CONFIRM_DANGEROUS,
  LS_KEY_REOPEN_LAST_REPO,
  LS_KEY_RECENT_REPO_LIMIT,
  LS_KEY_GRAPH_DENSITY,
  LS_KEY_GRAPH_SHOW_HASH,
  LS_KEY_GRAPH_SHOW_AUTHOR,
  LS_KEY_GRAPH_SHOW_DATE,
  LS_KEY_DIFF_CONTEXT,
  LS_KEY_DIFF_LINE_WRAP,
  LS_KEY_LARGE_DIFF_MODE,
  LS_KEY_REDUCED_MOTION,
  LS_KEY_API_KEY,
  LS_KEY_API_URL,
  LS_KEY_MODEL,
  LS_KEY_REVIEW_MODEL,
  LS_KEY_TOKEN_LIMIT,
  LS_KEY_FETCHED_MODELS,
  LS_KEY_AI_DETAIL_LEVEL,
  LS_KEY_COMMIT_STYLE,
  LS_KEY_AI_CUSTOM_RULES,
  LS_KEY_AI_REVIEW_LANGUAGE,
  LS_KEY_GITHUB_TOKEN,
  LS_KEY_GITLAB_TOKEN,
  LS_KEY_GITLAB_HOST,
  LS_KEY_COMMIT_LINT_ENABLED,
  LS_KEY_CODE_LINT_ENABLED,
  LS_KEY_LINT_STRICTNESS,
];

interface SettingsDialogProps {
  onClose?: () => void;
  initialTab?: "general" | "git" | "accounts" | "ai" | "advanced";
}

const THEME_CARDS = [
  { id: "dark",             label: "macOS Dark",   group: "macOS",         colors: { bg: "#1c1c1e", surface: "#2c2c2e", sidebar: "#111113", accent: "#0a84ff", text: "#f5f5f7" } },
  { id: "light",            label: "macOS Light",  group: "macOS",         colors: { bg: "#ffffff", surface: "#f2f2f7", sidebar: "#e8e8ed", accent: "#007aff", text: "#1d1d1f" } },
  { id: "gruvbox-dark",     label: "Dark Medium",  group: "Gruvbox Dark",  colors: { bg: "#282828", surface: "#3c3836", sidebar: "#1d2021", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-dark-soft",label: "Dark Soft",    group: "Gruvbox Dark",  colors: { bg: "#32302f", surface: "#3c3836", sidebar: "#282828", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-dark-hard",label: "Dark Hard",    group: "Gruvbox Dark",  colors: { bg: "#1d2021", surface: "#282828", sidebar: "#141617", accent: "#d79921", text: "#ebdbb2" } },
  { id: "gruvbox-light",    label: "Light Medium", group: "Gruvbox Light", colors: { bg: "#fbf1c7", surface: "#f9f5d7", sidebar: "#ebdbb2", accent: "#b57614", text: "#3c3836" } },
  { id: "gruvbox-light-soft",label:"Light Soft",   group: "Gruvbox Light", colors: { bg: "#f2e5bc", surface: "#ebdbb2", sidebar: "#d5c4a1", accent: "#b57614", text: "#3c3836" } },
] as const;

const AI_REVIEW_LANGUAGES = [
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

const THEME_GROUPS = ["macOS", "Gruvbox Dark", "Gruvbox Light"] as const;

function ThemeSkeletonCard({ card, selected, onClick }: {
  card: typeof THEME_CARDS[number];
  selected: boolean;
  onClick: () => void;
}) {
  const c = card.colors;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-1.5 rounded-mac border transition-all focus:outline-none"
      style={{
        borderColor: selected ? c.accent : "transparent",
        background: selected ? c.accent + "18" : "transparent",
        boxShadow: selected ? `0 0 0 1px ${c.accent}` : undefined,
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

const COMMIT_MESSAGE_STYLES = [
  { id: "conventional", label: "Conventional Commits" },
  { id: "plain", label: "Plain imperative" },
  { id: "gitmoji", label: "Gitmoji Conventional" },
  { id: "jira", label: "Jira ticket prefix" },
] as const;

export default function SettingsDialog({ onClose, initialTab = "general" }: SettingsDialogProps) {
  const currentTheme = useRepoStore((s) => s.theme);
  const setTheme = useRepoStore((s) => s.setTheme);

  const [activeTab, setActiveTab] = useState<"general" | "git" | "accounts" | "ai" | "advanced">(initialTab);
  
  // General Tab States
  const [theme, setSelectedTheme] = useState<typeof currentTheme>(currentTheme);
  const [defaultDiffMode, setDefaultDiffMode] = useState<"split" | "unified">("split");
  const [graphDensity, setGraphDensity] = useState<"comfortable" | "compact">("comfortable");
  const [graphShowHash, setGraphShowHash] = useState(true);
  const [graphShowAuthor, setGraphShowAuthor] = useState(true);
  const [graphShowDate, setGraphShowDate] = useState(false);
  const [diffContext, setDiffContext] = useState(3);
  const [diffLineWrap, setDiffLineWrap] = useState(true);

  // Git Tab States
  const [autoFetch, setAutoFetch] = useState(true);
  const [fetchInterval, setFetchInterval] = useState(10);
  const [autoPrune, setAutoPrune] = useState(false);
  const [confirmDangerous, setConfirmDangerous] = useState(true);
  const [reopenLastRepo, setReopenLastRepo] = useState(false);
  const [recentRepoLimit, setRecentRepoLimit] = useState(10);
  const [commitLintEnabled, setCommitLintEnabled] = useState(true);
  const [codeLintEnabled, setCodeLintEnabled] = useState(true);
  const [lintStrictness, setLintStrictness] = useState<"warning" | "error" | "block_all">("error");

  // AI Tab States
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [commitModel, setCommitModel] = useState("claude-sonnet-4-20250514");
  const [reviewModel, setReviewModel] = useState("claude-sonnet-4-20250514");
  const [tokenLimit, setTokenLimit] = useState(4096);
  const [fetchedModels, setFetchedModels] = useState<{ id: string; label: string }[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [aiDetailLevel, setAiDetailLevel] = useState<"minimal" | "medium" | "detailed">("medium");
  const [commitStyle, setCommitStyle] = useState<"conventional" | "plain" | "gitmoji" | "jira">("conventional");
  const [customRules, setCustomRules] = useState("");
  const [reviewLanguage, setReviewLanguage] = useState("auto");

  // Advanced Tab States
  const [largeDiffMode, setLargeDiffMode] = useState<"full" | "prompt" | "summary">("prompt");
  const [reducedMotion, setReducedMotion] = useState(false);

  // Accounts Tab States
  const [githubToken, setGithubToken] = useState("");
  const [gitlabToken, setGitlabToken] = useState("");
  const [gitlabHost, setGitlabHost] = useState("");

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
      const savedFetchInterval = localStorage.getItem(LS_KEY_FETCH_INTERVAL);
      const savedAutoPrune = localStorage.getItem(LS_KEY_AUTO_PRUNE);
      const savedConfirmDangerous = localStorage.getItem(LS_KEY_CONFIRM_DANGEROUS);
      const savedReopenLastRepo = localStorage.getItem(LS_KEY_REOPEN_LAST_REPO);
      const savedRecentRepoLimit = localStorage.getItem(LS_KEY_RECENT_REPO_LIMIT);
      const savedCommitLint = localStorage.getItem(LS_KEY_COMMIT_LINT_ENABLED);
      const savedCodeLint = localStorage.getItem(LS_KEY_CODE_LINT_ENABLED);
      const savedLintStrictness = localStorage.getItem(LS_KEY_LINT_STRICTNESS) as "warning" | "error" | "block_all";
      const savedGraphDensity = localStorage.getItem(LS_KEY_GRAPH_DENSITY) as "comfortable" | "compact";
      const savedGraphShowHash = localStorage.getItem(LS_KEY_GRAPH_SHOW_HASH);
      const savedGraphShowAuthor = localStorage.getItem(LS_KEY_GRAPH_SHOW_AUTHOR);
      const savedGraphShowDate = localStorage.getItem(LS_KEY_GRAPH_SHOW_DATE);
      const savedDiffContext = localStorage.getItem(LS_KEY_DIFF_CONTEXT);
      const savedDiffLineWrap = localStorage.getItem(LS_KEY_DIFF_LINE_WRAP);
      const savedLargeDiffMode = localStorage.getItem(LS_KEY_LARGE_DIFF_MODE) as "full" | "prompt" | "summary";
      const savedReducedMotion = localStorage.getItem(LS_KEY_REDUCED_MOTION);
      const savedKey = localStorage.getItem(LS_KEY_API_KEY);
      const savedApiUrl = localStorage.getItem(LS_KEY_API_URL);
      const savedModel = localStorage.getItem(LS_KEY_MODEL);
      const savedReviewModel = localStorage.getItem(LS_KEY_REVIEW_MODEL);
      const savedLimit = localStorage.getItem(LS_KEY_TOKEN_LIMIT);
      const savedFetched = localStorage.getItem(LS_KEY_FETCHED_MODELS);
      const savedDetailLevel = localStorage.getItem(LS_KEY_AI_DETAIL_LEVEL) as "minimal" | "medium" | "detailed";
      const savedCommitStyle = localStorage.getItem(LS_KEY_COMMIT_STYLE) as "conventional" | "plain" | "gitmoji" | "jira";
      const savedCustomRules = localStorage.getItem(LS_KEY_AI_CUSTOM_RULES) || "";
      const savedReviewLanguage = localStorage.getItem(LS_KEY_AI_REVIEW_LANGUAGE) || "auto";

      if (savedDiffMode) setDefaultDiffMode(savedDiffMode);
      if (savedAutoFetch !== null) setAutoFetch(savedAutoFetch === "true");
      if (savedFetchInterval) setFetchInterval(Number(savedFetchInterval));
      if (savedAutoPrune !== null) setAutoPrune(savedAutoPrune === "true");
      if (savedConfirmDangerous !== null) setConfirmDangerous(savedConfirmDangerous === "true");
      if (savedReopenLastRepo !== null) setReopenLastRepo(savedReopenLastRepo === "true");
      if (savedRecentRepoLimit) setRecentRepoLimit(Number(savedRecentRepoLimit));
      if (savedCommitLint !== null) setCommitLintEnabled(savedCommitLint === "true");
      if (savedCodeLint !== null) setCodeLintEnabled(savedCodeLint === "true");
      if (savedLintStrictness) setLintStrictness(savedLintStrictness);
      if (savedGraphDensity) setGraphDensity(savedGraphDensity);
      if (savedGraphShowHash !== null) setGraphShowHash(savedGraphShowHash === "true");
      if (savedGraphShowAuthor !== null) setGraphShowAuthor(savedGraphShowAuthor === "true");
      if (savedGraphShowDate !== null) setGraphShowDate(savedGraphShowDate === "true");
      if (savedDiffContext) setDiffContext(Number(savedDiffContext));
      if (savedDiffLineWrap !== null) setDiffLineWrap(savedDiffLineWrap === "true");
      if (savedLargeDiffMode) setLargeDiffMode(savedLargeDiffMode);
      if (savedReducedMotion !== null) setReducedMotion(savedReducedMotion === "true");
      if (savedKey) setApiKey(savedKey);
      if (savedApiUrl) setApiUrl(savedApiUrl);
      if (savedModel) setCommitModel(savedModel);
      if (savedReviewModel) setReviewModel(savedReviewModel);
      else if (savedModel) setReviewModel(savedModel);
      if (savedLimit) setTokenLimit(Number(savedLimit));
      if (savedFetched) {
        try {
          setFetchedModels(JSON.parse(savedFetched));
        } catch {}
      }
      if (savedDetailLevel) setAiDetailLevel(savedDetailLevel);
      if (savedCommitStyle) setCommitStyle(savedCommitStyle);
      setCustomRules(savedCustomRules);
      setReviewLanguage(savedReviewLanguage);
      
      const savedGithubToken = localStorage.getItem(LS_KEY_GITHUB_TOKEN);
      const savedGitlabToken = localStorage.getItem(LS_KEY_GITLAB_TOKEN);
      const savedGitlabHost = localStorage.getItem(LS_KEY_GITLAB_HOST);
      if (savedGithubToken) setGithubToken(savedGithubToken);
      if (savedGitlabToken) setGitlabToken(savedGitlabToken);
      if (savedGitlabHost) setGitlabHost(savedGitlabHost);

      setSelectedTheme(currentTheme);
    } catch {
      // localStorage is not available
    }
  }, [currentTheme]);

  // Check for unsaved changes
  useEffect(() => {
    const storedDiffMode = (localStorage.getItem(LS_KEY_DIFF_MODE) as "split" | "unified") || "split";
    const storedAutoFetch = localStorage.getItem(LS_KEY_AUTO_FETCH) !== "false";
    const storedFetchInterval = localStorage.getItem(LS_KEY_FETCH_INTERVAL) || "10";
    const storedAutoPrune = localStorage.getItem(LS_KEY_AUTO_PRUNE) === "true";
    const storedConfirmDangerous = localStorage.getItem(LS_KEY_CONFIRM_DANGEROUS) !== "false";
    const storedReopenLastRepo = localStorage.getItem(LS_KEY_REOPEN_LAST_REPO) === "true";
    const storedRecentRepoLimit = localStorage.getItem(LS_KEY_RECENT_REPO_LIMIT) || "10";
    const storedCommitLint = localStorage.getItem(LS_KEY_COMMIT_LINT_ENABLED) !== "false";
    const storedCodeLint = localStorage.getItem(LS_KEY_CODE_LINT_ENABLED) !== "false";
    const storedLintStrictness = localStorage.getItem(LS_KEY_LINT_STRICTNESS) || "error";
    const storedGraphDensity = (localStorage.getItem(LS_KEY_GRAPH_DENSITY) as "comfortable" | "compact") || "comfortable";
    const storedGraphShowHash = localStorage.getItem(LS_KEY_GRAPH_SHOW_HASH) !== "false";
    const storedGraphShowAuthor = localStorage.getItem(LS_KEY_GRAPH_SHOW_AUTHOR) !== "false";
    const storedGraphShowDate = localStorage.getItem(LS_KEY_GRAPH_SHOW_DATE) === "true";
    const storedDiffContext = localStorage.getItem(LS_KEY_DIFF_CONTEXT) || "3";
    const storedDiffLineWrap = localStorage.getItem(LS_KEY_DIFF_LINE_WRAP) !== "false";
    const storedLargeDiffMode = (localStorage.getItem(LS_KEY_LARGE_DIFF_MODE) as "full" | "prompt" | "summary") || "prompt";
    const storedReducedMotion = localStorage.getItem(LS_KEY_REDUCED_MOTION) === "true";
    const storedKey = localStorage.getItem(LS_KEY_API_KEY) || "";
    const storedApiUrl = localStorage.getItem(LS_KEY_API_URL) || "";
    const storedModel = localStorage.getItem(LS_KEY_MODEL) || "claude-sonnet-4-20250514";
    const storedReviewModel = localStorage.getItem(LS_KEY_REVIEW_MODEL) || storedModel;
    const storedLimit = localStorage.getItem(LS_KEY_TOKEN_LIMIT) || "4096";
    const storedFetched = localStorage.getItem(LS_KEY_FETCHED_MODELS) || "[]";
    const storedDetailLevel = (localStorage.getItem(LS_KEY_AI_DETAIL_LEVEL) as "minimal" | "medium" | "detailed") || "medium";
    const storedCommitStyle = (localStorage.getItem(LS_KEY_COMMIT_STYLE) as "conventional" | "plain" | "gitmoji" | "jira") || "conventional";
    const storedCustomRules = localStorage.getItem(LS_KEY_AI_CUSTOM_RULES) || "";
    const storedReviewLanguage = localStorage.getItem(LS_KEY_AI_REVIEW_LANGUAGE) || "auto";
    const storedGithubToken = localStorage.getItem(LS_KEY_GITHUB_TOKEN) || "";
    const storedGitlabToken = localStorage.getItem(LS_KEY_GITLAB_TOKEN) || "";
    const storedGitlabHost = localStorage.getItem(LS_KEY_GITLAB_HOST) || "";

    setHasChanges(
      theme !== currentTheme ||
      defaultDiffMode !== storedDiffMode ||
      autoFetch !== storedAutoFetch ||
      fetchInterval !== Number(storedFetchInterval) ||
      autoPrune !== storedAutoPrune ||
      confirmDangerous !== storedConfirmDangerous ||
      reopenLastRepo !== storedReopenLastRepo ||
      recentRepoLimit !== Number(storedRecentRepoLimit) ||
      commitLintEnabled !== storedCommitLint ||
      codeLintEnabled !== storedCodeLint ||
      lintStrictness !== storedLintStrictness ||
      graphDensity !== storedGraphDensity ||
      graphShowHash !== storedGraphShowHash ||
      graphShowAuthor !== storedGraphShowAuthor ||
      graphShowDate !== storedGraphShowDate ||
      diffContext !== Number(storedDiffContext) ||
      diffLineWrap !== storedDiffLineWrap ||
      largeDiffMode !== storedLargeDiffMode ||
      reducedMotion !== storedReducedMotion ||
      apiKey !== storedKey ||
      apiUrl !== storedApiUrl ||
      commitModel !== storedModel ||
      reviewModel !== storedReviewModel ||
      tokenLimit !== Number(storedLimit) ||
      JSON.stringify(fetchedModels) !== storedFetched ||
      aiDetailLevel !== storedDetailLevel ||
      commitStyle !== storedCommitStyle ||
      customRules !== storedCustomRules ||
      reviewLanguage !== storedReviewLanguage ||
      githubToken !== storedGithubToken ||
      gitlabToken !== storedGitlabToken ||
      gitlabHost !== storedGitlabHost
    );
  }, [
    theme,
    currentTheme,
    defaultDiffMode,
    autoFetch,
    fetchInterval,
    autoPrune,
    confirmDangerous,
    reopenLastRepo,
    recentRepoLimit,
    commitLintEnabled,
    codeLintEnabled,
    lintStrictness,
    graphDensity,
    graphShowHash,
    graphShowAuthor,
    graphShowDate,
    diffContext,
    diffLineWrap,
    largeDiffMode,
    reducedMotion,
    apiKey,
    apiUrl,
    commitModel,
    reviewModel,
    tokenLimit,
    fetchedModels,
    aiDetailLevel,
    commitStyle,
    customRules,
    reviewLanguage,
    githubToken,
    gitlabToken,
    gitlabHost,
  ]);

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
        if (!modelsList.some((m) => m.id === commitModel)) {
          setCommitModel(modelsList[0].id);
        }
        if (!modelsList.some((m) => m.id === reviewModel)) {
          setReviewModel(modelsList[0].id);
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
      localStorage.setItem(LS_KEY_FETCH_INTERVAL, String(fetchInterval));
      localStorage.setItem(LS_KEY_AUTO_PRUNE, String(autoPrune));
      localStorage.setItem(LS_KEY_CONFIRM_DANGEROUS, String(confirmDangerous));
      localStorage.setItem(LS_KEY_REOPEN_LAST_REPO, String(reopenLastRepo));
      localStorage.setItem(LS_KEY_RECENT_REPO_LIMIT, String(recentRepoLimit));
      localStorage.setItem(LS_KEY_COMMIT_LINT_ENABLED, String(commitLintEnabled));
      localStorage.setItem(LS_KEY_CODE_LINT_ENABLED, String(codeLintEnabled));
      localStorage.setItem(LS_KEY_LINT_STRICTNESS, lintStrictness);
      localStorage.setItem(LS_KEY_GRAPH_DENSITY, graphDensity);
      localStorage.setItem(LS_KEY_GRAPH_SHOW_HASH, String(graphShowHash));
      localStorage.setItem(LS_KEY_GRAPH_SHOW_AUTHOR, String(graphShowAuthor));
      localStorage.setItem(LS_KEY_GRAPH_SHOW_DATE, String(graphShowDate));
      localStorage.setItem(LS_KEY_DIFF_CONTEXT, String(diffContext));
      localStorage.setItem(LS_KEY_DIFF_LINE_WRAP, String(diffLineWrap));
      localStorage.setItem(LS_KEY_LARGE_DIFF_MODE, largeDiffMode);
      localStorage.setItem(LS_KEY_REDUCED_MOTION, String(reducedMotion));
      localStorage.setItem(LS_KEY_API_KEY, apiKey);
      localStorage.setItem(LS_KEY_API_URL, apiUrl);
      localStorage.setItem(LS_KEY_MODEL, commitModel);
      localStorage.setItem(LS_KEY_REVIEW_MODEL, reviewModel);
      localStorage.setItem(LS_KEY_TOKEN_LIMIT, String(tokenLimit));
      localStorage.setItem(LS_KEY_FETCHED_MODELS, JSON.stringify(fetchedModels));
      localStorage.setItem(LS_KEY_AI_DETAIL_LEVEL, aiDetailLevel);
      localStorage.setItem(LS_KEY_COMMIT_STYLE, commitStyle);
      localStorage.setItem(LS_KEY_AI_CUSTOM_RULES, customRules);
      localStorage.setItem(LS_KEY_AI_REVIEW_LANGUAGE, reviewLanguage);
      localStorage.setItem(LS_KEY_GITHUB_TOKEN, githubToken);
      localStorage.setItem(LS_KEY_GITLAB_TOKEN, gitlabToken);
      localStorage.setItem(LS_KEY_GITLAB_HOST, gitlabHost);
      
      setHasChanges(false);
      showToast("Settings saved successfully");
      
      // Instantly dispatch event so UI updates if necessary
      window.dispatchEvent(new Event("gitflow-settings-updated"));
      
      onClose?.();
    } catch (e: any) {
      showToast(`Error saving: ${e}`);
    }
  };

  const handleClearAiCredentials = () => {
    setApiKey("");
    setApiUrl("");
    localStorage.removeItem(LS_KEY_API_KEY);
    localStorage.removeItem(LS_KEY_API_URL);
    showToast("AI credentials cleared");
    window.dispatchEvent(new Event("gitflow-settings-updated"));
  };

  const handleClearRecentRepos = () => {
    localStorage.setItem("recentRepos", "[]");
    showToast("Recent repositories cleared");
  };

  const handleResetSettings = () => {
    if (!confirm("Reset GitFlow Desktop settings to defaults?")) return;
    SETTINGS_KEYS.forEach((key) => localStorage.removeItem(key));
    setSelectedTheme(currentTheme);
    setDefaultDiffMode("split");
    setAutoFetch(true);
    setFetchInterval(10);
    setAutoPrune(false);
    setConfirmDangerous(true);
    setReopenLastRepo(false);
    setRecentRepoLimit(10);
    setCommitLintEnabled(true);
    setCodeLintEnabled(true);
    setLintStrictness("error");
    setGraphDensity("comfortable");
    setGraphShowHash(true);
    setGraphShowAuthor(true);
    setGraphShowDate(false);
    setDiffContext(3);
    setDiffLineWrap(true);
    setLargeDiffMode("prompt");
    setReducedMotion(false);
    setApiKey("");
    setApiUrl("");
    setCommitModel("claude-sonnet-4-20250514");
    setReviewModel("claude-sonnet-4-20250514");
    setTokenLimit(4096);
    setFetchedModels([]);
    setAiDetailLevel("medium");
    setCommitStyle("conventional");
    setCustomRules("");
    setGithubToken("");
    setGitlabToken("");
    setGitlabHost("");
    showToast("Settings reset to defaults");
    window.dispatchEvent(new Event("gitflow-settings-updated"));
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
    <div className="flex h-full w-full flex-row bg-surface-0 overflow-hidden select-none">
      {/* Left Sidebar (180px) */}
      <div className="w-[210px] shrink-0 border-r border-border-60 bg-surface-1 flex flex-col justify-between p-2">
        <div className="space-y-3">
          {/* Header/Title */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-primary font-semibold text-xs border-b border-border-60">
            <Settings size={14} className="text-accent" />
            <span>Settings</span>
          </div>

          {/* Navigation vertical list */}
          <div className="space-y-0.5">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-mac flex items-center gap-2.5 transition-all ${
                activeTab === "general"
                  ? "tab-accent-active font-semibold text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <div className="w-5 h-5 rounded-[5px] bg-[#007aff] flex items-center justify-center text-white shrink-0">
                <Sliders size={12} strokeWidth={2.2} />
              </div>
              General
            </button>

            <button
              onClick={() => setActiveTab("git")}
              className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-mac flex items-center gap-2.5 transition-all ${
                activeTab === "git"
                  ? "tab-accent-active font-semibold text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <div className="w-5 h-5 rounded-[5px] bg-[#ff2d55] flex items-center justify-center text-white shrink-0">
                <GitBranch size={12} strokeWidth={2.2} />
              </div>
              Git Core
            </button>

            <button
              onClick={() => setActiveTab("accounts")}
              className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-mac flex items-center gap-2.5 transition-all ${
                activeTab === "accounts"
                  ? "tab-accent-active font-semibold text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <div className="w-5 h-5 rounded-[5px] bg-[#5856d6] flex items-center justify-center text-white shrink-0">
                <Link size={12} strokeWidth={2.2} />
              </div>
              Accounts
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-mac flex items-center gap-2.5 transition-all ${
                activeTab === "ai"
                  ? "tab-accent-active font-semibold text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <div className="w-5 h-5 rounded-[5px] bg-[#ff9500] flex items-center justify-center text-white shrink-0">
                <Sparkles size={12} strokeWidth={2.2} />
              </div>
              AI Assistant
            </button>

            <button
              onClick={() => setActiveTab("advanced")}
              className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-mac flex items-center gap-2.5 transition-all ${
                activeTab === "advanced"
                  ? "tab-accent-active font-semibold text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <div className="w-5 h-5 rounded-[5px] bg-[#8e8e93] flex items-center justify-center text-white shrink-0">
                <Gauge size={12} strokeWidth={2.2} />
              </div>
              Advanced
            </button>
          </div>
        </div>

        {/* Sidebar Footer (Troubleshooting actions) */}
        <div className="pt-2 border-t border-border-60 px-1 space-y-0.5">
          <button
            type="button"
            onClick={handleResetSettings}
            className="w-full px-2 py-1 text-2xs font-medium text-text-muted hover:text-text-primary rounded-mac transition-colors flex items-center gap-2"
            title="Reset Settings"
          >
            <RotateCcw size={11} />
            Reset Settings
          </button>
        </div>
      </div>

      {/* Right Content Area (420px) */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Dynamic Detail Header */}
        <div className="px-5 py-3 border-b border-border-60 bg-surface-1/10 shrink-0">
          <h2 className="text-xs font-semibold text-text-primary">
            {activeTab === "general" && "General Settings"}
            {activeTab === "git" && "Git Core Settings"}
            {activeTab === "accounts" && "Accounts & Hosting Integrations"}
            {activeTab === "ai" && "AI Assistant Integration"}
            {activeTab === "advanced" && "Advanced Preferences"}
          </h2>
        </div>

        {/* Main Settings Form Scroll Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Color Theme Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
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
                                onClick={() => setSelectedTheme(card.id as any)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Diff & Graph Preferences Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
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
                </div>

                <div className="space-y-2 border-t border-border-40 pt-3">
                  <label className="text-xs font-semibold text-text-primary">Commit List Columns</label>
                  <div className="grid grid-cols-3 gap-2 bg-surface-1/40 rounded-mac p-2 border border-border-40">
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
            </div>
          )}

          {activeTab === "git" && (
            <div className="space-y-4">
              {/* Background Synchronization Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
                <div>
                  <Switch
                    checked={autoFetch}
                    onChange={setAutoFetch}
                    label="Enable Background Auto-Fetch"
                    description="Periodically refresh upstream status while a repository is open."
                  />
                </div>
                <div className={`border-t border-border-40 pt-3 flex items-center justify-between gap-4 transition-opacity ${!autoFetch ? "opacity-40" : ""}`}>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-text-primary">Fetch Interval</span>
                    <span className="text-2xs text-text-muted mt-0.5 leading-normal">How frequently GitFlow queries remotes for background updates.</span>
                  </div>
                  <div className="relative w-40 shrink-0">
                    <select
                      value={fetchInterval}
                      onChange={(e) => setFetchInterval(Number(e.target.value))}
                      disabled={!autoFetch}
                      className="w-full h-8 pl-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-mac text-text-primary outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surface-2 transition-all disabled:cursor-not-allowed"
                    >
                      <option value={5}>Every 5 minutes</option>
                      <option value={10}>Every 10 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every hour</option>
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                      <ChevronDown size={11} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Operations & Launch Preferences Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3">
                <Switch
                  checked={autoPrune}
                  onChange={setAutoPrune}
                  label="Prune deleted remote branches during fetch"
                  description="Automatically clean up stale remote-tracking references during fetch operations."
                />
                
                <div className="border-t border-border-40 pt-2.5">
                  <Switch
                    checked={confirmDangerous}
                    onChange={setConfirmDangerous}
                    label="Confirm destructive actions"
                    description="Show confirmation modals before carrying out dangerous Git tasks (force push, discard shifts)."
                  />
                </div>

                <div className="border-t border-border-40 pt-2.5">
                  <Switch
                    checked={reopenLastRepo}
                    onChange={setReopenLastRepo}
                    label="Reopen last repository on launch"
                    description="Automatically load the workspace you were last working on when opening GitFlow."
                  />
                </div>

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

              {/* Pre-Commit Quality Gates Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
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
          )}

          {activeTab === "accounts" && (
            <div className="space-y-4">
              {/* GitHub Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-[5px] bg-[#24292f] dark:bg-[#e6edf2] flex items-center justify-center text-white dark:text-[#24292f] shrink-0">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-text-primary">GitHub Integration</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="block text-2xs font-semibold text-text-secondary">
                    Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                    className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                  />
                  <p className="text-3xs text-text-muted leading-normal">
                    Requires `repo` scope to list pull requests, view diffs, and fetch branches.
                  </p>
                </div>
              </div>

              {/* GitLab Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-[5px] bg-[#e24329] flex items-center justify-center text-white shrink-0">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
                      <path d="M15.97 9.076a.54.54 0 00-.196-.606l-1.07-1.075L8 14.7l6.705-7.305-1.07-1.075a.54.54 0 00-.197-.606L8 1 2.563 6.015a.54.54 0 00-.196.606l-1.07 1.075L8 14.7.227 6.315a.54.54 0 00-.197-.606L8 1l5.437 5.015z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-text-primary">GitLab Integration</span>
                </div>
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-2xs font-semibold text-text-secondary">
                      Personal Access Token (PAT)
                    </label>
                    <input
                      type="password"
                      value={gitlabToken}
                      onChange={(e) => setGitlabToken(e.target.value)}
                      placeholder="glpat-..."
                      className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                    />
                  </div>
                  <div className="space-y-1.5 border-t border-border-40 pt-3">
                    <label className="block text-2xs font-semibold text-text-secondary">
                      Custom Host / Self-Hosted Instance (Optional)
                    </label>
                    <input
                      type="text"
                      value={gitlabHost}
                      onChange={(e) => setGitlabHost(e.target.value)}
                      placeholder="e.g. https://gitlab.yourcompany.com"
                      className="w-full h-8 px-2.5 bg-surface-1 hover:bg-surface-2 focus:bg-surface-0 border border-border focus:border-accent rounded-mac text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
                    />
                    <p className="text-3xs text-text-muted leading-normal">
                      Leave blank to use public cloud GitLab (https://gitlab.com).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* AI Provider Configuration Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
                {/* API Key */}
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

                {/* Custom API URL */}
                <div className="space-y-1 border-t border-border-40 pt-3">
                  <label className="text-xs font-semibold text-text-primary">Custom API URL (Endpoint)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1 or local gateway address"
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
                    Override default provider endpoints (e.g. for proxies, self-hosted gateways, Ollama). Leave blank for default endpoints.
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
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3.5">
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

                {/* Custom Rules */}
                <div className="space-y-1 border-t border-border-40 pt-3">
                  <label className="text-xs font-semibold text-text-primary">Custom Guidelines / Prompt Rules</label>
                  <textarea
                    value={customRules}
                    onChange={(e) => setCustomRules(e.target.value)}
                    placeholder="e.g. Always start with Jira ticket number [PROJ-XXXX] extracted from the branch name, or write in Vietnamese."
                    rows={3}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-1 border border-border rounded-mac text-text-primary focus:border-accent outline-none resize-y placeholder:text-text-muted/60 hover:bg-surface-2 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="space-y-4">
              {/* Performance Tuning Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3">
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
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3">
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
                    <div key={label} className="flex items-center justify-between gap-3 bg-surface-1/40 border border-border-40 rounded-mac px-2.5 py-1.5">
                      <span className="text-text-secondary text-2xs font-medium">{label}</span>
                      <span className="font-mono text-3xs font-semibold text-text-muted bg-surface-2 border border-border rounded px-1.5 py-0.5">
                        {shortcut}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnostics & Maintenance Card */}
              <div className="bg-surface-1/30 border border-border-40 rounded-mac p-3.5 space-y-3">
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
          )}
        </div>

        {/* Action Footer */}
        <div className="px-5 py-2.5 border-t border-border-60 bg-surface-1 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={handleCancel}
            className="px-4 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-border rounded-mac transition-colors min-w-[64px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-1 bg-accent text-accent-fg text-xs font-semibold rounded-mac disabled:opacity-40 hover:opacity-90 transition-opacity min-w-[64px]"
          >
            Save
          </button>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
