/* SVG Illustration Components for Feature Guide */

const colors = {
  primary: "var(--color-accent, #6366f1)",
  secondary: "var(--color-text-secondary, #94a3b8)",
  muted: "var(--color-text-muted, #64748b)",
  surface: "var(--color-surface-1, #f1f5f9)",
  border: "var(--color-border, #e2e8f0)",
  green: "#22c55e",
  orange: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "#3b82f6",
};

const cls = "w-full h-auto rounded border border-border-30 bg-surface-0";

/* ─── Category-level illustrations ─── */

export function CommitGraphIllustration() {
  return (
    <svg viewBox="0 0 280 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <line x1="60" y1="20" x2="60" y2="120" stroke={colors.blue} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="50" x2="120" y2="70" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <line x1="120" y1="70" x2="120" y2="90" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <line x1="120" y1="90" x2="60" y2="110" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="20" r="6" fill={colors.blue} />
      <circle cx="60" cy="50" r="6" fill={colors.blue} />
      <circle cx="60" cy="80" r="6" fill={colors.blue} />
      <circle cx="60" cy="110" r="7" fill={colors.blue} stroke="#fff" strokeWidth="2" />
      <circle cx="120" cy="70" r="5" fill={colors.purple} />
      <circle cx="120" cy="90" r="5" fill={colors.purple} />
      <text x="75" y="24" fontSize="9" fill={colors.muted} fontFamily="monospace">a3f2c1d</text>
      <text x="75" y="54" fontSize="9" fill={colors.muted} fontFamily="monospace">b7e4a9f</text>
      <text x="75" y="84" fontSize="9" fill={colors.muted} fontFamily="monospace">c1d8e2f</text>
      <rect x="132" y="63" width="56" height="16" rx="8" fill={colors.purple} opacity="0.15" />
      <text x="140" y="74" fontSize="8" fill={colors.purple} fontWeight="600">feature/x</text>
      <rect x="16" y="103" width="34" height="16" rx="8" fill={colors.blue} opacity="0.15" />
      <text x="22" y="114" fontSize="8" fill={colors.blue} fontWeight="600">main</text>
      <text x="75" y="114" fontSize="8" fill={colors.muted} fontFamily="monospace">merge commit</text>
    </svg>
  );
}

export function WorkingTreeIllustration() {
  return (
    <svg viewBox="0 0 280 150" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="18" fontSize="9" fill={colors.muted} fontWeight="600" style={{ textTransform: "uppercase" }}>Changes</text>
      <rect x="10" y="24" width="120" height="18" rx="4" fill={colors.orange} opacity="0.08" stroke={colors.orange} strokeWidth="0.5" strokeOpacity="0.3" />
      <rect x="10" y="46" width="120" height="18" rx="4" fill={colors.green} opacity="0.08" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <rect x="10" y="68" width="120" height="18" rx="4" fill={colors.red} opacity="0.08" stroke={colors.red} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="20" y="36" fontSize="8" fill={colors.orange} fontWeight="600">M</text>
      <text x="30" y="36" fontSize="8" fill={colors.secondary}>utils.ts</text>
      <text x="20" y="58" fontSize="8" fill={colors.green} fontWeight="600">A</text>
      <text x="30" y="58" fontSize="8" fill={colors.secondary}>api.ts</text>
      <text x="20" y="80" fontSize="8" fill={colors.red} fontWeight="600">D</text>
      <text x="30" y="80" fontSize="8" fill={colors.secondary}>old.ts</text>
      <path d="M140 50 L148 50" stroke={colors.muted} strokeWidth="1.5" markerEnd="url(#arrowRight)" />
      <defs>
        <marker id="arrowRight" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="none" stroke={colors.muted} strokeWidth="1" />
        </marker>
      </defs>
      <text x="158" y="18" fontSize="9" fill={colors.green} fontWeight="600" style={{ textTransform: "uppercase" }}>Staged</text>
      <rect x="156" y="24" width="114" height="18" rx="4" fill={colors.green} opacity="0.08" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="166" y="36" fontSize="8" fill={colors.green} fontWeight="600">M</text>
      <text x="176" y="36" fontSize="8" fill={colors.secondary}>App.tsx</text>
      <rect x="10" y="100" width="260" height="40" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="20" y="118" fontSize="8" fill={colors.muted}>feat: add new api endpoints</text>
      <rect x="210" y="106" width="50" height="20" rx="4" fill={colors.primary} opacity="0.85" />
      <text x="222" y="120" fontSize="8" fill="#fff" fontWeight="600">Commit</text>
      <text x="200" y="118" fontSize="11">✨</text>
    </svg>
  );
}

export function GitFlowIllustration() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <line x1="40" y1="20" x2="40" y2="145" stroke={colors.blue} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="30" x2="100" y2="135" stroke={colors.green} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="55" x2="160" y2="70" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <line x1="160" y1="70" x2="160" y2="90" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <line x1="160" y1="90" x2="100" y2="100" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <line x1="100" y1="110" x2="200" y2="120" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" />
      <line x1="200" y1="120" x2="200" y2="130" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" />
      <line x1="200" y1="130" x2="100" y2="135" stroke={colors.orange} strokeWidth="2" strokeDasharray="3 2" strokeLinecap="round" />
      <line x1="200" y1="130" x2="40" y2="145" stroke={colors.orange} strokeWidth="2" strokeDasharray="3 2" strokeLinecap="round" />
      <circle cx="40" cy="20" r="5" fill={colors.blue} />
      <circle cx="40" cy="145" r="6" fill={colors.blue} stroke="#fff" strokeWidth="2" />
      <circle cx="100" cy="30" r="5" fill={colors.green} />
      <circle cx="100" cy="55" r="4" fill={colors.green} />
      <circle cx="100" cy="100" r="4" fill={colors.green} />
      <circle cx="100" cy="110" r="4" fill={colors.green} />
      <circle cx="100" cy="135" r="5" fill={colors.green} />
      <circle cx="160" cy="70" r="4" fill={colors.purple} />
      <circle cx="160" cy="90" r="4" fill={colors.purple} />
      <circle cx="200" cy="120" r="4" fill={colors.orange} />
      <circle cx="200" cy="130" r="4" fill={colors.orange} />
      <rect x="10" y="148" width="30" height="12" rx="6" fill={colors.blue} opacity="0.15" />
      <text x="16" y="157" fontSize="7" fill={colors.blue} fontWeight="600">main</text>
      <rect x="56" y="138" width="46" height="12" rx="6" fill={colors.green} opacity="0.15" />
      <text x="62" y="147" fontSize="7" fill={colors.green} fontWeight="600">develop</text>
      <rect x="138" y="63" width="48" height="12" rx="6" fill={colors.purple} opacity="0.15" />
      <text x="143" y="72" fontSize="7" fill={colors.purple} fontWeight="600">feature/x</text>
      <rect x="206" y="118" width="50" height="12" rx="6" fill={colors.orange} opacity="0.15" />
      <text x="211" y="127" fontSize="7" fill={colors.orange} fontWeight="600">release/1.0</text>
      <circle cx="40" cy="145" r="8" fill="none" stroke={colors.blue} strokeWidth="1" strokeDasharray="2 1" />
      <text x="52" y="148" fontSize="7" fill={colors.muted}>v1.0.0</text>
    </svg>
  );
}

export function AIFeaturesIllustration() {
  return (
    <svg viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <rect x="10" y="10" width="160" height="70" rx="6" fill="#1e293b" />
      <text x="20" y="28" fontSize="8" fill="#94a3b8" fontFamily="monospace">const user = await</text>
      <text x="20" y="40" fontSize="8" fill="#94a3b8" fontFamily="monospace">  api.getUser(id);</text>
      <text x="20" y="56" fontSize="8" fill="#ef4444" fontFamily="monospace">- console.log(data);</text>
      <text x="20" y="68" fontSize="8" fill="#22c55e" fontFamily="monospace">+ logger.info(data);</text>
      <path d="M175 45 C195 45, 195 45, 210 45" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="4 2" />
      <circle cx="192" cy="45" r="10" fill={colors.primary} opacity="0.1" />
      <text x="186" y="49" fontSize="12" fill={colors.primary}>✨</text>
      <rect x="210" y="10" width="62" height="70" rx="6" fill={colors.primary} opacity="0.06" stroke={colors.primary} strokeWidth="0.8" strokeOpacity="0.3" />
      <text x="218" y="26" fontSize="7" fill={colors.primary} fontWeight="600">AI Review</text>
      <text x="218" y="40" fontSize="7" fill={colors.secondary}>• Use typed</text>
      <text x="218" y="50" fontSize="7" fill={colors.secondary}>  logger</text>
      <text x="218" y="62" fontSize="7" fill={colors.secondary}>• Add error</text>
      <text x="218" y="72" fontSize="7" fill={colors.secondary}>  handling</text>
      <rect x="10" y="90" width="262" height="30" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="20" y="108" fontSize="8" fill={colors.muted}>Generated:</text>
      <text x="80" y="108" fontSize="8" fill={colors.secondary} fontWeight="600" fontFamily="monospace">refactor(logging): replace console.log with structured logger</text>
    </svg>
  );
}

