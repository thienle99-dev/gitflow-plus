import { type ReactNode } from "react";

/** Match [BUG], [SECURITY], [PERF], etc. review category tags */
function matchReviewCategory(line: string) {
  return line.match(
    /^\s*(?:#{1,6}\s*)?(?:[-*]\s*)?(?:\|+\s*)?(?:\*\*)?\[(BUG|SECURITY|PERF|STYLE|BEST-PRACTICE|LINTER|TEST|A11Y|UX)\](?:\*\*)?(?:\s*\|+)?(?::)?\s*(.*)$/i,
  );
}

function reviewCategoryMeta(category: string) {
  switch (category.toUpperCase()) {
    case "BUG":
      return {
        label: "Bug",
        border: "border-[#ff375f]",
        bg: "bg-[#ff375f]/8",
        badge: "bg-[#ff375f]/20 text-[#ff375f]",
      };
    case "SECURITY":
      return {
        label: "Security",
        border: "border-[#ff6b35]",
        bg: "bg-[#ff6b35]/8",
        badge: "bg-[#ff6b35]/20 text-[#ff6b35]",
      };
    case "PERF":
      return {
        label: "Perf",
        border: "border-[#ffcc00]",
        bg: "bg-[#ffcc00]/8",
        badge: "bg-[#ffcc00]/20 text-[#ffcc00]",
      };
    case "STYLE":
      return {
        label: "Style",
        border: "border-[#0a84ff]",
        bg: "bg-[#0a84ff]/8",
        badge: "bg-[#0a84ff]/20 text-[#0a84ff]",
      };
    case "BEST-PRACTICE":
      return {
        label: "Best Practice",
        border: "border-[#bf5af2]",
        bg: "bg-[#bf5af2]/8",
        badge: "bg-[#bf5af2]/20 text-[#bf5af2]",
      };
    case "LINTER":
      return {
        label: "Linter",
        border: "border-[#64d2ff]",
        bg: "bg-[#64d2ff]/8",
        badge: "bg-[#64d2ff]/20 text-[#64d2ff]",
      };
    case "TEST":
      return {
        label: "Test",
        border: "border-[#30d158]",
        bg: "bg-[#30d158]/8",
        badge: "bg-[#30d158]/20 text-[#30d158]",
      };
    case "A11Y":
      return {
        label: "A11y",
        border: "border-[#ff9f0a]",
        bg: "bg-[#ff9f0a]/8",
        badge: "bg-[#ff9f0a]/20 text-[#ff9f0a]",
      };
    case "UX":
      return {
        label: "UX",
        border: "border-[#ff2d55]",
        bg: "bg-[#ff2d55]/8",
        badge: "bg-[#ff2d55]/20 text-[#ff2d55]",
      };
    default:
      return {
        label: category,
        border: "border-accent",
        bg: "bg-accent-8",
        badge: "bg-accent-20 text-accent",
      };
  }
}

/** Parse **bold** text into React elements */
function parseBoldText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={`b${key++}`} className="font-semibold text-text-primary">
        {match[1]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

/** Parse inline `code` backticks */
function parseInlineCode(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...parseBoldText(text.slice(lastIndex, match.index)));
    }
    parts.push(
      <code
        key={`c${key++}`}
        className="px-1 py-0.5 rounded bg-surface-3 text-accent font-mono text-[11px]"
      >
        {match[1]}
      </code>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(...parseBoldText(text.slice(lastIndex)));
  }
  return parts.length > 0 ? parts : [text];
}

/** Parse [text](url) markdown links */
function parseLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...parseInlineCode(text.slice(lastIndex, match.index)));
    }
    parts.push(
      <a
        key={`a${key++}`}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="text-accent underline hover:text-accent-fg"
      >
        {match[1]}
      </a>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(...parseInlineCode(text.slice(lastIndex)));
  }
  return parts.length > 0 ? parts : [text];
}

/** Full inline text parsing: links → inline code → bold */
function parseInline(text: string): ReactNode[] {
  return parseLinks(text);
}

interface AIMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Shared component for rendering AI-generated markdown with proper styling.
 * Supports headers, bold, italic, code blocks, lists, links, and review category tags.
 */
