import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/primitives";
import { HabitsPanel } from "./ibadah";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { habitStreak, ymd } from "@/lib/domain";

export default function Habits() {
  const { t } = useI18n();
  const habits = useTable<Row>("habits");
  const habitLogs = useTable<Row>("habitLogs");

  /* ─── heatmap data: last 12 weeks of habit completion count ─── */
  const heatmapData = useMemo(() => {
    const doneMap = new Map<string, Set<string>>();
    for (const l of habitLogs) {
      if (l.done) {
        const dStr = String(l.date);
        if (!doneMap.has(dStr)) doneMap.set(dStr, new Set());
        doneMap.get(dStr)!.add(String(l.habitId));
      }
    }
    const out: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      const count = doneMap.get(dStr)?.size ?? 0;
      out.push({ date: dStr, value: count });
    }
    return out;
  }, [habitLogs]);

  /* ─── streak: count consecutive days with at least 1 habit done ─── */
  const streak = useMemo(() => {
    const doneDates = new Set(
      habitLogs.filter((l) => l.done).map((l) => String(l.date)),
    );
    return habitStreak(doneDates);
  }, [habitLogs]);

  return (
    <div>
      <PageHeader title={t("habit.title")} subtitle={t("habits.subtitle")} />

      {/* Streak badge + heatmap */}
      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{t("dash.section.habits")}</h3>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5" />
              {streak} {t("dash.days")}
            </span>
          )}
        </div>
        <ConsistencyHeatmap data={heatmapData} color="emerald" weeks={12} />
        <p className="mt-3 text-[10px] text-muted-foreground/60">
          {t("analytics.last30")}
        </p>
      </Card>

      <HabitsPanel />
    </div>
  );
}