export function GitOperationsIllustration() {
  return (
    <svg viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <line x1="40" y1="15" x2="40" y2="55" stroke={colors.blue} strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="15" r="4" fill={colors.blue} />
      <circle cx="40" cy="35" r="4" fill={colors.blue} />
      <circle cx="40" cy="55" r="4" fill={colors.blue} />
      <text x="50" y="18" fontSize="7" fill={colors.blue} fontWeight="600">main</text>
      <line x1="110" y1="25" x2="110" y2="65" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <circle cx="110" cy="25" r="4" fill={colors.purple} />
      <circle cx="110" cy="45" r="4" fill={colors.purple} />
      <circle cx="110" cy="65" r="4" fill={colors.purple} />
      <text x="120" y="28" fontSize="7" fill={colors.purple} fontWeight="600">feature</text>
      <path d="M110 25 Q75 15, 40 35" stroke={colors.orange} strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
      <text x="58" y="18" fontSize="7" fill={colors.orange} fontWeight="600">merge</text>
      <path d="M110 45 Q155 35, 200 45" stroke={colors.red} strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
      <text x="148" y="38" fontSize="7" fill={colors.red} fontWeight="600">cherry-pick</text>
      <line x1="200" y1="25" x2="200" y2="65" stroke={colors.green} strokeWidth="2" strokeLinecap="round" />
      <circle cx="200" cy="25" r="4" fill={colors.green} />
      <circle cx="200" cy="45" r="5" fill={colors.red} opacity="0.3" stroke={colors.red} strokeWidth="1.5" />
      <circle cx="200" cy="65" r="4" fill={colors.green} />
      <text x="210" y="28" fontSize="7" fill={colors.green} fontWeight="600">hotfix</text>
      <text x="10" y="90" fontSize="8" fill={colors.muted} fontWeight="600">Interactive Rebase</text>
      <rect x="10" y="96" width="260" height="26" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="20" y="112" fontSize="8" fill={colors.secondary} fontFamily="monospace">pick a1b2c3 feat: add auth</text>
      <text x="20" y="120" fontSize="8" fill={colors.orange} fontFamily="monospace">squash d4e5f6 fix: typo</text>
    </svg>
  );
}

export function DiffViewerIllustration() {
  return (
    <svg viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <rect x="10" y="8" width="125" height="14" rx="3" fill={colors.red} opacity="0.08" />
      <text x="45" y="18" fontSize="7" fill={colors.red} fontWeight="600">Original</text>
      <rect x="145" y="8" width="125" height="14" rx="3" fill={colors.green} opacity="0.08" />
      <text x="180" y="18" fontSize="7" fill={colors.green} fontWeight="600">Modified</text>
      <line x1="140" y1="8" x2="140" y2="125" stroke={colors.border} strokeWidth="0.5" strokeDasharray="2 2" />
      <rect x="10" y="28" width="125" height="14" rx="0" fill={colors.red} opacity="0.05" />
      <text x="16" y="38" fontSize="7" fill={colors.red} fontFamily="monospace">function greet(name) {'{'}</text>
      <text x="16" y="52" fontSize="7" fill={colors.secondary} fontFamily="monospace">  return `Hello ${'{'}name{'}'}`;</text>
      <rect x="10" y="56" width="125" height="14" rx="0" fill={colors.red} opacity="0.1" />
      <text x="16" y="66" fontSize="7" fill={colors.red} fontFamily="monospace" textDecoration="line-through">  console.log(name);</text>
      <text x="16" y="80" fontSize="7" fill={colors.secondary} fontFamily="monospace">{'}'}</text>
      <rect x="145" y="28" width="125" height="14" rx="0" fill={colors.green} opacity="0.05" />
      <text x="151" y="38" fontSize="7" fill={colors.green} fontFamily="monospace">function greet(name) {'{'}</text>
      <text x="151" y="52" fontSize="7" fill={colors.secondary} fontFamily="monospace">  return `Hello ${'{'}name{'}'}`;</text>
      <rect x="145" y="56" width="125" height="14" rx="0" fill={colors.green} opacity="0.1" />
      <text x="151" y="66" fontSize="7" fill={colors.green} fontFamily="monospace">  logger.info(name);</text>
      <text x="151" y="80" fontSize="7" fill={colors.secondary} fontFamily="monospace">{'}'}</text>
      <rect x="10" y="90" width="260" height="30" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="20" y="108" fontSize="7" fill={colors.muted}>Hunk 1:</text>
      <rect x="60" y="98" width="36" height="16" rx="3" fill={colors.green} opacity="0.15" />
      <text x="67" y="109" fontSize="7" fill={colors.green} fontWeight="600">Stage</text>
      <rect x="102" y="98" width="46" height="16" rx="3" fill={colors.red} opacity="0.15" />
      <text x="109" y="109" fontSize="7" fill={colors.red} fontWeight="600">Discard</text>
      <rect x="154" y="98" width="50" height="16" rx="3" fill={colors.muted} opacity="0.15" />
      <text x="161" y="109" fontSize="7" fill={colors.muted} fontWeight="600">Unstage</text>
    </svg>
  );
}

export function RemoteSyncIllustration() {
  return (
    <svg viewBox="0 0 280 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <rect x="20" y="20" width="90" height="60" rx="8" fill={colors.surface} stroke={colors.border} strokeWidth="1" />
      <text x="42" y="42" fontSize="9" fill={colors.secondary} fontWeight="600">Local</text>
      <circle cx="45" cy="55" r="3" fill={colors.blue} />
      <circle cx="55" cy="55" r="3" fill={colors.blue} />
      <circle cx="65" cy="55" r="3" fill={colors.blue} />
      <circle cx="75" cy="55" r="3" fill={colors.blue} />
      <circle cx="85" cy="55" r="3" fill={colors.green} />
      <text x="35" y="72" fontSize="7" fill={colors.green}>↑2 ahead</text>
      <rect x="170" y="20" width="90" height="60" rx="8" fill={colors.surface} stroke={colors.border} strokeWidth="1" />
      <text x="193" y="42" fontSize="9" fill={colors.secondary} fontWeight="600">Remote</text>
      <circle cx="195" cy="55" r="3" fill={colors.blue} />
      <circle cx="205" cy="55" r="3" fill={colors.blue} />
      <circle cx="215" cy="55" r="3" fill={colors.blue} />
      <circle cx="225" cy="55" r="3" fill={colors.blue} />
      <circle cx="235" cy="55" r="3" fill={colors.orange} />
      <circle cx="245" cy="55" r="3" fill={colors.orange} />
      <text x="185" y="72" fontSize="7" fill={colors.orange}>↓2 behind</text>
      <path d="M115 42 L165 42" stroke={colors.green} strokeWidth="1.5" />
      <polygon points="162,38 170,42 162,46" fill={colors.green} />
      <text x="128" y="38" fontSize="7" fill={colors.green} fontWeight="600">Push</text>
      <path d="M165 62 L115 62" stroke={colors.orange} strokeWidth="1.5" />
      <polygon points="118,58 110,62 118,66" fill={colors.orange} />
      <text x="130" y="74" fontSize="7" fill={colors.orange} fontWeight="600">Pull</text>
      <text x="110" y="98" fontSize="7" fill={colors.muted}>⏱ Auto-fetch: every 5 min</text>
    </svg>
  );
}

export function ProductivityIllustration() {
  return (
    <svg viewBox="0 0 280 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <rect x="10" y="8" width="130" height="94" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="20" y="24" fontSize="8" fill={colors.muted} fontWeight="600">Shortcuts</text>
      {[
        { keys: "⌘S", action: "Stage" },
        { keys: "⌘⇧S", action: "Unstage" },
        { keys: "⌘⏎", action: "Commit" },
        { keys: "⌘F", action: "Search" },
        { keys: "⌘B", action: "Branches" },
        { keys: "⌘Z", action: "Undo" },
      ].map((item, i) => (
        <g key={i}>
          <rect x="18" y={30 + i * 11} width="36" height="10" rx="2" fill={colors.primary} opacity="0.1" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.3" />
          <text x="22" y={38 + i * 11} fontSize="7" fill={colors.primary} fontFamily="monospace" fontWeight="600">{item.keys}</text>
          <text x="60" y={38 + i * 11} fontSize="7" fill={colors.secondary}>{item.action}</text>
        </g>
      ))}
      <rect x="150" y="8" width="120" height="46" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="160" y="24" fontSize="8" fill={colors.muted} fontWeight="600">Search</text>
      <rect x="158" y="30" width="104" height="16" rx="4" fill="#fff" stroke={colors.border} strokeWidth="0.5" />
      <text x="164" y="41" fontSize="7" fill={colors.muted}>fix: authentication...</text>
      <text x="245" y="41" fontSize="7" fill={colors.muted}>🔍</text>
      <rect x="150" y="60" width="120" height="42" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="160" y="76" fontSize="8" fill={colors.muted} fontWeight="600">Themes</text>
      <rect x="158" y="82" width="20" height="14" rx="3" fill="#f8fafc" stroke={colors.border} strokeWidth="0.5" />
      <rect x="182" y="82" width="20" height="14" rx="3" fill="#1e293b" stroke={colors.border} strokeWidth="0.5" />
      <rect x="206" y="82" width="20" height="14" rx="3" fill="#282828" stroke={colors.border} strokeWidth="0.5" />
      <rect x="230" y="82" width="20" height="14" rx="3" fill="#fbf1c7" stroke={colors.border} strokeWidth="0.5" />
    </svg>
  );
}

/* ─── Individual Feature Illustrations ─── */

// ═══════════════════════════════════════════
// Commit Graph Features
// ═══════════════════════════════════════════

export function CanvasCommitGraphFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Canvas frame */}
      <rect x="10" y="6" width="240" height="68" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="16" y="16" fontSize="6" fill={colors.muted}>canvas</text>
      {/* Branch lines */}
      <line x1="40" y1="22" x2="40" y2="66" stroke={colors.blue} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="35" x2="90" y2="45" stroke={colors.purple} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="90" y1="45" x2="90" y2="55" stroke={colors.purple} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="90" y1="55" x2="40" y2="62" stroke={colors.purple} strokeWidth="1.5" strokeLinecap="round" />
      {/* Nodes */}
      <circle cx="40" cy="22" r="3.5" fill={colors.blue} />
      <circle cx="40" cy="35" r="3.5" fill={colors.blue} />
      <circle cx="40" cy="50" r="3.5" fill={colors.blue} />
      <circle cx="40" cy="62" r="4" fill={colors.blue} stroke="#fff" strokeWidth="1.5" />
      <circle cx="90" cy="45" r="3" fill={colors.purple} />
      <circle cx="90" cy="55" r="3" fill={colors.purple} />
      {/* Commit messages */}
      <text x="50" y="25" fontSize="7" fill={colors.secondary} fontFamily="monospace">init project</text>
      <text x="50" y="38" fontSize="7" fill={colors.secondary} fontFamily="monospace">add auth module</text>
      <text x="50" y="53" fontSize="7" fill={colors.secondary} fontFamily="monospace">fix tests</text>
      {/* Performance label */}
      <rect x="150" y="22" width="88" height="44" rx="4" fill={colors.primary} opacity="0.06" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="160" y="34" fontSize="7" fill={colors.primary} fontWeight="600">HTML Canvas</text>
      <text x="160" y="44" fontSize="6" fill={colors.secondary}>GPU-accelerated</text>
      <text x="160" y="54" fontSize="6" fill={colors.secondary}>1000s of commits</text>
      <text x="160" y="62" fontSize="6" fill={colors.green}>60fps rendering</text>
    </svg>
  );
}

