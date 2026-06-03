import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Palette,
  Globe,
  Rocket,
  Github,
  Gitlab,
  Eye,
  EyeOff,
  X,
  Check,
} from "lucide-react";
import { useRepoStore, THEME_CLASSES, type Theme } from "@/stores/repo";
import { Switch } from "@/components/ui/form";
import { AI_REVIEW_CHECKLIST_OPTIONS, DEFAULT_AI_REVIEW_CHECKLIST, type AIReviewMode } from "@/lib/ai";

const ONBOARDING_KEY = "gitflowOnboardingComplete";

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
}

const LS_KEY_AI_API_KEY = "gitflowAiApiKey";
const LS_KEY_AI_API_URL = "gitflowAiApiUrl";
const LS_KEY_AI_MODEL = "gitflowAiModel";
const LS_KEY_AI_REVIEW_MODEL = "gitflowAiReviewModel";
const LS_KEY_AI_CUSTOM_RULES = "gitflowAiCustomRules";
const LS_KEY_AI_REVIEW_LANGUAGE = "gitflowAiReviewLanguage";
const LS_KEY_AI_REVIEW_CHECKLIST = "gitflowAiReviewChecklist";
const LS_KEY_GITHUB_TOKEN = "gitflowGithubToken";
const LS_KEY_GITLAB_TOKEN = "gitflowGitlabToken";
const LS_KEY_GITLAB_HOST = "gitflowGitlabHost";
const LS_KEY_AUTO_FETCH = "gitflowAutoFetch";
const LS_KEY_REOPEN_LAST_REPO = "gitflowReopenLastRepo";
const LS_KEY_CONFIRM_DANGEROUS = "gitflowConfirmDangerousActions";
const LS_KEY_DIFF_MODE = "gitflowDefaultDiffViewMode";