export default function AIMarkdown({ content, className }: AIMarkdownProps) {
  const elements: ReactNode[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let key = 0;

  const flushCodeBlock = () => {
    if (codeLines.length > 0) {
      elements.push(
        <div key={`cb${key++}`} className="my-2 rounded-mac overflow-hidden border border-border-40">
          {codeLang && (
            <div className="px-2.5 py-1 bg-surface-3-60 text-[10px] font-mono font-medium text-text-muted uppercase tracking-wide border-b border-border-30">
              {codeLang}
            </div>
          )}
          <pre className="px-3 py-2 bg-surface-2-80 overflow-x-auto">
            <code className="text-[11px] font-mono text-text-secondary leading-relaxed whitespace-pre">
              {codeLines.join("\n")}
            </code>
          </pre>
        </div>,
      );
      codeLines = [];
      codeLang = "";
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Review category tag
    const categoryMatch = matchReviewCategory(line);
    if (categoryMatch) {
      const meta = reviewCategoryMeta(categoryMatch[1]);
      elements.push(
        <div
          key={`l${key++}`}
          className={`ml-1 mt-1.5 flex gap-2 border-l-2 ${meta.border} ${meta.bg} pl-2.5 pr-2 py-1.5 rounded-r-sm`}
        >
          <span
            className={`inline-flex items-center h-5 px-1.5 rounded text-[9px] font-bold uppercase tracking-wider ${meta.badge} shrink-0`}
          >
            {meta.label}
          </span>
          <span className="min-w-0 text-text-secondary">
            {parseInline(categoryMatch[2])}
          </span>
        </div>,
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <div
          key={`l${key++}`}
          className="font-semibold text-text-primary mt-2.5 mb-1 text-xs border-l-2 border-accent-40 pl-2"
        >
          {line.slice(4)}
        </div>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <div
          key={`l${key++}`}
          className="font-semibold text-text-primary mt-2.5 mb-1 text-xs border-l-2 border-accent-40 pl-2"
        >
          {line.slice(3)}
        </div>,
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h3
          key={`l${key++}`}
          className="text-sm font-bold text-text-primary pt-2 border-b border-border pb-1"
        >
          {line.slice(2)}
        </h3>,
      );
      continue;
    }

    // Risk level badges
    const riskMatch = line.match(/^\*\*(Low|Medium|High)\*\*(.*)/i);
    if (riskMatch) {
      const level = riskMatch[1].toLowerCase();
      const colors =
        level === "high"
          ? "bg-[#ff375f]/20 text-[#ff375f] border-[#ff375f]/30"
          : level === "medium"
            ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
            : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
      elements.push(
        <div key={`l${key++}`} className="flex items-center gap-2 mt-2 mb-1">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${colors}`}
          >
            {riskMatch[1]} Risk
          </span>
          <span className="text-text-muted">{parseInline(riskMatch[2])}</span>
        </div>,
      );
      continue;
    }

    // Bold-only line
    if (/^\*\*.*\*\*$/.test(line.trim())) {
      elements.push(
        <div key={`l${key++}`} className="font-semibold text-text-primary mt-2">
          {line.replace(/\*\*/g, "")}
        </div>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={`l${key++}`} className="ml-4 mt-0.5 flex gap-1.5">
          <span className="text-accent-60 shrink-0">{line.match(/^(\d+)\./)?.[1]}.</span>
          <span>{parseInline(line.replace(/^\d+\.\s+/, ""))}</span>
        </div>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      elements.push(
        <div key={`l${key++}`} className="ml-2 mt-0.5 flex gap-1.5">
          <span className="text-accent-60 shrink-0">•</span>
          <span>{parseInline(line.replace(/^\s*[-*]\s+/, "").replace(/^\s*\|\s*/, ""))}</span>
        </div>,
      );
      continue;
    }

    // Regular text
    const text = line.replace(/^\s*\|\s*/, "") || "\u00A0";
    elements.push(
      <div key={`l${key++}`}>{parseInline(text)}</div>,
    );
  }

  // Flush unclosed code block
  if (inCodeBlock) flushCodeBlock();

  return (
    <div className={`text-xs leading-relaxed space-y-0.5 text-text-secondary ${className ?? ""}`}>
      {elements}
    </div>
  );
}