export function BranchTagBadgesFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Single commit row */}
      <rect x="10" y="10" width="240" height="50" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <circle cx="28" cy="35" r="5" fill={colors.blue} />
      <text x="40" y="32" fontSize="7" fill={colors.secondary} fontFamily="monospace">a3f2c1d</text>
      <text x="40" y="44" fontSize="8" fill={colors.secondary}>feat: add user authentication</text>
      {/* Ref badges */}
      <rect x="185" y="18" width="28" height="12" rx="6" fill={colors.blue} opacity="0.15" />
      <text x="189" y="27" fontSize="6" fill={colors.blue} fontWeight="600">main</text>
      <rect x="216" y="18" width="28" height="12" rx="6" fill={colors.orange} opacity="0.15" />
      <text x="220" y="27" fontSize="6" fill={colors.orange} fontWeight="600">origin</text>
      <rect x="185" y="34" width="12" height="12" rx="6" fill={colors.red} opacity="0.15" />
      <text x="188" y="43" fontSize="6" fill={colors.red} fontWeight="600">H</text>
      <rect x="200" y="34" width="28" height="12" rx="6" fill={colors.green} opacity="0.15" />
      <text x="204" y="43" fontSize="6" fill={colors.green} fontWeight="600">v1.2</text>
    </svg>
  );
}

export function ContextMenuFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Commit with right-click indicator */}
      <circle cx="30" cy="30" r="4" fill={colors.blue} />
      <text x="42" y="33" fontSize="7" fill={colors.secondary} fontFamily="monospace">a3f2c1d</text>
      {/* Right-click arrow */}
      <text x="60" y="52" fontSize="7" fill={colors.muted}>→ right-click</text>
      {/* Context menu */}
      <rect x="120" y="10" width="120" height="82" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="130" y="24" fontSize="7" fill={colors.secondary}>📋 Copy Hash</text>
      <line x1="126" y1="28" x2="234" y2="28" stroke={colors.border} strokeWidth="0.5" />
      <text x="130" y="38" fontSize="7" fill={colors.secondary}>🔀 Checkout</text>
      <text x="130" y="48" fontSize="7" fill={colors.secondary}>🌿 Create Branch</text>
      <text x="130" y="58" fontSize="7" fill={colors.secondary}>🏷️ Create Tag</text>
      <line x1="126" y1="62" x2="234" y2="62" stroke={colors.border} strokeWidth="0.5" />
      <text x="130" y="72" fontSize="7" fill={colors.primary} fontWeight="600">🍒 Cherry-Pick</text>
      <text x="130" y="82" fontSize="7" fill={colors.red}>↩️ Revert</text>
    </svg>
  );
}

export function IncrementalLoadingFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Commit list */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="30" cy={12 + i * 13} r="3" fill={colors.blue} />
          <text x="40" y={15 + i * 13} fontSize="7" fill={colors.secondary} fontFamily="monospace">{["a3f2c1d", "b7e4a9f", "c1d8e2f", "d5a1b3c"][i]}</text>
          <text x="95" y={15 + i * 13} fontSize="7" fill={colors.secondary}>{["init project", "add auth", "fix tests", "update deps"][i]}</text>
        </g>
      ))}
      {/* Loading indicator */}
      <rect x="20" y="62" width="220" height="12" rx="3" fill={colors.primary} opacity="0.06" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.2" />
      <text x="90" y="71" fontSize="7" fill={colors.primary}>Loading more commits...</text>
      {/* Cache badge */}
      <rect x="180" y="8" width="64" height="14" rx="4" fill={colors.green} opacity="0.1" />
      <text x="186" y="17" fontSize="6" fill={colors.green} fontWeight="600">⚡ cached</text>
    </svg>
  );
}

// ═══════════════════════════════════════════
// Working Tree & Commits Features
// ═══════════════════════════════════════════

export function StageUnstageFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 75" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Changes */}
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">CHANGES</text>
      <rect x="10" y="16" width="105" height="14" rx="3" fill={colors.orange} opacity="0.08" stroke={colors.orange} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="15" y="26" fontSize="7" fill={colors.orange} fontWeight="600">☐</text>
      <text x="24" y="26" fontSize="7" fill={colors.secondary}>utils.ts  M</text>
      <rect x="10" y="33" width="105" height="14" rx="3" fill={colors.green} opacity="0.08" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="15" y="43" fontSize="7" fill={colors.green} fontWeight="600">☑</text>
      <text x="24" y="43" fontSize="7" fill={colors.secondary}>api.ts  A</text>
      {/* Arrow */}
      <text x="120" y="30" fontSize="8" fill={colors.muted}>→</text>
      {/* Staged */}
      <text x="140" y="12" fontSize="6" fill={colors.green} fontWeight="600">STAGED</text>
      <rect x="138" y="16" width="112" height="14" rx="3" fill={colors.green} opacity="0.08" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="143" y="26" fontSize="7" fill={colors.secondary}>☑ api.ts  A</text>
      {/* Keyboard shortcut */}
      <rect x="50" y="55" width="160" height="14" rx="4" fill={colors.primary} opacity="0.06" />
      <text x="70" y="64" fontSize="7" fill={colors.primary}>⌘S Stage · ⌘⇧S Unstage</text>
    </svg>
  );
}

export function MultiSelectBatchFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* File list with selection */}
      {["utils.ts", "api.ts", "auth.ts", "types.ts", "index.ts"].map((f, i) => {
        const selected = i >= 1 && i <= 3;
        const y = 8 + i * 12;
        return (
          <g key={i}>
            <rect x="10" y={y} width="150" height="10" rx="2" fill={selected ? colors.primary : colors.surface} opacity={selected ? 0.12 : 0.5} />
            <text x="15" y={y + 8} fontSize="7" fill={selected ? colors.primary : colors.secondary} fontWeight={selected ? 600 : 400}>{f}</text>
          </g>
        );
      })}
      {/* Shift indicator */}
      <rect x="170" y="20" width="80" height="30" rx="4" fill={colors.primary} opacity="0.06" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="178" y="32" fontSize="7" fill={colors.primary} fontWeight="600">⇧ Shift+Click</text>
      <text x="178" y="42" fontSize="6" fill={colors.secondary}>range select</text>
      {/* Batch action */}
      <rect x="170" y="54" width="80" height="12" rx="3" fill={colors.green} opacity="0.15" />
      <text x="178" y="63" fontSize="6" fill={colors.green} fontWeight="600">Stage Selected</text>
    </svg>
  );
}

export function CommitReadinessFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Three states */}
      <rect x="10" y="10" width="75" height="40" rx="6" fill={colors.green} opacity="0.06" stroke={colors.green} strokeWidth="0.8" strokeOpacity="0.3" />
      <circle cx="28" cy="30" r="8" fill={colors.green} opacity="0.2" />
      <circle cx="28" cy="30" r="4" fill={colors.green} />
      <text x="42" y="28" fontSize="7" fill={colors.green} fontWeight="600">Ready</text>
      <text x="42" y="38" fontSize="6" fill={colors.secondary}>staged ✓</text>

      <rect x="92" y="10" width="75" height="40" rx="6" fill={colors.orange} opacity="0.06" stroke={colors.orange} strokeWidth="0.8" strokeOpacity="0.3" />
      <circle cx="110" cy="30" r="8" fill={colors.orange} opacity="0.2" />
      <circle cx="110" cy="30" r="4" fill={colors.orange} />
      <text x="124" y="28" fontSize="7" fill={colors.orange} fontWeight="600">Pending</text>
      <text x="124" y="38" fontSize="6" fill={colors.secondary}>unstaged</text>

      <rect x="174" y="10" width="75" height="40" rx="6" fill={colors.muted} opacity="0.06" stroke={colors.muted} strokeWidth="0.8" strokeOpacity="0.3" />
      <circle cx="192" cy="30" r="8" fill={colors.muted} opacity="0.15" />
      <text x="206" y="28" fontSize="7" fill={colors.muted} fontWeight="600">Clean</text>
      <text x="206" y="38" fontSize="6" fill={colors.secondary}>no changes</text>
    </svg>
  );
}

export function AICommitMessagesFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Staged diff */}
      <rect x="10" y="8" width="100" height="54" rx="4" fill="#1e293b" />
      <text x="16" y="18" fontSize="6" fill={colors.muted}>staged diff</text>
      <text x="16" y="28" fontSize="7" fill="#ef4444" fontFamily="monospace">- old code</text>
      <text x="16" y="38" fontSize="7" fill="#22c55e" fontFamily="monospace">+ new code</text>
      <text x="16" y="48" fontSize="7" fill="#22c55e" fontFamily="monospace">+ more fixes</text>
      {/* Sparkle button */}
      <rect x="116" y="22" width="28" height="28" rx="6" fill={colors.primary} opacity="0.1" stroke={colors.primary} strokeWidth="0.8" />
      <text x="122" y="40" fontSize="14">✨</text>
      {/* Generated message */}
      <rect x="150" y="8" width="100" height="54" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="156" y="18" fontSize="6" fill={colors.primary} fontWeight="600">AI Generated</text>
      <text x="156" y="30" fontSize="7" fill={colors.secondary}>feat(auth): add</text>
      <text x="156" y="40" fontSize="7" fill={colors.secondary}>user login flow</text>
      <text x="156" y="50" fontSize="7" fill={colors.secondary}>with validation</text>
    </svg>
  );
}

export function AICommitScopeSuggestionFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 75" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="7" fill={colors.primary} fontWeight="600">💡 AI suggests splitting commits:</text>
      {/* Group 1 */}
      <rect x="10" y="18" width="115" height="24" rx="4" fill={colors.blue} opacity="0.06" stroke={colors.blue} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="16" y="28" fontSize="6" fill={colors.blue} fontWeight="600">Group 1</text>
      <text x="16" y="36" fontSize="6" fill={colors.secondary}>auth.ts, login.ts</text>
      <rect x="85" y="24" width="34" height="10" rx="3" fill={colors.primary} opacity="0.15" />
      <text x="89" y="31" fontSize="5" fill={colors.primary} fontWeight="600">Use this</text>
      {/* Group 2 */}
      <rect x="132" y="18" width="118" height="24" rx="4" fill={colors.green} opacity="0.06" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="138" y="28" fontSize="6" fill={colors.green} fontWeight="600">Group 2</text>
      <text x="138" y="36" fontSize="6" fill={colors.secondary}>styles.css, theme.ts</text>
      <rect x="210" y="24" width="34" height="10" rx="3" fill={colors.primary} opacity="0.15" />
      <text x="214" y="31" fontSize="5" fill={colors.primary} fontWeight="600">Use this</text>
      {/* Commit all button */}
      <rect x="60" y="48" width="140" height="16" rx="4" fill={colors.muted} opacity="0.1" />
      <text x="82" y="58" fontSize="7" fill={colors.muted}>Commit all as one</text>
    </svg>
  );
}

export function AmendLastCommitFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Commit history */}
      <circle cx="30" cy="15" r="3" fill={colors.blue} />
      <line x1="30" y1="18" x2="30" y2="30" stroke={colors.blue} strokeWidth="1.5" />
      <circle cx="30" cy="30" r="4" fill={colors.orange} stroke={colors.orange} strokeWidth="1" strokeDasharray="2 1" />
      <text x="42" y="18" fontSize="7" fill={colors.secondary} fontFamily="monospace">a3f2c1d</text>
      <text x="42" y="33" fontSize="7" fill={colors.orange} fontWeight="600">HEAD (amending)</text>
      {/* Amend arrow */}
      <path d="M55 38 C80 38, 100 48, 120 48" stroke={colors.orange} strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
      <text x="75" y="55" fontSize="6" fill={colors.orange}>↺ amend</text>
      {/* New commit result */}
      <rect x="130" y="24" width="120" height="30" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="138" y="36" fontSize="7" fill={colors.secondary}>Updated commit message</text>
      <text x="138" y="46" fontSize="6" fill={colors.muted}>with additional changes</text>
    </svg>
  );
}

// ═══════════════════════════════════════════
// GitFlow Workflow Features
// ═══════════════════════════════════════════

export function FeatureStartFinishFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* develop branch */}
      <line x1="40" y1="15" x2="40" y2="65" stroke={colors.green} strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="15" r="3" fill={colors.green} />
      <text x="48" y="18" fontSize="7" fill={colors.green} fontWeight="600">develop</text>
      {/* Feature branch */}
      <line x1="40" y1="25" x2="120" y2="35" stroke={colors.purple} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="35" x2="120" y2="50" stroke={colors.purple} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="50" x2="40" y2="58" stroke={colors.purple} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="120" cy="35" r="3" fill={colors.purple} />
      <circle cx="120" cy="50" r="3" fill={colors.purple} />
      <circle cx="40" cy="58" r="3" fill={colors.green} />
      <circle cx="40" cy="65" r="4" fill={colors.green} stroke="#fff" strokeWidth="1.5" />
      <text x="128" y="42" fontSize="7" fill={colors.purple} fontWeight="600">feature/auth</text>
      {/* Labels */}
      <text x="68" y="28" fontSize="6" fill={colors.muted}>start →</text>
      <text x="55" y="62" fontSize="6" fill={colors.muted}>← finish</text>
      {/* Tag */}
      <text x="160" y="30" fontSize="8" fill={colors.muted}>GitFlow</text>
      <rect x="160" y="36" width="90" height="14" rx="3" fill={colors.purple} opacity="0.08" />
      <text x="166" y="45" fontSize="6" fill={colors.purple}>feature/ prefix</text>
    </svg>
  );
}

export function ReleaseStartFinishFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* main */}
      <line x1="30" y1="15" x2="30" y2="65" stroke={colors.blue} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="15" r="3" fill={colors.blue} />
      <text x="38" y="18" fontSize="6" fill={colors.blue} fontWeight="600">main</text>
      {/* develop */}
      <line x1="80" y1="15" x2="80" y2="60" stroke={colors.green} strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="15" r="3" fill={colors.green} />
      <text x="88" y="18" fontSize="6" fill={colors.green} fontWeight="600">develop</text>
      {/* Release branch */}
      <line x1="80" y1="35" x2="170" y2="42" stroke={colors.orange} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="170" y1="42" x2="170" y2="50" stroke={colors.orange} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="170" y1="50" x2="80" y2="55" stroke={colors.orange} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
      <line x1="170" y1="50" x2="30" y2="60" stroke={colors.orange} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
      <circle cx="170" cy="42" r="3" fill={colors.orange} />
      <circle cx="170" cy="50" r="3" fill={colors.orange} />
      <text x="178" y="46" fontSize="6" fill={colors.orange} fontWeight="600">release/1.0</text>
      {/* Tag */}
      <circle cx="30" cy="65" r="5" fill="none" stroke={colors.blue} strokeWidth="1" strokeDasharray="2 1" />
      <text x="38" y="68" fontSize="6" fill={colors.muted}>v1.0.0 🏷️</text>
    </svg>
  );
}

export function HotfixStartFinishFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* main */}
      <line x1="30" y1="10" x2="30" y2="60" stroke={colors.blue} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="10" r="3" fill={colors.blue} />
      <text x="38" y="13" fontSize="6" fill={colors.blue} fontWeight="600">main (production)</text>
      {/* develop */}
      <line x1="200" y1="10" x2="200" y2="55" stroke={colors.green} strokeWidth="2" strokeLinecap="round" />
      <circle cx="200" cy="10" r="3" fill={colors.green} />
      <text x="175" y="8" fontSize="6" fill={colors.green} fontWeight="600">develop</text>
      {/* Hotfix branch */}
      <line x1="30" y1="25" x2="110" y2="32" stroke={colors.red} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="110" y1="32" x2="110" y2="42" stroke={colors.red} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="110" y1="42" x2="30" y2="50" stroke={colors.red} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
      <line x1="110" y1="42" x2="200" y2="50" stroke={colors.red} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
      <circle cx="110" cy="32" r="3" fill={colors.red} />
      <circle cx="110" cy="42" r="3" fill={colors.red} />
      <text x="118" y="36" fontSize="6" fill={colors.red} fontWeight="600">hotfix/1.0.1</text>
      {/* Tag */}
      <circle cx="30" cy="60" r="5" fill="none" stroke={colors.blue} strokeWidth="1" strokeDasharray="2 1" />
      <text x="38" y="63" fontSize="6" fill={colors.muted}>v1.0.1 🏷️</text>
      {/* Urgent badge */}
      <rect x="130" y="50" width="50" height="12" rx="3" fill={colors.red} opacity="0.12" />
      <text x="136" y="59" fontSize="6" fill={colors.red} fontWeight="600">🔥 urgent</text>
    </svg>
  );
}

export function GitFlowInitWizardFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Config form */}
      <rect x="10" y="6" width="240" height="68" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="18" y="18" fontSize="7" fill={colors.muted} fontWeight="600">GitFlow Configuration</text>
      {/* Config rows */}
      {[
        { label: "Production", value: "main", color: colors.blue },
        { label: "Development", value: "develop", color: colors.green },
        { label: "Feature prefix", value: "feature/", color: colors.purple },
        { label: "Release prefix", value: "release/", color: colors.orange },
        { label: "Hotfix prefix", value: "hotfix/", color: colors.red },
      ].map((item, i) => (
        <g key={i}>
          <text x="18" y={30 + i * 9} fontSize="6" fill={colors.muted}>{item.label}</text>
          <rect x="105" y={22 + i * 9} width="60" height="10" rx="2" fill="#fff" stroke={colors.border} strokeWidth="0.5" />
          <text x="110" y={30 + i * 9} fontSize="6" fill={item.color} fontFamily="monospace" fontWeight="600">{item.value}</text>
        </g>
      ))}
      {/* Init button */}
      <rect x="185" y="58" width="50" height="12" rx="3" fill={colors.primary} opacity="0.85" />
      <text x="196" y="67" fontSize="6" fill="#fff" fontWeight="600">Initialize</text>
    </svg>
  );
}

// ═══════════════════════════════════════════
// AI Features
// ═══════════════════════════════════════════