export default function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const theme = useRepoStore((s) => s.theme);
  const setTheme = useRepoStore((s) => s.setTheme);

  // AI state
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem(LS_KEY_AI_API_KEY) || "");
  const [aiApiUrl, setAiApiUrl] = useState(() => localStorage.getItem(LS_KEY_AI_API_URL) || "https://api.openai.com/v1");
  const [aiModel, setAiModel] = useState(() => localStorage.getItem(LS_KEY_AI_MODEL) || "claude-sonnet-4-20250514");
  const [aiReviewModel, setAiReviewModel] = useState(() => localStorage.getItem(LS_KEY_AI_REVIEW_MODEL) || localStorage.getItem(LS_KEY_AI_MODEL) || "claude-sonnet-4-20250514");
  const [customRules, setCustomRules] = useState(() => localStorage.getItem(LS_KEY_AI_CUSTOM_RULES) || "");
  const [reviewLanguage, setReviewLanguage] = useState(() => localStorage.getItem(LS_KEY_AI_REVIEW_LANGUAGE) || "auto");
  const [reviewChecklist, setReviewChecklist] = useState<Exclude<AIReviewMode, "all" | "custom">[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LS_KEY_AI_REVIEW_CHECKLIST) || "null");
      const valid = new Set(AI_REVIEW_CHECKLIST_OPTIONS.map((option) => option.id));
      const filtered = Array.isArray(parsed)
        ? parsed.filter((value): value is Exclude<AIReviewMode, "all" | "custom"> => valid.has(value))
        : [];
      return filtered.length > 0 ? filtered : DEFAULT_AI_REVIEW_CHECKLIST;
    } catch {
      return DEFAULT_AI_REVIEW_CHECKLIST;
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);

  // Git host state
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem(LS_KEY_GITHUB_TOKEN) || "");
  const [gitlabToken, setGitlabToken] = useState(() => localStorage.getItem(LS_KEY_GITLAB_TOKEN) || "");
  const [gitlabHost, setGitlabHost] = useState(() => localStorage.getItem(LS_KEY_GITLAB_HOST) || "https://gitlab.com");
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showGitlabToken, setShowGitlabToken] = useState(false);

  // Preferences
  const [autoFetch, setAutoFetch] = useState(() => localStorage.getItem(LS_KEY_AUTO_FETCH) !== "false");
  const [reopenLastRepo, setReopenLastRepo] = useState(() => localStorage.getItem(LS_KEY_REOPEN_LAST_REPO) === "true");
  const [confirmDangerous, setConfirmDangerous] = useState(() => localStorage.getItem(LS_KEY_CONFIRM_DANGEROUS) !== "false");
  const [defaultDiffMode, setDefaultDiffMode] = useState<"split" | "unified">(
    () => (localStorage.getItem(LS_KEY_DIFF_MODE) as "split" | "unified") || "split",
  );

  useEffect(() => {
    if (!open) {
      setStep(0);
    }
  }, [open]);

  if (!open) return null;

  const persistSettings = () => {
    // AI
    if (aiApiKey) localStorage.setItem(LS_KEY_AI_API_KEY, aiApiKey);
    else localStorage.removeItem(LS_KEY_AI_API_KEY);
    localStorage.setItem(LS_KEY_AI_API_URL, aiApiUrl);
    localStorage.setItem(LS_KEY_AI_MODEL, aiModel);
    localStorage.setItem(LS_KEY_AI_REVIEW_MODEL, aiReviewModel);
    localStorage.setItem(LS_KEY_AI_CUSTOM_RULES, customRules);
    localStorage.setItem(LS_KEY_AI_REVIEW_LANGUAGE, reviewLanguage);
    localStorage.setItem(LS_KEY_AI_REVIEW_CHECKLIST, JSON.stringify(reviewChecklist));
    // Git host
    if (githubToken) localStorage.setItem(LS_KEY_GITHUB_TOKEN, githubToken);
    else localStorage.removeItem(LS_KEY_GITHUB_TOKEN);
    if (gitlabToken) localStorage.setItem(LS_KEY_GITLAB_TOKEN, gitlabToken);
    else localStorage.removeItem(LS_KEY_GITLAB_TOKEN);
    localStorage.setItem(LS_KEY_GITLAB_HOST, gitlabHost);
    // Preferences
    localStorage.setItem(LS_KEY_AUTO_FETCH, String(autoFetch));
    localStorage.setItem(LS_KEY_REOPEN_LAST_REPO, String(reopenLastRepo));
    localStorage.setItem(LS_KEY_CONFIRM_DANGEROUS, String(confirmDangerous));
    localStorage.setItem(LS_KEY_DIFF_MODE, defaultDiffMode);
    window.dispatchEvent(new Event("gitflow-settings-updated"));
    // Mark complete
    localStorage.setItem(ONBOARDING_KEY, "true");
  };

  const handleFinish = () => {
    persistSettings();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onClose();
  };

  const steps = [
    { label: "Welcome", icon: <Rocket size={14} /> },
    { label: "Appearance", icon: <Palette size={14} /> },
    { label: "AI Assistant", icon: <Sparkles size={14} /> },
    { label: "AI Preferences", icon: <Sparkles size={14} /> },
    { label: "Git Hosts", icon: <Globe size={14} /> },
    { label: "Preferences", icon: <Check size={14} /> },
  ];

  const totalSteps = steps.length;
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-0 rounded-xl shadow-2xl border border-border w-[min(680px,94vw)] max-h-[min(740px,92vh)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles size={14} className="text-accent" />
            </div>
            <div>
              <span className="text-sm font-bold text-text-primary">Setup GitFlow Desktop</span>
              <div className="text-2xs text-text-muted mt-0.5">Step {step + 1} of {totalSteps} — {steps[step].label}</div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Skip onboarding"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step indicator — modern connected stepper */}
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center">
            {steps.map((s, i) => {
              const isActive = i === step;
              const isCompleted = i < step;
              const isFuture = i > step;
              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  {/* Step node */}
                  <button
                    onClick={() => setStep(i)}
                    className={`relative flex items-center cursor-pointer group transition-all ${
                      isActive ? "z-10" : ""
                    }`}
                    title={s.label}
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-accent text-accent-fg shadow-sm shadow-accent/20"
                        : isActive
                          ? "bg-accent text-accent-fg ring-4 ring-accent/15 shadow-sm shadow-accent/20"
                          : "bg-surface-2 border border-border text-text-muted group-hover:border-text-muted/40"
                    }`}>
                      {isCompleted ? <Check size={13} strokeWidth={3} /> : s.icon}
                    </div>
                  </button>
                  {/* Connector line */}
                  {i < totalSteps - 1 && (
                    <div className="flex-1 mx-2.5 h-[2px] rounded-full overflow-hidden bg-surface-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          isCompleted ? "bg-accent w-full" : isActive ? "bg-accent/40 w-1/2" : "w-0"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-6 mt-4" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && <WelcomeStep />}
          {step === 1 && (
            <ThemeStep theme={theme} setTheme={setTheme} />
          )}
          {step === 2 && (
            <AIStep
              aiApiKey={aiApiKey}
              setAiApiKey={setAiApiKey}
              aiApiUrl={aiApiUrl}
              setAiApiUrl={setAiApiUrl}
              aiModel={aiModel}
              setAiModel={setAiModel}
              aiReviewModel={aiReviewModel}
              setAiReviewModel={setAiReviewModel}
              showApiKey={showApiKey}
              setShowApiKey={setShowApiKey}
            />
          )}
          {step === 3 && (
            <AIPreferencesStep
              customRules={customRules}
              setCustomRules={setCustomRules}
              reviewLanguage={reviewLanguage}
              setReviewLanguage={setReviewLanguage}
              reviewChecklist={reviewChecklist}
              setReviewChecklist={setReviewChecklist}
            />
          )}
          {step === 4 && (
            <GitHostStep
              githubToken={githubToken}
              setGithubToken={setGithubToken}
              gitlabToken={gitlabToken}
              setGitlabToken={setGitlabToken}
              gitlabHost={gitlabHost}
              setGitlabHost={setGitlabHost}
              showGithubToken={showGithubToken}
              setShowGithubToken={setShowGithubToken}
              showGitlabToken={showGitlabToken}
              setShowGitlabToken={setShowGitlabToken}
            />
          )}
          {step === 5 && (
            <PreferencesStep
              autoFetch={autoFetch}
              setAutoFetch={setAutoFetch}
              reopenLastRepo={reopenLastRepo}
              setReopenLastRepo={setReopenLastRepo}
              confirmDangerous={confirmDangerous}
              setConfirmDangerous={setConfirmDangerous}
              defaultDiffMode={defaultDiffMode}
              setDefaultDiffMode={setDefaultDiffMode}
              aiConfigured={!!aiApiKey}
              githubConfigured={!!githubToken}
              gitlabConfigured={!!gitlabToken}
            />
          )}
        </div>

        {/* Footer */}
        <div className="h-px bg-border mx-6" />
        <div className="flex items-center justify-between px-6 py-3.5">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer rounded-lg hover:bg-surface-2"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                onClick={handleSkip}
                className="px-3.5 py-2 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors cursor-pointer rounded-lg hover:bg-surface-2"
              >
                Skip All
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-sm shadow-accent/15"
            >
              {isLast ? "Get Started" : "Continue"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step Components ── */

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center py-6 space-y-5">
      <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 shadow-sm shadow-accent/10">
        <img src="/logo.png" alt="GitFlow" className="w-12 h-12" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-text-primary">Welcome to GitFlow Desktop</h2>
        <p className="text-xs text-text-secondary max-w-[400px] leading-relaxed">
          A modern, high-performance Git client with AI-powered commit messages,
          interactive commit graph, and full GitFlow workflow support.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-[440px] pt-1">
        <FeatureCard icon={<Sparkles size={15} />} title="AI Commits" desc="Generate commit messages from staged changes" />
        <FeatureCard icon={<Palette size={15} />} title="Themes" desc="Dark, light, and Gruvbox color schemes" />
        <FeatureCard icon={<Globe size={15} />} title="GitFlow" desc="Feature, release & hotfix branch workflows" />
        <FeatureCard icon={<Rocket size={15} />} title="Fast" desc="Canvas-rendered graph with infinite scroll" />
      </div>
    </div>
  );
}

function ThemeStep({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const groups = [
    {
      label: "Standard",
      themes: [
        { id: "dark" as Theme, name: "Dark", colors: ["#1c1c1e", "#2c2c2e", "#0a84ff"] },
        { id: "light" as Theme, name: "Light", colors: ["#ffffff", "#f5f5f7", "#007aff"] },
      ],
    },
    {
      label: "Gruvbox Dark",
      themes: [
        { id: "gruvbox-dark" as Theme, name: "Medium", colors: ["#282828", "#3c3836", "#d79921"] },
        { id: "gruvbox-dark-soft" as Theme, name: "Soft", colors: ["#32302f", "#3c3836", "#d79921"] },
        { id: "gruvbox-dark-hard" as Theme, name: "Hard", colors: ["#1d2021", "#282828", "#d79921"] },
      ],
    },
    {
      label: "Gruvbox Light",
      themes: [
        { id: "gruvbox-light" as Theme, name: "Medium", colors: ["#fbf1c7", "#ebdbb2", "#b57614"] },
        { id: "gruvbox-light-soft" as Theme, name: "Soft", colors: ["#f2e5bc", "#ebdbb2", "#b57614"] },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-text-primary">Choose Your Appearance</h2>
        <p className="text-2xs text-text-muted">You can change this later in Settings (⌘,)</p>
      </div>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              {group.label}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {group.themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                    theme === t.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-text-muted/30 bg-surface-1"
                  }`}
                >
                  {/* Theme preview swatch */}
                  <div className="w-full h-8 rounded-md overflow-hidden flex" style={{ border: `1px solid ${t.colors[1]}` }}>
                    <div className="w-1/3" style={{ backgroundColor: t.colors[0] }} />
                    <div className="w-1/3" style={{ backgroundColor: t.colors[1] }} />
                    <div className="w-1/3" style={{ backgroundColor: t.colors[2] }} />
                  </div>
                  <span className="text-2xs font-medium text-text-secondary">{t.name}</span>
                  {theme === t.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <Check size={10} className="text-accent-fg" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AIStepProps {
  aiApiKey: string;
  setAiApiKey: (v: string) => void;
  aiApiUrl: string;
  setAiApiUrl: (v: string) => void;
  aiModel: string;
  setAiModel: (v: string) => void;
  aiReviewModel: string;
  setAiReviewModel: (v: string) => void;
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;
}

function AIStep({
  aiApiKey, setAiApiKey,
  aiApiUrl, setAiApiUrl,
  aiModel, setAiModel,
  aiReviewModel, setAiReviewModel,
  showApiKey, setShowApiKey,
}: AIStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-text-primary">AI Assistant Setup</h2>
        <p className="text-2xs text-text-muted">
          Enable AI-powered commit messages, code review, and conflict resolution.
          <br />This step is optional — you can skip and configure later.
        </p>
      </div>
      <div className="space-y-3 max-w-[400px] mx-auto">
        <div>
          <label className="text-2xs font-medium text-text-secondary block mb-1">API Base URL</label>
          <input
            type="text"
            value={aiApiUrl}
            onChange={(e) => setAiApiUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full h-7 px-2.5 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none"
          />
        </div>
        <div>
          <label className="text-2xs font-medium text-text-secondary block mb-1">API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full h-7 px-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-2xs font-medium text-text-secondary block mb-1">
            Model — Commit Messages
          </label>
          <input
            type="text"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder="claude-sonnet-4-20250514"
            className="w-full h-7 px-2.5 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none"
          />
        </div>
        <div>
          <label className="text-2xs font-medium text-text-secondary block mb-1">
            Model — Code Review & Explain
          </label>
          <input
            type="text"
            value={aiReviewModel}
            onChange={(e) => setAiReviewModel(e.target.value)}
            placeholder="claude-sonnet-4-20250514"
            className="w-full h-7 px-2.5 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

interface AIPreferencesStepProps {
  customRules: string;
  setCustomRules: (v: string) => void;
  reviewLanguage: string;
  setReviewLanguage: (v: string) => void;
  reviewChecklist: Exclude<AIReviewMode, "all" | "custom">[];
  setReviewChecklist: (v: Exclude<AIReviewMode, "all" | "custom">[]) => void;
}

function AIPreferencesStep({
  customRules,
  setCustomRules,
  reviewLanguage,
  setReviewLanguage,
  reviewChecklist,
  setReviewChecklist,
}: AIPreferencesStepProps) {
  const toggleChecklistItem = (id: Exclude<AIReviewMode, "all" | "custom">) => {
    if (reviewChecklist.includes(id)) {
      const next = reviewChecklist.filter((item) => item !== id);
      if (next.length > 0) setReviewChecklist(next);
      return;
    }
    setReviewChecklist([...reviewChecklist, id]);
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-text-primary">AI Review Preferences</h2>
        <p className="text-2xs text-text-muted">
          Tune how AI reviews code. These settings power the Custom checklist review mode.
        </p>
      </div>

      <div className="space-y-3 max-w-[440px] mx-auto">
        <div>
          <label className="text-2xs font-medium text-text-secondary block mb-1">Review Language</label>
          <select
            value={reviewLanguage}
            onChange={(e) => setReviewLanguage(e.target.value)}
            className="w-full h-7 px-2.5 text-xs bg-surface-1 border border-border rounded-md text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none"
          >
            <option value="auto">Auto detect</option>
            <option value="english">English</option>
            <option value="vietnamese">Vietnamese</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-2xs font-medium text-text-secondary">Custom Review Checklist</label>
            <button
              type="button"
              onClick={() => setReviewChecklist(DEFAULT_AI_REVIEW_CHECKLIST)}
              className="text-3xs font-medium text-text-muted hover:text-accent transition-colors"
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
                  onClick={() => toggleChecklistItem(option.id)}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-all ${
                    checked
                      ? "border-accent/35 bg-accent/10 text-text-primary"
                      : "border-border bg-surface-1 text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${
                    checked ? "border-accent bg-accent text-accent-fg" : "border-border"
                  }`}>
                    {checked && <Check size={9} strokeWidth={3.5} />}
                  </span>
                  <span className="text-2xs font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-2xs font-medium text-text-secondary block mb-1">Custom Prompt Rules</label>
          <textarea
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            placeholder="e.g. Review in Vietnamese, prefer Conventional Commits, focus on security and frontend UX."
            rows={4}
            className="w-full px-2.5 py-2 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}

interface GitHostStepProps {
  githubToken: string;
  setGithubToken: (v: string) => void;
  gitlabToken: string;
  setGitlabToken: (v: string) => void;
  gitlabHost: string;
  setGitlabHost: (v: string) => void;
  showGithubToken: boolean;
  setShowGithubToken: (v: boolean) => void;
  showGitlabToken: boolean;
  setShowGitlabToken: (v: boolean) => void;
}

function GitHostStep({
  githubToken, setGithubToken,
  gitlabToken, setGitlabToken,
  gitlabHost, setGitlabHost,
  showGithubToken, setShowGithubToken,
  showGitlabToken, setShowGitlabToken,
}: GitHostStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-text-primary">Git Host Integration</h2>
        <p className="text-2xs text-text-muted">
          Connect to GitHub or GitLab for pull/merge request features.
          <br />This step is optional — you can skip and configure later.
        </p>
      </div>
      <div className="space-y-4 max-w-[400px] mx-auto">
        {/* GitHub */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Github size={14} className="text-text-secondary" />
            <span className="text-xs font-semibold text-text-primary">GitHub</span>
          </div>
          <div className="relative">
            <input
              type={showGithubToken ? "text" : "password"}
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_... Personal access token"
              className="w-full h-7 px-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowGithubToken(!showGithubToken)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              {showGithubToken ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
        {/* GitLab */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gitlab size={14} className="text-text-secondary" />
            <span className="text-xs font-semibold text-text-primary">GitLab</span>
          </div>
          <input
            type="text"
            value={gitlabHost}
            onChange={(e) => setGitlabHost(e.target.value)}
            placeholder="https://gitlab.com"
            className="w-full h-7 px-2.5 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none"
          />
          <div className="relative">
            <input
              type={showGitlabToken ? "text" : "password"}
              value={gitlabToken}
              onChange={(e) => setGitlabToken(e.target.value)}
              placeholder="glpat-... Personal access token"
              className="w-full h-7 px-2.5 pr-8 text-xs bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowGitlabToken(!showGitlabToken)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              {showGitlabToken ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PreferencesStepProps {
  autoFetch: boolean;
  setAutoFetch: (v: boolean) => void;
  reopenLastRepo: boolean;
  setReopenLastRepo: (v: boolean) => void;
  confirmDangerous: boolean;
  setConfirmDangerous: (v: boolean) => void;
  defaultDiffMode: "split" | "unified";
  setDefaultDiffMode: (v: "split" | "unified") => void;
  aiConfigured: boolean;
  githubConfigured: boolean;
  gitlabConfigured: boolean;
}

function PreferencesStep({
  autoFetch, setAutoFetch,
  reopenLastRepo, setReopenLastRepo,
  confirmDangerous, setConfirmDangerous,
  defaultDiffMode, setDefaultDiffMode,
  aiConfigured, githubConfigured, gitlabConfigured,
}: PreferencesStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-text-primary">Quick Preferences</h2>
        <p className="text-2xs text-text-muted">Fine-tune your experience. All settings are adjustable later.</p>
      </div>
      <div className="space-y-2 max-w-[400px] mx-auto">
        <div className="rounded-lg bg-surface-1 border border-border overflow-hidden">
          <Switch
            label="Auto-fetch in background"
            description="Periodically fetch remote changes when a repo is open"
            checked={autoFetch}
            onChange={setAutoFetch}
          />
        </div>
        <div className="rounded-lg bg-surface-1 border border-border overflow-hidden">
          <Switch
            label="Reopen last repository"
            description="Automatically open the last viewed repo on launch"
            checked={reopenLastRepo}
            onChange={setReopenLastRepo}
          />
        </div>
        <div className="rounded-lg bg-surface-1 border border-border overflow-hidden">
          <Switch
            label="Confirm destructive actions"
            description="Ask before discard, reset, delete branch, or drop stash actions"
            checked={confirmDangerous}
            onChange={setConfirmDangerous}
          />
        </div>
        <div className="rounded-lg bg-surface-1 border border-border px-3 py-2">
          <label className="text-xs font-semibold text-text-primary block mb-1">Default diff view</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(["split", "unified"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDefaultDiffMode(mode)}
                className={`h-7 rounded-md text-2xs font-semibold capitalize transition-all ${
                  defaultDiffMode === mode
                    ? "bg-accent text-accent-fg"
                    : "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Summary */}
      <div className="max-w-[400px] mx-auto pt-2">
        <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">Setup Summary</div>
        <div className="space-y-1">
          <SummaryRow label="AI Assistant" configured={aiConfigured} />
          <SummaryRow label="GitHub" configured={githubConfigured} />
          <SummaryRow label="GitLab" configured={gitlabConfigured} />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-1 border border-border hover:border-accent/20 hover:bg-accent/5 transition-all text-center group">
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/15 transition-colors">{icon}</div>
      <span className="text-2xs font-bold text-text-primary">{title}</span>
      <span className="text-[10px] text-text-muted leading-relaxed">{desc}</span>
    </div>
  );
}

function SummaryRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-md bg-surface-1 text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className={configured ? "text-green-500 font-medium" : "text-text-muted"}>
        {configured ? "Configured" : "Not set"}
      </span>
    </div>
  );
}
