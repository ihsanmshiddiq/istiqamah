import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/primitives";
import { PrayerPanel } from "./ibadah";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { PRAYERS, prayerStreak, ymd } from "@/lib/domain";

export default function Salah() {
  const { t } = useI18n();
  const logs = useTable<Row>("prayerLogs");

  /* ─── heatmap data: last 12 weeks of prayer completion ─── */
  const heatmapData = useMemo(() => {
    const map = new Map(logs.map((p) => [String(p.date), p]));
    const out: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      const row = map.get(dStr);
      const done = row ? PRAYERS.filter((k) => Number(row[k] ?? 0) > 0).length : 0;
      out.push({ date: dStr, value: done });
    }
    return out;
  }, [logs]);

  /* ─── streak ─── */
  const streak = useMemo(() => {
    const map = new Map(logs.map((p) => [String(p.date), p]));
    return prayerStreak(map);
  }, [logs]);

  return (
    <div>
      <PageHeader title={t("prayer.title")} subtitle={t("salah.subtitle")} />

      {/* Streak badge + heatmap */}
      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{t("dash.section.prayer")}</h3>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5" />
              {streak} {t("dash.days")}
            </span>
          )}
        </div>
        <ConsistencyHeatmap data={heatmapData} color="primary" weeks={12} />
        <p className="mt-3 text-[10px] text-muted-foreground/60">
          {t("analytics.last30")}
        </p>
      </Card>

      <PrayerPanel />
    </div>
  );
}