export function GenerateCommitMessagesFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Staged diff input */}
      <rect x="10" y="8" width="75" height="48" rx="4" fill="#1e293b" />
      <text x="16" y="18" fontSize="6" fill={colors.muted}>staged diff</text>
      <text x="16" y="28" fontSize="7" fill="#ef4444" fontFamily="monospace">- old()</text>
      <text x="16" y="38" fontSize="7" fill="#22c55e" fontFamily="monospace">+ new()</text>
      {/* AI processor */}
      <circle cx="115" cy="32" r="12" fill={colors.primary} opacity="0.1" stroke={colors.primary} strokeWidth="0.8" />
      <text x="110" y="36" fontSize="12">✨</text>
      {/* Arrow */}
      <path d="M90 32 L103 32" stroke={colors.primary} strokeWidth="1" strokeDasharray="3 2" />
      <path d="M128 32 L145 32" stroke={colors.primary} strokeWidth="1" strokeDasharray="3 2" />
      {/* Output */}
      <rect x="148" y="8" width="102" height="48" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="154" y="18" fontSize="6" fill={colors.primary} fontWeight="600">Conventional</text>
      <text x="154" y="28" fontSize="7" fill={colors.secondary}>feat(scope):</text>
      <text x="154" y="38" fontSize="7" fill={colors.secondary}>add new feature</text>
      {/* Style badges */}
      <rect x="154" y="44" width="22" height="8" rx="2" fill={colors.primary} opacity="0.15" />
      <text x="157" y="50" fontSize="5" fill={colors.primary}>conv</text>
      <rect x="178" y="44" width="22" height="8" rx="2" fill={colors.muted} opacity="0.15" />
      <text x="181" y="50" fontSize="5" fill={colors.muted}>sem</text>
    </svg>
  );
}

export function CodeReviewFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Diff header */}
      <rect x="10" y="6" width="240" height="16" rx="3" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="16" y="16" fontSize="7" fill={colors.secondary}>file.ts — diff view</text>
      <rect x="190" y="8" width="50" height="12" rx="3" fill={colors.primary} opacity="0.15" />
      <text x="196" y="17" fontSize="6" fill={colors.primary} fontWeight="600">✨ Review</text>
      {/* Review results */}
      <rect x="10" y="26" width="240" height="38" rx="4" fill={colors.primary} opacity="0.04" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.2" />
      <text x="16" y="36" fontSize="6" fill={colors.red} fontWeight="600">🔴 Bug: null check missing on line 42</text>
      <text x="16" y="44" fontSize="6" fill={colors.orange} fontWeight="600">🟡 Performance: consider memoization</text>
      <text x="16" y="52" fontSize="6" fill={colors.green} fontWeight="600">🟢 Good: proper error handling</text>
      <text x="16" y="60" fontSize="6" fill={colors.blue} fontWeight="600">🔵 Suggestion: extract to utility</text>
    </svg>
  );
}

export function ExplainCommitsFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Commit info */}
      <rect x="10" y="8" width="110" height="44" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <circle cx="22" cy="20" r="3" fill={colors.blue} />
      <text x="30" y="23" fontSize="7" fill={colors.secondary} fontFamily="monospace">a3f2c1d</text>
      <text x="16" y="36" fontSize="7" fill={colors.secondary}>feat: add OAuth2</text>
      <text x="16" y="46" fontSize="6" fill={colors.muted}>+124 -38 lines</text>
      {/* Arrow with Explain button */}
      <rect x="125" y="22" width="12" height="16" rx="2" fill={colors.primary} opacity="0.1" />
      <text x="127" y="32" fontSize="8">→</text>
      {/* Plain English output */}
      <rect x="142" y="8" width="108" height="44" rx="4" fill={colors.primary} opacity="0.04" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.2" />
      <text x="148" y="18" fontSize="6" fill={colors.primary} fontWeight="600">🤖 Explanation</text>
      <text x="148" y="28" fontSize="6" fill={colors.secondary}>This commit adds</text>
      <text x="148" y="36" fontSize="6" fill={colors.secondary}>OAuth2 login with</text>
      <text x="148" y="44" fontSize="6" fill={colors.secondary}>Google & GitHub.</text>
    </svg>
  );
}

export function AIConflictResolutionFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 75" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Conflict markers */}
      <rect x="10" y="6" width="120" height="62" rx="4" fill="#1e293b" />
      <text x="16" y="16" fontSize="6" fill={colors.red} fontFamily="monospace">{"<<<<<<< HEAD"}</text>
      <text x="16" y="26" fontSize="7" fill={colors.blue} fontFamily="monospace">const a = 1;</text>
      <text x="16" y="36" fontSize="6" fill={colors.muted} fontFamily="monospace">=======</text>
      <text x="16" y="46" fontSize="7" fill={colors.green} fontFamily="monospace">const a = 2;</text>
      <text x="16" y="56" fontSize="6" fill={colors.red} fontFamily="monospace">{'>>>>>>>'} feature</text>
      {/* AI resolve button */}
      <circle cx="155" cy="36" r="12" fill={colors.primary} opacity="0.1" stroke={colors.primary} strokeWidth="0.8" />
      <text x="150" y="40" fontSize="12">✨</text>
      {/* Resolved output */}
      <rect x="175" y="6" width="75" height="62" rx="4" fill={colors.green} opacity="0.04" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="181" y="16" fontSize="6" fill={colors.green} fontWeight="600">✓ Resolved</text>
      <text x="181" y="28" fontSize="7" fill={colors.secondary} fontFamily="monospace">const a = 1;</text>
      <text x="181" y="38" fontSize="7" fill={colors.secondary} fontFamily="monospace">// merged:</text>
      <text x="181" y="48" fontSize="7" fill={colors.secondary} fontFamily="monospace">// both sides</text>
      <text x="181" y="58" fontSize="7" fill={colors.secondary} fontFamily="monospace">// considered</text>
    </svg>
  );
}

export function CommitScopeAnalysisFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 75" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="7" fill={colors.primary} fontWeight="600">✨ Scope Analysis — 2 concerns detected</text>
      {/* Group cards */}
      <rect x="10" y="18" width="115" height="46" rx="4" fill={colors.blue} opacity="0.05" stroke={colors.blue} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="16" y="28" fontSize="6" fill={colors.blue} fontWeight="600">auth/ concern</text>
      <text x="16" y="38" fontSize="6" fill={colors.secondary}>auth.ts, login.ts, session.ts</text>
      <text x="16" y="48" fontSize="6" fill={colors.muted}>feat(auth): add login flow</text>
      <rect x="16" y="52" width="30" height="8" rx="2" fill={colors.primary} opacity="0.15" />
      <text x="19" y="58" fontSize="5" fill={colors.primary} fontWeight="600">Use</text>
      <rect x="132" y="18" width="118" height="46" rx="4" fill={colors.green} opacity="0.05" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="138" y="28" fontSize="6" fill={colors.green} fontWeight="600">ui/ concern</text>
      <text x="138" y="38" fontSize="6" fill={colors.secondary}>Button.tsx, Modal.tsx, Form.tsx</text>
      <text x="138" y="48" fontSize="6" fill={colors.muted}>feat(ui): add form components</text>
      <rect x="138" y="52" width="30" height="8" rx="2" fill={colors.primary} opacity="0.15" />
      <text x="141" y="58" fontSize="5" fill={colors.primary} fontWeight="600">Use</text>
    </svg>
  );
}

// ═══════════════════════════════════════════
// Git Operations Features
// ═══════════════════════════════════════════

export function BranchManagementFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 75" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Sidebar branch list */}
      <rect x="10" y="6" width="120" height="62" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="16" y="16" fontSize="6" fill={colors.muted} fontWeight="600">BRANCHES</text>
      {[
        { name: "main", color: colors.blue, active: true },
        { name: "develop", color: colors.green, active: false },
        { name: "feature/auth", color: colors.purple, active: false },
        { name: "origin/main", color: colors.orange, active: false },
      ].map((b, i) => (
        <g key={i}>
          <circle cx="20" cy={26 + i * 11} r="2.5" fill={b.color} />
          <text x="28" y={29 + i * 11} fontSize="7" fill={b.active ? colors.primary : colors.secondary} fontWeight={b.active ? 600 : 400}>{b.name}</text>
          {b.active && <text x="85" y={29 + i * 11} fontSize="6" fill={colors.primary}>← HEAD</text>}
        </g>
      ))}
      {/* Actions */}
      <rect x="140" y="10" width="110" height="52" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="148" y="22" fontSize="6" fill={colors.muted} fontWeight="600">Actions</text>
      <text x="148" y="32" fontSize="6" fill={colors.secondary}>🔀 Checkout</text>
      <text x="148" y="42" fontSize="6" fill={colors.secondary}>➕ Create Branch</text>
      <text x="148" y="52" fontSize="6" fill={colors.red}>🗑️ Delete</text>
    </svg>
  );
}

export function MergeConflictDetectionFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Branches */}
      <line x1="40" y1="10" x2="40" y2="50" stroke={colors.blue} strokeWidth="2" strokeLinecap="round" />
      <line x1="120" y1="10" x2="120" y2="40" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="10" r="3" fill={colors.blue} />
      <circle cx="120" cy="10" r="3" fill={colors.purple} />
      <text x="48" y="13" fontSize="6" fill={colors.blue} fontWeight="600">main</text>
      <text x="128" y="13" fontSize="6" fill={colors.purple} fontWeight="600">feature</text>
      {/* Merge arrow */}
      <path d="M120 18 Q80 25, 40 40" stroke={colors.orange} strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
      {/* Conflict warning */}
      <rect x="150" y="10" width="100" height="44" rx="4" fill={colors.red} opacity="0.06" stroke={colors.red} strokeWidth="0.8" strokeOpacity="0.3" />
      <text x="158" y="22" fontSize="7" fill={colors.red} fontWeight="600">⚠️ Conflicts</text>
      <text x="158" y="32" fontSize="6" fill={colors.secondary}>3 files conflicted</text>
      <text x="158" y="42" fontSize="6" fill={colors.secondary}>→ Resolve each file</text>
      <text x="48" y="42" fontSize="6" fill={colors.muted}>merge</text>
    </svg>
  );
}

