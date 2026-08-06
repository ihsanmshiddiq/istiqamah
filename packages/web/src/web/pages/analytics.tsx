import { useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, Moon, Repeat, BookOpen, NotebookPen, Activity } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/primitives";
import { ymd, parseYmd, PRAYERS } from "@/lib/domain";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { cn } from "@/lib/utils";

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(ymd(d));
  }
  return out;
}

export default function Analytics() {
  const { t, lang } = useI18n();
  const prayerLogs = useTable<Row>("prayerLogs");
  const habits = useTable<Row>("habits", (r) => r.filter((h) => !h.archived));
  const habitLogs = useTable<Row>("habitLogs");
  const quranLogs = useTable<Row>("quranLogs");
  const journal = useTable<Row>("journalEntries");

  const days30 = useMemo(() => lastNDays(30), []);
  const days14 = useMemo(() => lastNDays(14), []);

  // ---- prayer completion (30d) ----
  const prayerMap = useMemo(() => new Map(prayerLogs.map((l) => [String(l.date), l])), [prayerLogs]);
  const prayerSeries = useMemo(
    () =>
      days30.map((d) => {
        const log = prayerMap.get(d);
        const done = log ? PRAYERS.reduce((s, p) => s + (Number(log[p] ?? 0) > 0 ? 1 : 0), 0) : 0;
        return { date: d, value: done / 5 };
      }),
    [days30, prayerMap],
  );
  const prayerRate = avg(prayerSeries.map((s) => s.value));

  // ---- per-prayer breakdown (30d) ----
  const prayerBreakdown = useMemo(
    () =>
      PRAYERS.map((p) => {
        let done = 0;
        for (const d of days30) {
          const log = prayerMap.get(d);
          if (log && Number(log[p] ?? 0) > 0) done++;
        }
        return { key: p, value: done / days30.length };
      }),
    [days30, prayerMap],
  );

  // ---- habit consistency (14d) ----
  const habitDone = useMemo(() => {
    const set = new Set(habitLogs.filter((l) => l.done).map((l) => `${l.habitId}:${l.date}`));
    return set;
  }, [habitLogs]);
  const habitSeries = useMemo(
    () =>
      days14.map((d) => {
        const total = habits.length || 1;
        const done = habits.reduce((s, h) => s + (habitDone.has(`${h.id}:${d}`) ? 1 : 0), 0);
        return { date: d, value: habits.length ? done / total : 0 };
      }),
    [days14, habits, habitDone],
  );
  const habitRate = avg(habitSeries.map((s) => s.value));

  // ---- quran pages (30d) ----
  const quranMap = useMemo(() => new Map(quranLogs.map((l) => [String(l.date), Number(l.pagesRead ?? 0)])), [quranLogs]);
  const quranSeries = useMemo(() => days30.map((d) => ({ date: d, value: quranMap.get(d) ?? 0 })), [days30, quranMap]);
  const quranTotal = quranSeries.reduce((s, x) => s + x.value, 0);

  // ---- journal (30d) ----
  const journalDays = useMemo(() => new Set(journal.map((j) => String(j.date))), [journal]);
  const journalCount = days30.filter((d) => journalDays.has(d)).length;

  // ---- heatmap: combined activity across all modules (90d) ----
  const heatmapData = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const l of prayerLogs) {
      const d = String(l.date);
      const done = PRAYERS.filter((p) => Number((l as Row)[p] ?? 0) > 0).length;
      if (done > 0) dayMap.set(d, (dayMap.get(d) ?? 0) + done);
    }
    for (const l of habitLogs) {
      if (l.done) {
        const d = String(l.date);
        dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      }
    }
    for (const l of quranLogs) {
      const d = String(l.date);
      const pages = Number((l as Row).pagesRead ?? 0);
      if (pages > 0) dayMap.set(d, (dayMap.get(d) ?? 0) + pages);
    }
    const out: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      out.push({ date: dStr, value: dayMap.get(dStr) ?? 0 });
    }
    return out;
  }, [prayerLogs, habitLogs, quranLogs]);

  const hasData = prayerLogs.length + habitLogs.length + quranLogs.length + journal.length > 0;

  return (
    <div>
      <PageHeader title={t("analytics.title")} subtitle={t("analytics.subtitle")} />

      {!hasData ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">{t("analytics.noData")}</Card>
      ) : (
        <div className="space-y-6">
          {/* stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Moon} label={t("analytics.prayerRate")} value={`${Math.round(prayerRate * 100)}%`} sub={t("analytics.last30")} accent="text-emerald-500" />
            <Stat icon={Repeat} label={t("analytics.habitRate")} value={`${Math.round(habitRate * 100)}%`} sub={lang === "id" ? "14 hari" : "14 days"} accent="text-sky-500" />
            <Stat icon={BookOpen} label={t("analytics.quranPages")} value={quranTotal} sub={t("analytics.last30")} accent="text-primary" />
            <Stat icon={NotebookPen} label={t("nav.journal")} value={`${journalCount}/30`} sub={t("analytics.last30")} accent="text-amber-500" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* prayer completion line */}
            <ChartCard title={t("analytics.prayerRate")} sub={t("analytics.last30")} icon={TrendingUp}>
              <LineChart data={prayerSeries.map((s) => s.value)} color="rgb(16 185 129)" percent />
            </ChartCard>

            {/* quran pages bars */}
            <ChartCard title={t("analytics.quranPages")} sub={t("analytics.last30")} icon={BookOpen}>
              <BarMini data={quranSeries.map((s) => s.value)} color="var(--color-primary, #7c6f5b)" />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* per-prayer breakdown */}
            <ChartCard title={t("analytics.prayerRate")} sub={lang === "id" ? "Per sholat (30 hari)" : "Per prayer (30 days)"} icon={Moon}>
              <div className="space-y-3 pt-1">
                {prayerBreakdown.map((p) => (
                  <div key={p.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{p.key}</span>
                      <span className="font-medium tabular-nums">{Math.round(p.value * 100)}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${p.value * 100}%` }} transition={{ duration: 0.6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* habit consistency bars 14d */}
            <ChartCard title={t("analytics.habitRate")} sub={lang === "id" ? "14 hari terakhir" : "Last 14 days"} icon={Repeat}>
              <div className="flex h-40 items-end justify-between gap-1.5">
                {habitSeries.map((h) => (
                  <div key={h.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 items-end">
                      <motion.div
                        className={cn("w-full rounded-t-sm", h.value > 0 ? "bg-sky-500" : "bg-muted")}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, h.value * 100)}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ minHeight: 4 }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{parseYmd(h.date).getDate()}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* 90-day heatmap */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-display text-base font-semibold leading-none">Konsistensi 90 Hari</h3>
                <p className="mt-1 text-xs text-muted-foreground">Aktivitas gabungan (sholat, habit, Qur'an)</p>
              </div>
            </div>
            <ConsistencyHeatmap data={heatmapData} color="emerald" weeks={13} showLegend interactive />
          </Card>
        </div>
      )}
    </div>
  );
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
}

function Stat({ icon: Icon, label, value, sub, accent }: { icon: typeof Moon; label: string; value: number | string; sub: string; accent: string }) {
  return (
    <Card className="p-4">
      <Icon className={cn("mb-2 h-5 w-5", accent)} />
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function ChartCard({ title, sub, icon: Icon, children }: { title: string; sub: string; icon: typeof Moon; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="font-display text-base font-semibold leading-none">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function LineChart({ data, color, percent }: { data: number[]; color: string; percent?: boolean }) {
  const w = 320, h = 120, pad = 6;
  const max = percent ? 1 : Math.max(1, ...data);
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(1, n - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill="url(#lc-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9 }}
      />
    </svg>
  );
}

function BarMini({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-32 items-end justify-between gap-[3px]">
      {data.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{ background: v > 0 ? color : "var(--muted, #e5e5e5)", minHeight: 3 }}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(3, (v / max) * 100)}%` }}
          transition={{ duration: 0.5, delay: i * 0.01 }}
        />
      ))}
    </div>
  );
}
