import { useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { useActivity } from "@/queries/useActivity";
import { useRepoStore } from "@/stores/repo";

const CELL_SIZE = 11;
const CELL_GAP = 3;
const CELL_RADIUS = 2;
const DAY_LABEL_WIDTH = 30;
const MONTH_LABEL_HEIGHT = 18;
const WEEKS_TO_SHOW = 53;

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/** GitHub-style green intensity palette — uses CSS custom properties for theming */
function getColor(count: number, maxCount: number): string {
  if (count === 0) return "var(--heatmap-empty, #ebedf0)";
  if (maxCount <= 1) return "var(--heatmap-high, #39d353)";
  const ratio = count / maxCount;
  if (ratio <= 0.25) return "var(--heatmap-low, #9be9a8)";
  if (ratio <= 0.5) return "var(--heatmap-medium, #40c463)";
  if (ratio <= 0.75) return "var(--heatmap-high, #30a14e)";
  return "var(--heatmap-max, #216e39)";
}

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
  dayOfWeek: number; // 0=Sun, 6=Sat
}

function buildGrid(activity: Record<string, number>): {
  weeks: (DayData | null)[][];
  monthLabels: { label: string; weekIndex: number }[];
  maxCount: number;
  totalCommits: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the start: go back to the nearest Sunday, then back (WEEKS_TO_SHOW - 1) weeks
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // This Sunday
  startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW - 1) * 7); // Go back to first week

  const weeks: (DayData | null)[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let maxCount = 0;
  let totalCommits = 0;
  let lastMonth = -1;

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let w = 0; w < WEEKS_TO_SHOW; w++) {
    const week: (DayData | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);

      if (date > today) {
        week.push(null);
        continue;
      }

      const dateStr = date.toISOString().slice(0, 10);
      const count = activity[dateStr] || 0;
      maxCount = Math.max(maxCount, count);
      totalCommits += count;

      // Track month labels
      if (d === 0 && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth();
        monthLabels.push({ label: MONTHS[date.getMonth()], weekIndex: w });
      }

      week.push({
        date: dateStr,
        count,
        dayOfWeek: date.getDay(),
      });
    }
    weeks.push(week);
  }

  return { weeks, monthLabels, maxCount, totalCommits };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function ActivityHeatmap() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { data: activity, isLoading } = useActivity(repoPath);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const grid = useMemo(() => {
    if (!activity) return null;
    return buildGrid(activity);
  }, [activity]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, day: DayData) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const count = day.count;
      const text =
        count === 0
          ? `No commits on ${formatDate(day.date)}`
          : `${count} commit${count === 1 ? "" : "s"} on ${formatDate(day.date)}`;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text,
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (isLoading || !grid) {
    return (
      <div className="px-4 py-3">
        <div className="text-[10px] text-text-muted animate-pulse">
          Loading activity...
        </div>
      </div>
    );
  }

  const { weeks, monthLabels, maxCount, totalCommits } = grid;
  const gridWidth = DAY_LABEL_WIDTH + WEEKS_TO_SHOW * (CELL_SIZE + CELL_GAP);
  const gridHeight = MONTH_LABEL_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    scrollEl.scrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth;
  }, [repoPath, gridWidth]);

  return (
    <div className="px-4 py-2 select-none">
      {/* Summary */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary font-medium">
          {totalCommits.toLocaleString()} commits in the last year
        </span>
      </div>

      {/* Heatmap */}
      <div ref={scrollRef} className="relative overflow-x-auto scrollbar-thin">
        <svg
          ref={svgRef}
          width={gridWidth}
          height={gridHeight}
          className="block"
          role="img"
          aria-label="Contribution activity heatmap"
        >
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={`m-${i}`}
              x={DAY_LABEL_WIDTH + m.weekIndex * (CELL_SIZE + CELL_GAP)}
              y={12}
              className="fill-text-muted"
              fontSize={10}
              fontFamily="inherit"
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            <text
              key={`d-${i}`}
              x={DAY_LABEL_WIDTH - 6}
              y={MONTH_LABEL_HEIGHT + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 1}
              className="fill-text-muted"
              fontSize={10}
              textAnchor="end"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day) return null;
              const x = DAY_LABEL_WIDTH + wi * (CELL_SIZE + CELL_GAP);
              const y = MONTH_LABEL_HEIGHT + di * (CELL_SIZE + CELL_GAP);
              return (
                <rect
                  key={day.date}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={CELL_RADIUS}
                  ry={CELL_RADIUS}
                  fill={getColor(day.count, maxCount)}
                  data-date={day.date}
                  data-count={day.count}
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseLeave={handleMouseLeave}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                >
                  <title>{`${day.count} commits on ${day.date}`}</title>
                </rect>
              );
            }),
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 px-2 py-1 text-[10px] font-medium text-text-primary bg-surface-1 border border-border rounded-mac shadow-md whitespace-nowrap"
            style={{
              left: tooltip.x,
              top: tooltip.y - 32,
              transform: "translateX(-50%)",
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-text-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => {
          const fakeCount = level === 0 ? 0 : Math.ceil((maxCount * level) / 4);
          return (
            <div
              key={level}
              className="w-[10px] h-[10px] rounded-[2px]"
              style={{ backgroundColor: getColor(fakeCount, maxCount) }}
            />
          );
        })}
        <span>More</span>
      </div>
    </div>
  );
}
