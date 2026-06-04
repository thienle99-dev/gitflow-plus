import { useState, useEffect, useRef, useMemo } from "react";
import { useRepoStore } from "@/stores/repo";
import { api, type Commit } from "@/api/tauri";
import { X, BarChart3, GitCommit, Award, Calendar, CheckCircle, RefreshCw } from "lucide-react";
import { GravatarImg } from "@/components/ui/shared";

interface AnalyticsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AnalyticsDialog({ open, onClose }: AnalyticsDialogProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Canvas refs
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  const typeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !repoPath) return;

    const fetchCommits = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch up to 300 commits for rich analytics
        const list = await api.log(repoPath, 0, 300);
        setCommits(list);
      } catch (err: any) {
        console.error(err);
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchCommits();
  }, [open, repoPath]);

  // Calculations
  const stats = useMemo(() => {
    if (commits.length === 0) return null;

    // 1. Conventional Commits Stats
    let conventionalCount = 0;
    const typeCounts: Record<string, number> = {
      feat: 0,
      fix: 0,
      refactor: 0,
      chore: 0,
      docs: 0,
      style: 0,
      test: 0,
      other: 0,
    };

    commits.forEach((c) => {
      const match = c.message.trim().match(/^(feat|fix|refactor|chore|docs|style|test)(\([^)]+\))?\s*:/i);
      if (match) {
        conventionalCount++;
        const type = match[1].toLowerCase();
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      } else {
        typeCounts.other++;
      }
    });

    const conventionalRatio = conventionalCount / commits.length;
    let grade = "C";
    let gradeColor = "text-[#ff375f]";
    if (conventionalRatio >= 0.9) {
      grade = "A+";
      gradeColor = "text-[#30d158]";
    } else if (conventionalRatio >= 0.8) {
      grade = "A";
      gradeColor = "text-[#30d158]";
    } else if (conventionalRatio >= 0.7) {
      grade = "B+";
      gradeColor = "text-[#bf5af2]";
    } else if (conventionalRatio >= 0.5) {
      grade = "B";
      gradeColor = "text-[#0a84ff]";
    } else if (conventionalRatio >= 0.3) {
      grade = "C+";
      gradeColor = "text-[#ff9f0a]";
    }

    // 2. Commits by Author
    const authorCounts: Record<string, number> = {};
    const authorEmailMap: Record<string, string> = {};
    commits.forEach((c) => {
      authorCounts[c.author] = (authorCounts[c.author] || 0) + 1;
      if (c.email && !authorEmailMap[c.author]) {
        authorEmailMap[c.author] = c.email;
      }
    });
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 3. Commits by Day of Week
    const dayCounts = Array(7).fill(0);
    commits.forEach((c) => {
      const d = new Date(c.date);
      if (!isNaN(d.getTime())) {
        dayCounts[d.getDay()]++;
      }
    });

    return {
      totalCommits: commits.length,
      conventionalCount,
      conventionalRatio,
      typeCounts,
      topAuthors,
      dayCounts,
      grade,
      gradeColor,
    };
  }, [commits]);

  // Draw charts
  useEffect(() => {
    if (loading || !stats) return;

    // Read active theme CSS variables dynamically
    const style = getComputedStyle(document.body);
    const surface0 = style.getPropertyValue("--surface-0").trim() || "#1c1c1e";
    const accent = style.getPropertyValue("--accent").trim() || "#0a84ff";
    const border = style.getPropertyValue("--border").trim() || "#38383a";
    const textMuted = style.getPropertyValue("--text-muted").trim() || "#8e8e93";

    // --- 1. Draw Timeline Canvas ---
    const tCanvas = timelineCanvasRef.current;
    if (tCanvas) {
      const ctx = tCanvas.getContext("2d");
      if (ctx) {
        // Handle High DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = tCanvas.getBoundingClientRect();
        tCanvas.width = rect.width * dpr;
        tCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        ctx.clearRect(0, 0, width, height);

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const maxVal = Math.max(...stats.dayCounts, 1);

        // Chart spacing
        const paddingLeft = 30;
        const paddingRight = 10;
        const paddingTop = 20;
        const paddingBottom = 20;
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        // Draw background grid lines
        ctx.strokeStyle = border.startsWith("#") ? border + "33" : "rgba(128, 128, 128, 0.15)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = paddingTop + (chartHeight / 4) * i;
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(width - paddingRight, y);
          ctx.stroke();
        }

        // Draw Bars
        const barWidth = (chartWidth / 7) * 0.6;
        const gap = (chartWidth / 7) * 0.4;

        stats.dayCounts.forEach((count, i) => {
          const x = paddingLeft + i * (barWidth + gap) + gap / 2;
          const barHeight = (count / maxVal) * chartHeight;
          const y = height - paddingBottom - barHeight;

          // Gradient using active theme accent color
          const grad = ctx.createLinearGradient(0, y, 0, height - paddingBottom);
          grad.addColorStop(0, accent);
          grad.addColorStop(1, accent.startsWith("#") ? accent + "20" : "rgba(10, 132, 255, 0.12)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          // Value label
          ctx.fillStyle = textMuted;
          ctx.font = "9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(count), x + barWidth / 2, y - 5);

          // X axis labels
          ctx.fillText(days[i], x + barWidth / 2, height - 6);
        });
      }
    }

    // --- 2. Draw Types Donut Canvas ---
    const tyCanvas = typeCanvasRef.current;
    if (tyCanvas) {
      const ctx = tyCanvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = tyCanvas.getBoundingClientRect();
        tyCanvas.width = rect.width * dpr;
        tyCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        ctx.clearRect(0, 0, width, height);

        const dataEntries = Object.entries(stats.typeCounts).filter(([_, val]) => val > 0);
        const total = stats.totalCommits;

        const colors: Record<string, string> = {
          feat: "#30d158",
          fix: "#ff375f",
          refactor: "#bf5af2",
          chore: "#ff9f0a",
          docs: "#0a84ff",
          style: "#ffcc00",
          test: "#64d2ff",
          other: "#8e8e93",
        };

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.38;

        let startAngle = -Math.PI / 2;
        dataEntries.forEach(([key, val]) => {
          const sliceAngle = (val / total) * 2 * Math.PI;
          ctx.fillStyle = colors[key] || "#8e8e93";

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
          ctx.closePath();
          ctx.fill();

          startAngle += sliceAngle;
        });

        // Inner circle for donut dynamically matches theme background!
        ctx.fillStyle = surface0;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [loading, stats]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#000000]/45" />

      <div className="relative w-[740px] max-h-[85vh] bg-surface-0 border border-border rounded-mac shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-60 flex items-center justify-between bg-surface-1-40 backdrop-blur-md">
          <div className="flex items-center gap-2 text-text-primary">
            <BarChart3 size={16} className="text-accent" />
            <h3 className="text-sm font-semibold">Git Activity Analytics</h3>
          </div>
          <button onClick={onClose} className="ghost p-1 text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-text-muted">
              <RefreshCw size={24} className="animate-spin text-accent" />
              <span className="text-xs">Analyzing commits history...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-mac text-xs text-[#ff375f]">
              Failed to load analytics: {error}
            </div>
          ) : !stats ? (
            <div className="text-center py-10 text-text-muted text-xs">
              No commit history available.
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3.5 bg-surface-1-30 border border-border-40 rounded-mac space-y-1">
                  <div className="text-3xs text-text-muted font-bold uppercase tracking-wider">Total Commits</div>
                  <div className="text-lg font-bold text-text-primary flex items-center gap-1.5">
                    <GitCommit size={14} className="text-accent" />
                    <span>{stats.totalCommits}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-surface-1-30 border border-border-40 rounded-mac space-y-1">
                  <div className="text-3xs text-text-muted font-bold uppercase tracking-wider">Conventional Commits</div>
                  <div className="text-lg font-bold text-text-primary flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-[#30d158]" />
                    <span>{stats.conventionalCount}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-surface-1-30 border border-border-40 rounded-mac space-y-1">
                  <div className="text-3xs text-text-muted font-bold uppercase tracking-wider">Conventional Ratio</div>
                  <div className="text-lg font-bold text-text-primary flex items-center justify-between">
                    <span>{Math.round(stats.conventionalRatio * 100)}%</span>
                  </div>
                </div>

                <div className="p-3.5 bg-surface-1-30 border border-border-40 rounded-mac space-y-1 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-3xs text-text-muted font-bold uppercase tracking-wider">Repo Health Grade</div>
                    <div className={`text-lg font-black ${stats.gradeColor}`}>{stats.grade}</div>
                  </div>
                  <Award size={20} className={`${stats.gradeColor} opacity-80`} />
                </div>
              </div>

              {/* Main charts section */}
              <div className="grid grid-cols-2 gap-4">
                {/* Timeline chart */}
                <div className="p-4 bg-surface-1-30 border border-border-40 rounded-mac space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Calendar size={13} className="text-accent" />
                    <span>Weekly Commit Frequency</span>
                  </div>
                  <div className="flex items-center justify-center bg-surface-0 border border-border-40 rounded-mac px-2 py-3">
                    <canvas ref={timelineCanvasRef} className="w-full h-40" />
                  </div>
                </div>

                {/* Donut conventional charts */}
                <div className="p-4 bg-surface-1-30 border border-border-40 rounded-mac space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <BarChart3 size={13} className="text-[#30d158]" />
                    <span>Commit Types Distribution</span>
                  </div>
                  <div className="flex gap-4 items-center bg-surface-0 border border-border-40 rounded-mac p-3 h-40">
                    <canvas ref={typeCanvasRef} className="w-[120px] h-[120px] shrink-0" />
                    <div className="flex-1 text-2xs space-y-1.5 max-h-[130px] overflow-y-auto pr-1">
                      {Object.entries(stats.typeCounts)
                        .filter(([_, count]) => count > 0)
                        .map(([type, count]) => {
                          const colors: Record<string, string> = {
                            feat: "bg-[#30d158]",
                            fix: "bg-[#ff375f]",
                            refactor: "bg-[#bf5af2]",
                            chore: "bg-[#ff9f0a]",
                            docs: "bg-[#0a84ff]",
                            style: "bg-[#ffcc00]",
                            test: "bg-[#64d2ff]",
                            other: "bg-[#8e8e93]",
                          };
                          return (
                            <div key={type} className="flex items-center justify-between text-text-secondary">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${colors[type] || "bg-[#8e8e93]"}`} />
                                <span className="font-semibold capitalize">{type}</span>
                              </div>
                              <span className="font-mono text-text-muted">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contributors Grid */}
              <div className="p-4 bg-surface-1-30 border border-border-40 rounded-mac space-y-3">
                <h4 className="text-xs font-semibold text-text-primary">Top Contributors (Latest 300 Commits)</h4>
                <div className="space-y-3">
                  {stats.topAuthors.map(([author, count], idx) => {
                    const ratio = count / stats.totalCommits;
                    return (
                      <div key={author} className="space-y-1">
                        <div className="flex justify-between text-2xs">
                          <span className="text-text-primary font-semibold">
                            {idx + 1}. {author}
                          </span>
                          <span className="font-mono text-text-muted font-medium">
                            {count} commits ({Math.round(ratio * 100)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface-2 border border-border-40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-300"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border-60 bg-surface-1 flex justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 bg-accent text-accent-fg text-xs font-semibold rounded-mac hover:opacity-90 transition-opacity min-w-[64px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