export function InteractiveRebaseFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 75" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="7" fill={colors.muted} fontWeight="600">Interactive Rebase Editor</text>
      {/* Commit list with actions */}
      {[
        { action: "pick", hash: "a1b2c3d", msg: "feat: auth", color: colors.green },
        { action: "squash", hash: "d4e5f6g", msg: "fix: typo", color: colors.orange },
        { action: "pick", hash: "h7i8j9k", msg: "feat: api", color: colors.green },
        { action: "drop", hash: "l0m1n2o", msg: "wip: debug", color: colors.red },
      ].map((c, i) => {
        const y = 18 + i * 13;
        return (
          <g key={i}>
            <rect x="10" y={y} width="240" height="11" rx="2" fill={c.color} opacity="0.06" />
            <text x="16" y={y + 8} fontSize="6" fill={c.color} fontWeight="600" fontFamily="monospace">{c.action}</text>
            <text x="58" y={y + 8} fontSize="6" fill={colors.secondary} fontFamily="monospace">{c.hash}</text>
            <text x="98" y={y + 8} fontSize="6" fill={colors.secondary}>{c.msg}</text>
          </g>
        );
      })}
      {/* Drag indicator */}
      <text x="200" y="28" fontSize="6" fill={colors.muted}>↕ drag</text>
      {/* Start button */}
      <rect x="170" y="60" width="70" height="12" rx="3" fill={colors.primary} opacity="0.85" />
      <text x="182" y="69" fontSize="6" fill="#fff" fontWeight="600">Start Rebase</text>
    </svg>
  );
}

export function CherryPickFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Source branch */}
      <line x1="30" y1="10" x2="30" y2="50" stroke={colors.purple} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="10" r="3" fill={colors.purple} />
      <circle cx="30" cy="25" r="3.5" fill={colors.red} opacity="0.3" stroke={colors.red} strokeWidth="1.5" />
      <circle cx="30" cy="40" r="3" fill={colors.purple} />
      <text x="38" y="13" fontSize="6" fill={colors.purple} fontWeight="600">feature</text>
      <text x="38" y="28" fontSize="6" fill={colors.red} fontFamily="monospace">c1d8e2f</text>
      {/* Cherry-pick arrow */}
      <path d="M38 32 C80 20, 130 20, 170 25" stroke={colors.red} strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
      <text x="80" y="20" fontSize="6" fill={colors.red} fontWeight="600">🍒 cherry-pick</text>
      {/* Target branch */}
      <line x1="180" y1="10" x2="180" y2="50" stroke={colors.blue} strokeWidth="2" strokeLinecap="round" />
      <circle cx="180" cy="10" r="3" fill={colors.blue} />
      <circle cx="180" cy="25" r="3.5" fill={colors.red} opacity="0.3" stroke={colors.red} strokeWidth="1.5" />
      <circle cx="180" cy="40" r="3" fill={colors.blue} />
      <circle cx="180" cy="50" r="3" fill={colors.blue} />
      <text x="188" y="13" fontSize="6" fill={colors.blue} fontWeight="600">main</text>
      <text x="188" y="28" fontSize="6" fill={colors.red} fontFamily="monospace">c1d8e2f*</text>
    </svg>
  );
}

export function StashManagementFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">STASH STACK</text>
      {/* Stash entries */}
      {[
        { msg: "WIP: auth feature", time: "2 min ago" },
        { msg: "fix: css layout", time: "1 hour ago" },
        { msg: "experiment: new api", time: "yesterday" },
      ].map((s, i) => {
        const y = 16 + i * 14;
        return (
          <g key={i}>
            <rect x="10" y={y} width="160" height="12" rx="3" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
            <text x="16" y={y + 8} fontSize="6" fill={colors.secondary}>{s.msg}</text>
            <text x="118" y={y + 8} fontSize="5" fill={colors.muted}>{s.time}</text>
          </g>
        );
      })}
      {/* Actions */}
      <rect x="180" y="16" width="70" height="42" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="186" y="26" fontSize="6" fill={colors.green} fontWeight="600">⬆ Pop</text>
      <text x="186" y="36" fontSize="6" fill={colors.blue} fontWeight="600">📋 Apply</text>
      <text x="186" y="46" fontSize="6" fill={colors.red} fontWeight="600">🗑 Drop</text>
      {/* Diff preview label */}
      <text x="60" y="64" fontSize="6" fill={colors.muted}>Click to preview diff →</text>
    </svg>
  );
}

export function TagCRUDFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Commit line */}
      <line x1="30" y1="10" x2="30" y2="50" stroke={colors.blue} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="30" cy="10" r="3" fill={colors.blue} />
      <circle cx="30" cy="30" r="3" fill={colors.blue} />
      <circle cx="30" cy="50" r="3" fill={colors.blue} />
      {/* Lightweight tag */}
      <rect x="44" y="22" width="52" height="14" rx="4" fill={colors.green} opacity="0.12" />
      <text x="50" y="32" fontSize="7" fill={colors.green} fontWeight="600">🏷 v1.0.0</text>
      {/* Annotated tag */}
      <rect x="104" y="42" width="80" height="14" rx="4" fill={colors.purple} opacity="0.12" />
      <text x="110" y="52" fontSize="7" fill={colors.purple} fontWeight="600">🏷 v1.1.0-beta</text>
      <text x="190" y="52" fontSize="6" fill={colors.muted}>annotated</text>
      {/* Create dialog */}
      <rect x="140" y="6" width="110" height="30" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="148" y="16" fontSize="6" fill={colors.muted}>Create Tag</text>
      <rect x="148" y="20" width="60" height="10" rx="2" fill="#fff" stroke={colors.border} strokeWidth="0.5" />
      <text x="152" y="27" fontSize="6" fill={colors.muted}>v1.2.0</text>
      <rect x="212" y="20" width="28" height="10" rx="2" fill={colors.primary} opacity="0.85" />
      <text x="218" y="27" fontSize="5" fill="#fff" fontWeight="600">Create</text>
    </svg>
  );
}

export function BlameViewFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">BLAME — utils.ts</text>
      {/* Blame lines */}
      {[
        { author: "alice", hash: "a3f2c1d", date: "2d ago", line: "export function add(a, b) {", color: colors.blue },
        { author: "bob", hash: "b7e4a9f", date: "5d ago", line: "  return a + b;", color: colors.green },
        { author: "alice", hash: "a3f2c1d", date: "2d ago", line: "  // validate inputs", color: colors.blue },
        { author: "carol", hash: "c1d8e2f", date: "1d ago", line: "  if (a == null) return b;", color: colors.purple },
      ].map((l, i) => {
        const y = 16 + i * 12;
        return (
          <g key={i}>
            <rect x="10" y={y} width="70" height="10" rx="2" fill={l.color} opacity="0.08" />
            <text x="14" y={y + 7} fontSize="5" fill={l.color} fontFamily="monospace">{l.hash}</text>
            <text x="48" y={y + 7} fontSize="5" fill={colors.muted}>{l.author}</text>
            <text x="84" y={y + 7} fontSize="6" fill={colors.secondary} fontFamily="monospace">{l.line}</text>
          </g>
        );
      })}
      {/* Info */}
      <text x="160" y="28" fontSize="6" fill={colors.muted}>per-line</text>
      <text x="160" y="38" fontSize="6" fill={colors.muted}>author & date</text>
    </svg>
  );
}

export function FileHistoryFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">FILE HISTORY — App.tsx</text>
      {/* Timeline */}
      <line x1="20" y1="18" x2="20" y2="50" stroke={colors.border} strokeWidth="1" />
      {/* History entries */}
      {[
        { hash: "a3f2c1d", msg: "feat: add routing", time: "1d ago", color: colors.blue },
        { hash: "b7e4a9f", msg: "fix: layout bug", time: "3d ago", color: colors.green },
        { hash: "c1d8e2f", msg: "refactor: cleanup", time: "1w ago", color: colors.purple },
      ].map((h, i) => {
        const y = 22 + i * 12;
        return (
          <g key={i}>
            <circle cx="20" cy={y} r="3" fill={h.color} />
            <text x="30" y={y - 1} fontSize="6" fill={colors.secondary} fontFamily="monospace">{h.hash}</text>
            <text x="72" y={y - 1} fontSize="6" fill={colors.secondary}>{h.msg}</text>
            <text x="200" y={y - 1} fontSize="5" fill={colors.muted}>{h.time}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function SubmoduleSupportFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Main repo */}
      <rect x="10" y="6" width="240" height="52" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="18" y="18" fontSize="7" fill={colors.secondary} fontWeight="600">📁 my-project</text>
      {/* Submodules */}
      <rect x="20" y="24" width="100" height="26" rx="3" fill={colors.blue} opacity="0.06" stroke={colors.blue} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="26" y="34" fontSize="6" fill={colors.blue} fontWeight="600">📦 shared-lib</text>
      <text x="26" y="42" fontSize="5" fill={colors.muted}>a3f2c1d · main</text>
      <rect x="130" y="24" width="110" height="26" rx="3" fill={colors.green} opacity="0.06" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="136" y="34" fontSize="6" fill={colors.green} fontWeight="600">📦 config-module</text>
      <text x="136" y="42" fontSize="5" fill={colors.muted}>b7e4a9f · develop</text>
    </svg>
  );
}

// ═══════════════════════════════════════════
// Diff Viewer Features
// ═══════════════════════════════════════════

export function SplitUnifiedModesFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Split mode label */}
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">Split Mode</text>
      {/* Left panel */}
      <rect x="10" y="16" width="115" height="48" rx="3" fill="#1e293b" />
      <text x="16" y="26" fontSize="6" fill={colors.red} fontFamily="monospace">{"- function old() {"}</text>
      <text x="16" y="34" fontSize="6" fill={colors.red} fontFamily="monospace">{"-   return 1;"}</text>
      <text x="16" y="42" fontSize="6" fill={colors.red} fontFamily="monospace">{"- }"}</text>
      {/* Right panel */}
      <rect x="135" y="16" width="115" height="48" rx="3" fill="#1e293b" />
      <text x="141" y="26" fontSize="6" fill={colors.green} fontFamily="monospace">{"+ function New() {"}</text>
      <text x="141" y="34" fontSize="6" fill={colors.green} fontFamily="monospace">{"+   return 2;"}</text>
      <text x="141" y="42" fontSize="6" fill={colors.green} fontFamily="monospace">{"+ }"}</text>
      {/* Divider */}
      <line x1="130" y1="16" x2="130" y2="64" stroke={colors.border} strokeWidth="0.5" strokeDasharray="2 2" />
    </svg>
  );
}

