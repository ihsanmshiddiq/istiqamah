import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable, useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { BookOpenText } from "lucide-react";
import { HifdzPanel } from "./ibadah";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { ymd } from "@/lib/domain";

export default function Hifz() {
  const { t } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const hifdzOn = profile?.hifdzEnabled ?? true;
  const hifdzLogs = useTable<Row>("hifdzLogs");

  /* ─── heatmap data: last 12 weeks of daily pages read ─── */
  const heatmapData = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const l of hifdzLogs) {
      const dStr = String(l.date);
      dayMap.set(dStr, (dayMap.get(dStr) ?? 0) + Number(l.pages ?? 0));
    }
    const out: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      out.push({ date: dStr, value: dayMap.get(dStr) ?? 0 });
    }
    return out;
  }, [hifdzLogs]);

  /* ─── streak: consecutive days with pages > 0 ─── */
  const streak = useMemo(() => {
    const doneDates = new Set(
      hifdzLogs
        .filter((l) => Number(l.pages ?? 0) > 0)
        .map((l) => String(l.date)),
    );
    let cur = 0;
    const d = new Date();
    let dStr = ymd(d);
    if (!doneDates.has(dStr)) {
      d.setDate(d.getDate() - 1);
      dStr = ymd(d);
    }
    for (let i = 0; i < 400; i++) {
      if (doneDates.has(dStr)) {
        cur++;
        d.setDate(d.getDate() - 1);
        dStr = ymd(d);
      } else break;
    }
    return cur;
  }, [hifdzLogs]);

  return (
    <div>
      <PageHeader title={t("hifdz.title")} subtitle={t("hifdz.subtitle")} />

      {hifdzOn ? (
        <>
          {/* Streak badge + heatmap */}
          <Card className="mb-6 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{t("dash.section.hifz")}</h3>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Flame className="h-3.5 w-3.5" />
                  {streak} {t("dash.days")}
                </span>
              )}
            </div>
            <ConsistencyHeatmap data={heatmapData} color="violet" weeks={12} />
            <p className="mt-3 text-[10px] text-muted-foreground/60">
              {t("analytics.last30")}
            </p>
          </Card>

          <HifdzPanel />
        </>
      ) : (
        <EmptyState icon={<BookOpenText className="h-8 w-8" />} title={t("hifdz.disabled")} />
      )}
    </div>
  );
}
