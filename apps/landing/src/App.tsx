import {
  GitBranch,
  Sparkles,
  FileDiff,
  Merge,
  Globe,
  Download,
  Github,
  ArrowRight,
  Monitor,
  Layers,
  Eye,
  Zap,
  ChevronRight,
  ExternalLink,
  Apple,
} from "lucide-react";

const GITHUB_URL = "https://github.com/thienle99-dev/gitflow-plus";
const RELEASES_URL = "https://github.com/thienle99-dev/gitflow-plus/releases";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Nav />
      <Hero />
      <ProductPreview />
      <Features />
      <HowItWorks />
      <DownloadSection />
      <Footer />
    </div>
  );
}

/* ── Navigation ── */

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <GitBranch size={14} className="text-white" />
          </div>
          <span>GitFlow Desktop</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors hidden sm:inline">Features</a>
          <a href="#how-it-works" className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors hidden sm:inline">How It Works</a>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full hover:opacity-90 transition-opacity"
          >
            <Download size={12} />
            Download
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 via-violet-500/5 to-transparent dark:from-blue-500/8 dark:via-violet-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/20">
          <Sparkles size={12} />
          AI-powered Git workflow
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
          AI-powered Git client
          <br />
          <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
            with a beautiful desktop workflow
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-base md:text-lg text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
          Interactive commit graph, AI-generated commit messages, code review,
          split diff viewer, and full GitFlow branch management — all in one polished desktop app.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
          >
            <Apple size={16} />
            Download for macOS
            <ArrowRight size={14} />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Github size={16} />
            View on GitHub
          </a>
        </div>

        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          macOS Apple Silicon · Free & open source
        </p>
      </div>
    </section>
  );
}

/* ── Product Preview ── */

function ProductPreview() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 -mt-4 mb-16 md:mb-24">
      <div className="gradient-border">
        <div className="bg-neutral-950 rounded-xl overflow-hidden shadow-2xl shadow-neutral-900/20 dark:shadow-black/40">
          <AppMockup />
        </div>
      </div>
    </section>
  );
}