export function InlineHunkActionsFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Diff lines */}
      <rect x="10" y="6" width="240" height="30" rx="3" fill="#1e293b" />
      <text x="16" y="16" fontSize="6" fill={colors.secondary} fontFamily="monospace">  unchanged line</text>
      <rect x="10" y="18" width="240" height="8" fill={colors.red} opacity="0.1" />
      <text x="16" y="25" fontSize="6" fill={colors.red} fontFamily="monospace">- old implementation</text>
      <rect x="10" y="26" width="240" height="8" fill={colors.green} opacity="0.1" />
      <text x="16" y="33" fontSize="6" fill={colors.green} fontFamily="monospace">+ new implementation</text>
      {/* Hunk action bar */}
      <rect x="10" y="40" width="240" height="18" rx="3" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="16" y="52" fontSize="6" fill={colors.muted}>Hunk 1</text>
      <rect x="52" y="44" width="36" height="10" rx="2" fill={colors.green} opacity="0.15" />
      <text x="58" y="51" fontSize="5" fill={colors.green} fontWeight="600">✓ Stage</text>
      <rect x="92" y="44" width="42" height="10" rx="2" fill={colors.red} opacity="0.15" />
      <text x="98" y="51" fontSize="5" fill={colors.red} fontWeight="600">✗ Discard</text>
      <rect x="138" y="44" width="46" height="10" rx="2" fill={colors.muted} opacity="0.15" />
      <text x="144" y="51" fontSize="5" fill={colors.muted} fontWeight="600">↩ Unstage</text>
    </svg>
  );
}

export function AICodeReviewFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Diff header with AI button */}
      <rect x="10" y="6" width="240" height="14" rx="3" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="16" y="15" fontSize="6" fill={colors.secondary}>auth.ts — diff</text>
      <rect x="190" y="7" width="52" height="10" rx="2" fill={colors.primary} opacity="0.15" />
      <text x="196" y="14" fontSize="5" fill={colors.primary} fontWeight="600">✨ AI Review</text>
      {/* Review panel */}
      <rect x="10" y="24" width="240" height="34" rx="4" fill={colors.primary} opacity="0.04" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.2" />
      <text x="16" y="34" fontSize="6" fill={colors.primary} fontWeight="600">Review Results</text>
      <text x="16" y="44" fontSize="5" fill={colors.red}>🔴 Missing input validation on L15</text>
      <text x="16" y="52" fontSize="5" fill={colors.orange}>🟡 Consider using try-catch on L22</text>
    </svg>
  );
}

export function ConflictResolverFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">Conflict Resolver</text>
      {/* Three panels */}
      <rect x="10" y="16" width="73" height="32" rx="3" fill={colors.blue} opacity="0.06" stroke={colors.blue} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="18" y="26" fontSize="6" fill={colors.blue} fontWeight="600">Current</text>
      <text x="18" y="36" fontSize="5" fill={colors.secondary} fontFamily="monospace">const a = 1;</text>
      <rect x="88" y="16" width="73" height="32" rx="3" fill={colors.green} opacity="0.06" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="96" y="26" fontSize="6" fill={colors.green} fontWeight="600">Incoming</text>
      <text x="96" y="36" fontSize="5" fill={colors.secondary} fontFamily="monospace">const a = 2;</text>
      <rect x="166" y="16" width="84" height="32" rx="3" fill={colors.purple} opacity="0.06" stroke={colors.purple} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="174" y="26" fontSize="6" fill={colors.purple} fontWeight="600">Result</text>
      <text x="174" y="36" fontSize="5" fill={colors.secondary} fontFamily="monospace">const a = merged;</text>
      {/* Action buttons */}
      {[
        { label: "Accept Current", x: 10, color: colors.blue },
        { label: "Accept Incoming", x: 88, color: colors.green },
        { label: "Accept Both", x: 180, color: colors.purple },
      ].map((btn, i) => (
        <g key={i}>
          <rect x={btn.x} y="52" width={i < 2 ? 73 : 70} height="10" rx="2" fill={btn.color} opacity="0.12" />
          <text x={btn.x + 6} y="59" fontSize="5" fill={btn.color} fontWeight="600">{btn.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════
// Remote & Sync Features
// ═══════════════════════════════════════════

export function PullPushFetchFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Local */}
      <rect x="10" y="10" width="80" height="40" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="32" y="28" fontSize="8" fill={colors.secondary} fontWeight="600">Local</text>
      <circle cx="25" cy="38" r="2.5" fill={colors.blue} />
      <circle cx="33" cy="38" r="2.5" fill={colors.blue} />
      <circle cx="41" cy="38" r="2.5" fill={colors.blue} />
      <circle cx="49" cy="38" r="2.5" fill={colors.green} />
      {/* Remote */}
      <rect x="170" y="10" width="80" height="40" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="189" y="28" fontSize="8" fill={colors.secondary} fontWeight="600">Remote</text>
      <circle cx="185" cy="38" r="2.5" fill={colors.blue} />
      <circle cx="193" cy="38" r="2.5" fill={colors.blue} />
      <circle cx="201" cy="38" r="2.5" fill={colors.blue} />
      <circle cx="209" cy="38" r="2.5" fill={colors.orange} />
      {/* Push */}
      <path d="M95 25 L165 25" stroke={colors.green} strokeWidth="1.5" />
      <polygon points="162,21 170,25 162,29" fill={colors.green} />
      <text x="118" y="22" fontSize="6" fill={colors.green} fontWeight="600">Push</text>
      {/* Pull */}
      <path d="M165 38 L95 38" stroke={colors.orange} strokeWidth="1.5" />
      <polygon points="98,34 90,38 98,42" fill={colors.orange} />
      <text x="118" y="46" fontSize="6" fill={colors.orange} fontWeight="600">Pull / Fetch</text>
    </svg>
  );
}

export function AutoFetchFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 55" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Timer */}
      <circle cx="50" cy="28" r="18" fill={colors.surface} stroke={colors.border} strokeWidth="1" />
      <text x="42" y="24" fontSize="12" fill={colors.primary}>⏱</text>
      <text x="38" y="36" fontSize="6" fill={colors.muted}>5 min</text>
      {/* Arrow to remote */}
      <path d="M72 28 L110 28" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="4 2" />
      <polygon points="107,24 115,28 107,32" fill={colors.primary} />
      {/* Remote */}
      <rect x="118" y="14" width="60" height="28" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="130" y="28" fontSize="7" fill={colors.secondary} fontWeight="600">Remote</text>
      {/* Status badge */}
      <rect x="186" y="18" width="60" height="20" rx="4" fill={colors.green} opacity="0.08" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="194" y="28" fontSize="7" fill={colors.green} fontWeight="600">↓ 3 new</text>
      <text x="194" y="36" fontSize="5" fill={colors.muted}>commits behind</text>
    </svg>
  );
}

export function SyncStatusFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Toolbar badge */}
      <rect x="40" y="8" width="180" height="34" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="50" y="22" fontSize="7" fill={colors.muted}>Toolbar</text>
      {/* Ahead badge */}
      <rect x="100" y="14" width="42" height="20" rx="4" fill={colors.green} opacity="0.1" stroke={colors.green} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="108" y="27" fontSize="8" fill={colors.green} fontWeight="600">↑ 2</text>
      {/* Behind badge */}
      <rect x="148" y="14" width="42" height="20" rx="4" fill={colors.orange} opacity="0.1" stroke={colors.orange} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="156" y="27" fontSize="8" fill={colors.orange} fontWeight="600">↓ 3</text>
      {/* Synced state */}
      <text x="200" y="24" fontSize="7" fill={colors.muted}>or ↑0 ↓0</text>
      <text x="200" y="32" fontSize="6" fill={colors.green}>✓ synced</text>
    </svg>
  );
}

export function CloneRepositoriesFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Clone dialog */}
      <rect x="20" y="6" width="220" height="48" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="30" y="18" fontSize="7" fill={colors.muted} fontWeight="600">Clone Repository</text>
      {/* URL input */}
      <rect x="30" y="22" width="140" height="12" rx="3" fill="#fff" stroke={colors.border} strokeWidth="0.5" />
      <text x="36" y="31" fontSize="6" fill={colors.muted}>https://github.com/user/repo</text>
      {/* Clone button */}
      <rect x="176" y="22" width="50" height="12" rx="3" fill={colors.primary} opacity="0.85" />
      <text x="188" y="31" fontSize="6" fill="#fff" fontWeight="600">Clone</text>
      {/* Services */}
      <text x="30" y="46" fontSize="6" fill={colors.secondary}>GitHub</text>
      <text x="72" y="46" fontSize="6" fill={colors.secondary}>GitLab</text>
      <text x="108" y="46" fontSize="6" fill={colors.secondary}>Bitbucket</text>
      <text x="160" y="46" fontSize="6" fill={colors.secondary}>Any URL</text>
    </svg>
  );
}

// ═══════════════════════════════════════════
// Productivity Features
// ═══════════════════════════════════════════

