import { useState, useEffect } from "react";
import { showToast } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import {
  ChevronDown,
  Gauge,
  GitBranch,
  Link,
  RotateCcw,
  Settings,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useRepoStore, applyTheme, readStoredTheme } from "@/stores/repo";
import { AI_REVIEW_CHECKLIST_OPTIONS, DEFAULT_AI_REVIEW_CHECKLIST, type AIReviewMode, readDetectedConventions, clearAICache } from "@/lib/ai";
import type { ConventionFile } from "@/api/tauri";
import { api } from "@/api/tauri";
import {
  GeneralTab,
  AITab,
  IntegrationsTab,
  GitTab,
  AppearanceTab,
} from "./settings";

// Re-export for backward compatibility (OnboardingWizard imports these)
export { ThemeSkeletonCard, THEME_CARDS, THEME_GROUPS } from "./settings/GeneralTab";

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
const LS_KEY_AI_REVIEW_CHECKLIST = "gitflowAiReviewChecklist";
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
  LS_KEY_AI_REVIEW_CHECKLIST,
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

export default function SettingsDialog({ onClose, initialTab = "general" }: SettingsDialogProps) {
  const currentTheme = useRepoStore((s) => s.theme);
  const setTheme = useRepoStore((s) => s.setTheme);
  const repoPath = useRepoStore((s) => s.repoPath);

  const [activeTab, setActiveTab] = useState<"general" | "git" | "accounts" | "ai" | "advanced">(initialTab);
  
  // General Tab States
  const [theme, setSelectedTheme] = useState<typeof currentTheme>(currentTheme);

  // Revert preview theme on unmount if settings were not saved
  useEffect(() => {
    return () => {
      const storedTheme = readStoredTheme();
      applyTheme(storedTheme);
    };
  }, []);

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
  const [reviewChecklist, setReviewChecklist] = useState<Exclude<AIReviewMode, "all" | "custom">[]>(DEFAULT_AI_REVIEW_CHECKLIST);
  const [conventions, setConventions] = useState<ConventionFile[]>([]);
  const [expandedConvention, setExpandedConvention] = useState<string | null>(null);

  // Advanced Tab States
  const [largeDiffMode, setLargeDiffMode] = useState<"full" | "prompt" | "summary">("prompt");
  const [reducedMotion, setReducedMotion] = useState(false);

  // Accounts Tab States
  const [githubToken, setGithubToken] = useState("");
  const [gitlabToken, setGitlabToken] = useState("");
  const [gitlabHost, setGitlabHost] = useState("");

  const [hasChanges, setHasChanges] = useState(false);

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
      const savedReviewChecklist = localStorage.getItem(LS_KEY_AI_REVIEW_CHECKLIST);

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
      if (savedReviewChecklist) {
        try {
          const parsed = JSON.parse(savedReviewChecklist);
          const valid = new Set(AI_REVIEW_CHECKLIST_OPTIONS.map((option) => option.id));
          const filtered = Array.isArray(parsed)
            ? parsed.filter((value): value is Exclude<AIReviewMode, "all" | "custom"> => valid.has(value))
            : [];
          setReviewChecklist(filtered.length > 0 ? filtered : DEFAULT_AI_REVIEW_CHECKLIST);
        } catch {
          setReviewChecklist(DEFAULT_AI_REVIEW_CHECKLIST);
        }
      }
      
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

  // Load detected convention files when repoPath changes
  useEffect(() => {
    if (!repoPath) {
      setConventions([]);
      return;
    }
    let cancelled = false;
    readDetectedConventions(repoPath).then((files) => {
      if (!cancelled) setConventions(files);
    });
    return () => { cancelled = true; };
  }, [repoPath]);

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
    const storedReviewChecklist = localStorage.getItem(LS_KEY_AI_REVIEW_CHECKLIST) || JSON.stringify(DEFAULT_AI_REVIEW_CHECKLIST);
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
      JSON.stringify(reviewChecklist) !== storedReviewChecklist ||
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
    reviewChecklist,
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

  const toggleReviewChecklistItem = (id: Exclude<AIReviewMode, "all" | "custom">) => {
    setReviewChecklist((current) => {
      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);
        return next.length > 0 ? next : current;
      }
      return [...current, id];
    });
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
      localStorage.setItem(LS_KEY_AI_REVIEW_CHECKLIST, JSON.stringify(reviewChecklist));
      localStorage.setItem(LS_KEY_GITHUB_TOKEN, githubToken);
      localStorage.setItem(LS_KEY_GITLAB_TOKEN, gitlabToken);
      localStorage.setItem(LS_KEY_GITLAB_HOST, gitlabHost);
      
      clearAICache();

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

  // confirmState used for ConfirmDialog (will be added later)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleResetSettings = () => {
    setConfirmResetOpen(true);
  };

  const doResetSettings = () => {
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
    setReviewLanguage("auto");
    setReviewChecklist(DEFAULT_AI_REVIEW_CHECKLIST);
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
        <div className="px-5 py-3 border-b border-border-60 bg-surface-1-10 shrink-0">
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
            <GeneralTab
              theme={theme}
              setSelectedTheme={setSelectedTheme}
              defaultDiffMode={defaultDiffMode}
              setDefaultDiffMode={setDefaultDiffMode}
              graphDensity={graphDensity}
              setGraphDensity={setGraphDensity}
              graphShowHash={graphShowHash}
              setGraphShowHash={setGraphShowHash}
              graphShowAuthor={graphShowAuthor}
              setGraphShowAuthor={setGraphShowAuthor}
              graphShowDate={graphShowDate}
              setGraphShowDate={setGraphShowDate}
              diffContext={diffContext}
              setDiffContext={setDiffContext}
              diffLineWrap={diffLineWrap}
              setDiffLineWrap={setDiffLineWrap}
            />
          )}

          {activeTab === "git" && (
            <GitTab
              autoFetch={autoFetch}
              setAutoFetch={setAutoFetch}
              fetchInterval={fetchInterval}
              setFetchInterval={setFetchInterval}
              autoPrune={autoPrune}
              setAutoPrune={setAutoPrune}
              confirmDangerous={confirmDangerous}
              setConfirmDangerous={setConfirmDangerous}
              reopenLastRepo={reopenLastRepo}
              setReopenLastRepo={setReopenLastRepo}
              recentRepoLimit={recentRepoLimit}
              setRecentRepoLimit={setRecentRepoLimit}
              commitLintEnabled={commitLintEnabled}
              setCommitLintEnabled={setCommitLintEnabled}
              codeLintEnabled={codeLintEnabled}
              setCodeLintEnabled={setCodeLintEnabled}
              lintStrictness={lintStrictness}
              setLintStrictness={setLintStrictness}
            />
          )}

          {activeTab === "accounts" && (
            <IntegrationsTab
              githubToken={githubToken}
              setGithubToken={setGithubToken}
              gitlabToken={gitlabToken}
              setGitlabToken={setGitlabToken}
              gitlabHost={gitlabHost}
              setGitlabHost={setGitlabHost}
            />
          )}

          {activeTab === "ai" && (
            <AITab
              apiKey={apiKey}
              setApiKey={setApiKey}
              apiUrl={apiUrl}
              setApiUrl={setApiUrl}
              showKey={showKey}
              setShowKey={setShowKey}
              commitModel={commitModel}
              setCommitModel={setCommitModel}
              reviewModel={reviewModel}
              setReviewModel={setReviewModel}
              tokenLimit={tokenLimit}
              setTokenLimit={setTokenLimit}
              aiDetailLevel={aiDetailLevel}
              setAiDetailLevel={setAiDetailLevel}
              commitStyle={commitStyle}
              setCommitStyle={setCommitStyle}
              customRules={customRules}
              setCustomRules={setCustomRules}
              reviewLanguage={reviewLanguage}
              setReviewLanguage={setReviewLanguage}
              reviewChecklist={reviewChecklist}
              setReviewChecklist={setReviewChecklist}
              handleFetchModels={handleFetchModels}
              toggleReviewChecklistItem={toggleReviewChecklistItem}
              maskKey={maskKey}
              fetchedModels={fetchedModels}
              fetchingModels={fetchingModels}
              conventions={conventions}
              expandedConvention={expandedConvention}
              setExpandedConvention={setExpandedConvention}
              repoPath={repoPath}
            />
          )}

          {activeTab === "advanced" && (
            <AppearanceTab
              largeDiffMode={largeDiffMode}
              setLargeDiffMode={setLargeDiffMode}
              reducedMotion={reducedMotion}
              setReducedMotion={setReducedMotion}
              handleClearAiCredentials={handleClearAiCredentials}
              handleClearRecentRepos={handleClearRecentRepos}
            />
          )}
          <ConfirmDialog
            open={confirmResetOpen}
            title="Reset Settings"
            message="Reset all GitFlow Desktop settings to their factory defaults?"
            impactItems={[
              {
                label: "All custom settings (theme, AI config, git preferences, integrations) will be lost",
                severity: "irreversible",
              },
              {
                label: "Repository history and recent repos list are preserved",
                severity: "info",
              },
            ]}
            variant="destructive"
            confirmLabel="Reset Settings"
            onConfirm={() => { setConfirmResetOpen(false); doResetSettings(); }}
            onCancel={() => setConfirmResetOpen(false)}
          />
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

    </div>
  );
}
