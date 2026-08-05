import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ymd, addDays, parseYmd } from "@/lib/domain";

export interface HeatmapDataPoint {
  /** YYYY-MM-DD date string */
  date: string;
  /** Numeric value (higher = more intense) */
  value: number;
}

interface ConsistencyHeatmapProps {
  /** Array of data points (date + value) */
  data: HeatmapDataPoint[];
  /** Number of weeks to show (default 12 ≈ 3 months) */
  weeks?: number;
  /** Max value for intensity scaling (auto-detected from data if omitted) */
  maxValue?: number;
  /** Number of intensity levels (default 5: empty + 4 shades) */
  levels?: number;
  /** Color class prefix — "primary" uses oklch primary, "emerald" uses emerald, etc. */
  color?: "primary" | "emerald" | "amber" | "sky" | "violet";
  /** Whether to show day labels (Mon, Wed, Fri) on the left */
  showDayLabels?: boolean;
  /** Whether to show month labels on top */
  showMonthLabels?: boolean;
  /** Additional class names */
  className?: string;
}

/** Color palettes for different themes */
const PALETTES = {
  primary: [
    "bg-muted/40",
    "bg-primary/20",
    "bg-primary/40",
    "bg-primary/60",
    "bg-primary",
  ],
  emerald: [
    "bg-muted/40",
    "bg-emerald-500/20",
    "bg-emerald-500/40",
    "bg-emerald-500/65",
    "bg-emerald-500",
  ],
  amber: [
    "bg-muted/40",
    "bg-amber-500/20",
    "bg-amber-500/40",
    "bg-amber-500/65",
    "bg-amber-500",
  ],
  sky: [
    "bg-muted/40",
    "bg-sky-500/20",
    "bg-sky-500/40",
    "bg-sky-500/65",
    "bg-sky-500",
  ],
  violet: [
    "bg-muted/40",
    "bg-violet-500/20",
    "bg-violet-500/40",
    "bg-violet-500/65",
    "bg-violet-500",
  ],
};

const DAY_LABELS = ["", "Sn", "", "Rb", "", "Jm", ""];

export function ConsistencyHeatmap({
  data,
  weeks = 12,
  maxValue,
  levels = 5,
  color = "primary",
  showDayLabels = true,
  showMonthLabels = true,
  className,
}: ConsistencyHeatmapProps) {
  const palette = PALETTES[color];

  // Build date grid: last N weeks, Mon→Sun columns
  const { grid, monthLabels, maxVal } = useMemo(() => {
    const now = new Date();
    const todayStr = ymd(now);

    // Find max value for scaling
    const detectedMax = maxValue ?? Math.max(1, ...data.map((d) => d.value));

    // Build a map for quick lookup
    const valueMap = new Map(data.map((d) => [d.date, d.value]));

    // Find the end date (today) and go back `weeks` weeks to find start Monday
    const endDate = new Date(now);
    const dayOfWeek = endDate.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const lastMonday = new Date(endDate);
    lastMonday.setDate(endDate.getDate() + mondayOffset);

    const startMonday = new Date(lastMonday);
    startMonday.setDate(lastMonday.getDate() - (weeks - 1) * 7);

    // Build grid: 7 rows (Mon-Sun) × N columns
    const totalDays = weeks * 7;
    const cells: { date: string; value: number; isToday: boolean; isFuture: boolean }[] = [];
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startMonday);
    for (let i = 0; i < totalDays; i++) {
      const dStr = ymd(cursor);
      const isFuture = dStr > todayStr;
      const val = isFuture ? 0 : (valueMap.get(dStr) ?? 0);

      cells.push({
        date: dStr,
        value: val,
        isToday: dStr === todayStr,
        isFuture,
      });

      // Track month changes for labels
      const month = cursor.getMonth();
      if (month !== lastMonth && cursor.getDate() <= 7) {
        months.push({
          label: cursor.toLocaleDateString("en-US", { month: "short" }),
          col: Math.floor(i / 7),
        });
        lastMonth = month;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      grid: cells,
      monthLabels: months,
      maxVal: detectedMax,
    };
  }, [data, weeks, maxValue]);

  // Get intensity level (0..levels-1)
  function getLevel(value: number): number {
    if (value <= 0) return 0;
    const ratio = value / maxVal;
    return Math.min(levels - 1, Math.ceil(ratio * (levels - 1)));
  }

  // Split grid into columns (weeks)
  const columns = useMemo(() => {
    const cols: typeof grid[] = [];
    for (let i = 0; i < grid.length; i += 7) {
      cols.push(grid.slice(i, i + 7));
    }
    return cols;
  }, [grid]);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-[520px] inline-flex flex-col">
        {/* Month labels */}
        {showMonthLabels && (
          <div className="flex gap-0 pl-7">
            {columns.map((_, colIdx) => {
              const ml = monthLabels.find((m) => m.col === colIdx);
              return (
                <div
                  key={colIdx}
                  className="w-[14px] text-[9px] text-muted-foreground/60"
                >
                  {ml?.label ?? ""}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-0">
          {/* Day labels */}
          {showDayLabels && (
            <div className="flex flex-col gap-1 pr-1.5">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-[14px] items-center text-[9px] text-muted-foreground/60"
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Heatmap grid */}
          <div className="flex gap-1">
            {columns.map((col, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-1">
                {col.map((cell) => {
                  const lvl = cell.isFuture ? -1 : getLevel(cell.value);
                  return (
                    <div
                      key={cell.date}
                      title={
                        cell.isFuture
                          ? ""
                          : `${cell.date}: ${cell.value}`
                      }
                      className={cn(
                        "aspect-square w-[14px] rounded-[3px] transition-colors",
                        lvl === -1
                          ? "bg-transparent"
                          : palette[lvl] ?? palette[0],
                        cell.isToday && "ring-1 ring-foreground/30",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