function AppMockup() {
  return (
    <div className="flex flex-col" style={{ aspectRatio: "16/9" }}>
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-neutral-500 font-medium">GitFlow Desktop</span>
        <span className="ml-auto text-[10px] text-neutral-600 font-mono">main — my-project</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-48 border-r border-neutral-800 bg-neutral-900/50 p-3 hidden md:block">
          <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Branches</div>
          <div className="space-y-0.5">
            {["main", "feature/ai-commits", "feature/dark-theme", "hotfix/login-bug"].map((b, i) => (
              <div key={b} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono ${i === 0 ? "bg-blue-500/10 text-blue-400" : "text-neutral-400"}`}>
                <GitBranch size={9} className={i === 0 ? "text-blue-400" : "text-neutral-600"} />
                {b}
              </div>
            ))}
          </div>
          <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mt-4 mb-2">Tags</div>
          <div className="text-[10px] text-neutral-500 font-mono px-2">v1.0.0</div>
        </div>

        {/* Commit graph */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-3 py-1.5 border-b border-neutral-800 bg-neutral-900/30">
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Layers size={10} />
              <span>200 commits</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>0 ahead</span>
              <span className="w-2 h-2 rounded-full bg-blue-500 ml-2" />
              <span>0 behind</span>
            </div>
          </div>

          {/* Graph rows */}
          <div className="flex-1 overflow-hidden">
            {[
              { hash: "a3f2e1d", msg: "feat: add AI commit message generation", branch: "main", color: "bg-blue-500", time: "2 min ago" },
              { hash: "b7c4a92", msg: "feat: implement canvas commit graph", branch: "", color: "bg-blue-500", time: "1 hour ago" },
              { hash: "e1d8f3a", msg: "feat: add split/unified diff viewer", branch: "", color: "bg-blue-500", time: "3 hours ago" },
              { hash: "c9b2e7f", msg: "Merge branch 'feature/ai-commits'", branch: "", color: "bg-violet-500", time: "yesterday" },
              { hash: "f4a1d8e", msg: "feat: AI code review and explain changes", branch: "feature/ai-commits", color: "bg-green-500", time: "yesterday" },
              { hash: "d2e5f8a", msg: "refactor: improve merge conflict resolver", branch: "", color: "bg-blue-500", time: "2 days ago" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-1.5 border-b border-neutral-800/40 hover:bg-neutral-800/20 group">
                <div className="flex items-center gap-2 w-5 shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                </div>
                <span className="text-[10px] font-mono text-neutral-500 w-14 shrink-0">{row.hash}</span>
                <span className="text-[10px] text-neutral-300 truncate flex-1">{row.msg}</span>
                {row.branch && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-mono shrink-0">{row.branch}</span>
                )}
                <span className="text-[9px] text-neutral-600 shrink-0 hidden sm:inline">{row.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — AI review */}
        <div className="w-64 border-l border-neutral-800 bg-neutral-900/30 p-3 hidden lg:block">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={10} className="text-violet-400" />
            <span className="text-[10px] font-semibold text-neutral-300">AI Code Review</span>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] text-neutral-300 leading-relaxed">
              <span className="font-semibold text-white">Summary:</span> Implements AI-powered commit message generation using the staged diff and branch context.
            </div>
            <div className="text-[10px] text-green-400 leading-relaxed">
              ✓ Clean separation of concerns between prompt building and API calls
            </div>
            <div className="text-[10px] text-yellow-400 leading-relaxed">
              ⚠ Consider adding retry logic for transient API failures
            </div>
            <div className="text-[10px] text-neutral-400 leading-relaxed">
              The fallback local commit message generator is well-structured and handles edge cases gracefully.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Features ── */

const features = [
  {
    icon: <GitBranch size={18} />,
    title: "Beautiful Commit Graph",
    description: "High-performance canvas-rendered graph with branch lanes, ref badges, and merge line rendering. Scroll through thousands of commits without lag.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: <FileDiff size={18} />,
    title: "Interactive Staging & Diff",
    description: "Split and unified diff views with hunk and line-level stage/unstage actions. Multi-select batch operations for efficient workflows.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: <Sparkles size={18} />,
    title: "AI Commit Messages",
    description: "Generate commit messages from staged changes using AI. Supports conventional commits, gitmoji, and Jira-style formats.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: <Eye size={18} />,
    title: "AI Code Review & Explain",
    description: "Get instant code review with risk analysis, improvement suggestions, and plain-language explanations of any commit or diff.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: <Merge size={18} />,
    title: "Merge & Conflict Support",
    description: "Preview merges before applying, resolve conflicts with a visual editor, and understand exactly what changed and why.",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: <Globe size={18} />,
    title: "GitHub & GitLab PR/MR",
    description: "Review pull and merge requests, checkout branches, and manage your workflow without leaving the app.",
    color: "from-sky-500 to-blue-500",
  },
];

function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Everything you need, nothing you don't
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto text-sm">
          A focused set of features designed for developers who care about clean commits and efficient workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-3 shadow-sm`}>
              {f.icon}
            </div>
            <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── How It Works ── */

const steps = [
  {
    step: "01",
    icon: <Monitor size={18} />,
    title: "Open or Clone a Repository",
    description: "Point GitFlow at any local Git repo, or clone directly from a URL. Recent repos are one click away.",
  },
  {
    step: "02",
    icon: <GitBranch size={18} />,
    title: "Review Graph & Changes",
    description: "See the full branch history on a canvas graph. Inspect your working tree changes and staged files side by side.",
  },
  {
    step: "03",
    icon: <Sparkles size={18} />,
    title: "Stage & Generate Commits",
    description: "Stage files with a click, then let AI generate a precise commit message from your diff. Edit and commit.",
  },
  {
    step: "04",
    icon: <Zap size={18} />,
    title: "Merge, Push & Ship",
    description: "Preview merges, resolve conflicts visually, push to remote, and manage PRs — all without leaving the app.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-50 dark:bg-neutral-900/30 border-y border-neutral-200/60 dark:border-neutral-800/60">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            From repo to release in four steps
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto text-sm">
            A streamlined workflow that keeps you in the flow state.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.step} className="relative">
              <div className="text-[10px] font-bold text-neutral-300 dark:text-neutral-600 mb-3 tracking-widest">
                STEP {s.step}
              </div>
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 mb-3">
                {s.icon}
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{s.title}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Download ── */

function DownloadSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Ready to upgrade your Git workflow?
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-8">
          Download GitFlow Desktop for macOS. Free and open source.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full hover:opacity-90 transition-opacity shadow-lg"
          >
            <Apple size={16} />
            Download for macOS
            <ArrowRight size={14} />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <ExternalLink size={14} />
            View Source
          </a>
        </div>

        {/* Install note */}
        <div className="inline-flex items-start gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left max-w-md">
          <Download size={16} className="text-neutral-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold mb-1">macOS Installation</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Download the <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-[10px] font-mono">.dmg</code> file,
              open it, and drag GitFlow Desktop to Applications.
              On first launch, right-click and select "Open" to bypass Gatekeeper.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */

function Footer() {
  return (
    <footer className="border-t border-neutral-200/60 dark:border-neutral-800/60">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <GitBranch size={10} className="text-white" />
            </div>
            <span className="text-xs font-semibold">GitFlow Desktop</span>
            <span className="text-xs text-neutral-400">v1.0.0</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1">
              <Github size={12} />
              GitHub
            </a>
            <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1">
              <Download size={12} />
              Releases
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1">
              <ChevronRight size={12} />
              Documentation
            </a>
          </div>
          <div className="text-xs text-neutral-400">
            Built with Tauri + React
          </div>
        </div>
      </div>
    </footer>
  );
}