export function KeyboardShortcutsFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Keyboard key examples */}
      {[
        { keys: "⌘S", desc: "Stage file" },
        { keys: "⌘⇧S", desc: "Unstage file" },
        { keys: "⌘⏎", desc: "Commit" },
        { keys: "⌘F", desc: "Search" },
        { keys: "⌘?", desc: "Shortcuts" },
      ].map((item, i) => {
        const y = 6 + i * 11;
        return (
          <g key={i}>
            <rect x="10" y={y} width="40" height="9" rx="2" fill={colors.primary} opacity="0.1" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.3" />
            <text x="14" y={y + 7} fontSize="7" fill={colors.primary} fontFamily="monospace" fontWeight="600">{item.keys}</text>
            <text x="56" y={y + 7} fontSize="7" fill={colors.secondary}>{item.desc}</text>
          </g>
        );
      })}
      {/* Keyboard icon */}
      <rect x="160" y="10" width="90" height="44" rx="6" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      {/* Key rows */}
      {[0, 1, 2].map((row) => (
        <g key={row}>
          {[0, 1, 2, 3, 4].map((col) => (
            <rect key={col} x={168 + col * 15} y={16 + row * 12} width="11" height="8" rx="1.5" fill={colors.primary} opacity="0.08" stroke={colors.primary} strokeWidth="0.3" strokeOpacity="0.2" />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function SearchCommitsFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Search bar */}
      <rect x="10" y="6" width="240" height="18" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="16" y="18" fontSize="7" fill={colors.muted}>🔍</text>
      <text x="28" y="18" fontSize="7" fill={colors.secondary}>fix: authentication</text>
      {/* Filter badges */}
      <rect x="150" y="8" width="30" height="12" rx="3" fill={colors.primary} opacity="0.1" />
      <text x="154" y="16" fontSize="5" fill={colors.primary}>author</text>
      <rect x="184" y="8" width="24" height="12" rx="3" fill={colors.primary} opacity="0.1" />
      <text x="188" y="16" fontSize="5" fill={colors.primary}>date</text>
      <rect x="212" y="8" width="24" height="12" rx="3" fill={colors.primary} opacity="0.1" />
      <text x="216" y="16" fontSize="5" fill={colors.primary}>file</text>
      {/* Results */}
      {["a3f2c1d — fix: auth token refresh", "b7e4a9f — fix: auth redirect loop"].map((r, i) => (
        <g key={i}>
          <rect x="10" y={30 + i * 14} width="240" height="12" rx="3" fill={colors.primary} opacity="0.04" />
          <text x="16" y={39 + i * 14} fontSize="6" fill={colors.secondary} fontFamily="monospace">{r}</text>
        </g>
      ))}
    </svg>
  );
}

export function DarkLightThemesFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 55" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">THEMES</text>
      {/* Theme swatches */}
      {[
        { name: "Light", bg: "#f8fafc", text: "#1e293b", border: "#e2e8f0" },
        { name: "Dark", bg: "#1e293b", text: "#f8fafc", border: "#334155" },
        { name: "Gruvbox", bg: "#282828", text: "#ebdbb2", border: "#504945" },
        { name: "G.Lt", bg: "#fbf1c7", text: "#3c3836", border: "#d5c4a1" },
      ].map((t, i) => {
        const x = 10 + i * 62;
        return (
          <g key={i}>
            <rect x={x} y="16" width="56" height="32" rx="4" fill={t.bg} stroke={t.border} strokeWidth="0.8" />
            <text x={x + 8} y="28" fontSize="6" fill={t.text} fontWeight="600">{t.name}</text>
            <rect x={x + 6} y="32" width="20" height="4" rx="1" fill={t.text} opacity="0.3" />
            <rect x={x + 6} y="38" width="12" height="3" rx="1" fill={t.text} opacity="0.2" />
          </g>
        );
      })}
    </svg>
  );
}

export function RecentRepositoriesFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Sidebar */}
      <rect x="10" y="6" width="240" height="48" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.8" />
      <text x="18" y="18" fontSize="6" fill={colors.muted} fontWeight="600">RECENT REPOSITORIES</text>
      {[
        { name: "gitflow-plus", path: "~/Documents/vsext", active: true },
        { name: "my-webapp", path: "~/Projects/web", active: false },
        { name: "backend-api", path: "~/Work/api", active: false },
      ].map((r, i) => {
        const y = 22 + i * 10;
        return (
          <g key={i}>
            <text x="18" y={y + 6} fontSize="7" fill={r.active ? colors.primary : colors.secondary} fontWeight={r.active ? 600 : 400}>📁 {r.name}</text>
            <text x="110" y={y + 6} fontSize="5" fill={colors.muted}>{r.path}</text>
            {r.active && <rect x="10" y={y} width="240" height="10" rx="2" fill={colors.primary} opacity="0.06" />}
          </g>
        );
      })}
    </svg>
  );
}

export function UndoOperationsFeatureIllustration() {
  return (
    <svg viewBox="0 0 260 55" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Reflog entries */}
      <text x="12" y="12" fontSize="6" fill={colors.muted} fontWeight="600">REFLOG</text>
      {[
        { action: "commit", msg: "feat: new feature", undoable: true },
        { action: "checkout", msg: "→ feature/auth", undoable: true },
        { action: "commit", msg: "fix: bug fix", undoable: true },
      ].map((e, i) => {
        const y = 16 + i * 11;
        return (
          <g key={i}>
            <rect x="10" y={y} width="170" height="9" rx="2" fill={colors.surface} stroke={colors.border} strokeWidth="0.3" />
            <text x="16" y={y + 7} fontSize="6" fill={colors.secondary} fontFamily="monospace">{e.action}: {e.msg}</text>
            {i === 0 && (
              <g>
                <path d="M190 {y + 4} L210 {y + 4}" stroke={colors.primary} strokeWidth="1" />
                <polygon points="193,{y + 1} 186,{y + 4} 193,{y + 7}" fill={colors.primary} />
              </g>
            )}
          </g>
        );
      })}
      {/* Undo button */}
      <rect x="190" y="16" width="60" height="24" rx="4" fill={colors.primary} opacity="0.1" stroke={colors.primary} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="198" y="26" fontSize="7" fill={colors.primary} fontWeight="600">↺ Undo</text>
      <text x="198" y="34" fontSize="5" fill={colors.secondary}>⌘Z</text>
    </svg>
  );
}

export function SquashLastNFeatureIllustration() {
  return (
    <svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* 4 commits being squashed into 1 */}
      {[0, 1, 2, 3].map((i) => {
        const y = 12 + i * 18;
        const isOldest = i === 3;
        return (
          <g key={i}>
            <rect x="12" y={y} width="110" height="14" rx="3"
              fill={isOldest ? colors.green : colors.orange} opacity="0.08"
              stroke={isOldest ? colors.green : colors.orange} strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="24" cy={y + 7} r="4" fill={isOldest ? colors.green : colors.orange} />
            <text x="34" y={y + 10} fontSize="6.5" fill={colors.secondary} fontFamily="monospace">
              {isOldest ? "pick" : "squash"}
            </text>
            <text x="68" y={y + 10} fontSize="6" fill={colors.muted} fontFamily="monospace">
              {["feat: add login", "fix: typo", "chore: cleanup", "feat: init"][i]}
            </text>
          </g>
        );
      })}
      {/* Arrow */}
      <path d="M140 40 L160 40" stroke={colors.primary} strokeWidth="1.5" markerEnd="url(#arrowHead)" />
      <defs>
        <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <polygon points="0,0 10,5 0,10" fill={colors.primary} />
        </marker>
      </defs>
      {/* Result */}
      <rect x="170" y="28" width="110" height="24" rx="4" fill={colors.green} opacity="0.1" stroke={colors.green} strokeWidth="0.8" />
      <circle cx="182" cy="40" r="5" fill={colors.green} />
      <text x="192" y="36" fontSize="7" fill={colors.secondary} fontWeight="600">feat: add login</text>
      <text x="192" y="46" fontSize="5.5" fill={colors.muted}>3 commits squashed</text>
    </svg>
  );
}

export function ImproveCommitMessageFeatureIllustration() {
  return (
    <svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Before: draft message */}
      <text x="12" y="16" fontSize="7" fill={colors.muted} fontWeight="600">DRAFT</text>
      <rect x="12" y="22" width="120" height="28" rx="4" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="18" y="34" fontSize="6.5" fill={colors.muted} fontFamily="monospace">fix stuff in auth</text>
      <text x="18" y="44" fontSize="5.5" fill={colors.red}>⚠ missing scope, unclear</text>
      {/* Wand icon */}
      <text x="142" y="38" fontSize="16">✨</text>
      {/* After: improved message */}
      <text x="165" y="16" fontSize="7" fill={colors.green} fontWeight="600">IMPROVED</text>
      <rect x="165" y="22" width="110" height="28" rx="4" fill={colors.green} opacity="0.06" stroke={colors.green} strokeWidth="0.5" />
      <text x="171" y="34" fontSize="6.5" fill={colors.secondary} fontFamily="monospace">fix(auth): validate token</text>
      <text x="171" y="44" fontSize="5.5" fill={colors.green}>✓ conventional, clear scope</text>
      {/* Arrow */}
      <path d="M138 36 L160 36" stroke={colors.primary} strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}

export function AddCommitBodyFeatureIllustration() {
  return (
    <svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={cls}>
      {/* Subject line */}
      <text x="12" y="16" fontSize="7" fill={colors.muted} fontWeight="600">SUBJECT</text>
      <rect x="12" y="22" width="260" height="14" rx="3" fill={colors.surface} stroke={colors.border} strokeWidth="0.5" />
      <text x="18" y="32" fontSize="6.5" fill={colors.secondary} fontFamily="monospace">feat(auth): add OAuth2 login flow</text>
      {/* Separator */}
      <line x1="12" y1="42" x2="272" y2="42" stroke={colors.border} strokeWidth="0.3" strokeDasharray="4 2" />
      {/* Generated body */}
      <text x="12" y="54" fontSize="7" fill={colors.purple} fontWeight="600">GENERATED BODY</text>
      {["• Implements OAuth2 authorization code flow", "• Adds redirect URI validation", "• Integrates with Google & GitHub providers", "• Breaking: removes legacy password auth"].map((line, i) => (
        <text key={i} x="18" y={66 + i * 10} fontSize="5.5" fill={colors.muted} fontFamily="monospace">{line}</text>
      ))}
    </svg>
  );
}
