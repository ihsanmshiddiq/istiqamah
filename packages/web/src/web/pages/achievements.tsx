import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import * as Icons from "lucide-react";
import { Lock, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/primitives";
import { ACHIEVEMENTS, TIER_STYLES, type Achievement } from "@/lib/content/islamic";
import { PRAYERS, addDays, ymd } from "@/lib/domain";
import { cn } from "@/lib/utils";

function AchIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Award;
  return <Cmp className={className} />;
}

// achievements we can actually track (dhikr feature was cut)
const TRACKABLE = ACHIEVEMENTS.filter((a) => a.category !== "dhikr");

export default function Achievements() {
  const { t } = useI18n();
  const prayerLogs = useTable<Row>("prayerLogs");
  const habitLogs = useTable<Row>("habitLogs");
  const quranLogs = useTable<Row>("quranLogs");
  const journalEntries = useTable<Row>("journalEntries");
  const unlockedRows = useTable<Row>("achievements");

  const metrics = useMemo(() => {
    // prayer: total individual prayers done + consecutive full-day streak
    let prayersDone = 0;
    const fullDays = new Set<string>();
    const fajrDays = new Set<string>();
    for (const l of prayerLogs) {
      let full = 0;
      for (const p of PRAYERS) {
        const v = Number((l as Row)[p] ?? 0);
        if (v >= 1) prayersDone++;
        if (v >= 1) full++;
      }
      if (full === 5) fullDays.add(String(l.date));
      if (Number((l as Row).fajr ?? 0) >= 1) fajrDays.add(String(l.date));
    }
    const streakOf = (days: Set<string>): number => {
      let best = 0, cur = 0;
      const today = ymd(new Date());
      let d = today;
      // walk back up to 400 days
      for (let i = 0; i < 400; i++) {
        if (days.has(d)) { cur++; best = Math.max(best, cur); } else { cur = 0; }
        d = addDays(d, -1);
      }
      return best;
    };
    const fullStreak = streakOf(fullDays);
    const fajrStreak = streakOf(fajrDays);

    const quranPages = quranLogs.reduce((s, l) => s + Number((l as Row).pagesRead ?? 0), 0);
    const habitCheckins = habitLogs.filter((l) => l.done).length;
    const journalCount = journalEntries.length;

    return {
      "first-prayer": prayersDone,
      "prayer-7": fullStreak,
      "prayer-30": fullStreak,
      "prayer-100": fullStreak,
      "quran-first": quranPages,
      "quran-60": quranPages,
      "quran-300": quranPages,
      "quran-604": quranPages,
      "habit-7": habitCheckins,
      "habit-30": habitCheckins,
      "habit-100": habitCheckins,
      "journal-7": journalCount,
      "journal-30": journalCount,
      "perfect-day": fullDays.size,
      "perfect-week": fullStreak,
      "early-riser": fajrStreak,
    } as Record<string, number>;
  }, [prayerLogs, habitLogs, quranLogs, journalEntries]);

  const unlockedSet = useMemo(
    () => new Set(unlockedRows.map((r) => String((r as Row).achievementId))),
    [unlockedRows],
  );

  const current = (a: Achievement) => metrics[a.id] ?? 0;
  const isUnlocked = (a: Achievement) => current(a) >= a.goal;

  // persist newly unlocked
  useEffect(() => {
    for (const a of TRACKABLE) {
      if (isUnlocked(a) && !unlockedSet.has(a.id)) {
        void upsert("achievements", { id: a.id, achievementId: a.id, unlockedAt: Date.now() });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, unlockedSet]);

  const unlockedCount = TRACKABLE.filter(isUnlocked).length;
  const pct = Math.round((unlockedCount / TRACKABLE.length) * 100);

  return (
    <div>
      <PageHeader title={t("achievements.title")} subtitle={t("achievements.subtitle")} />

      <Card className="relative mb-6 overflow-hidden p-6">
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div className="relative flex items-center gap-5">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gold/15">
            <Trophy className="h-8 w-8 text-gold-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-display text-2xl font-bold">{unlockedCount} / {TRACKABLE.length}</p>
            <p className="text-sm text-muted-foreground">{t("achievements.unlocked")}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKABLE.map((a, i) => {
          const cur = Math.min(current(a), a.goal);
          const unlocked = isUnlocked(a);
          const tier = TIER_STYLES[a.tier];
          const prog = Math.round((cur / a.goal) * 100);
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}>
              <Card className={cn("flex h-full flex-col gap-3 p-5 transition", unlocked ? tier.glow : "opacity-80")}>
                <div className="flex items-center justify-between">
                  <span className={cn("grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br", tier.ring)}>
                    {unlocked
                      ? <AchIcon name={a.icon} className={cn("h-6 w-6", tier.text)} />
                      : <Lock className="h-5 w-5 text-muted-foreground" />}
                  </span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tier.text)}>{tier.label}</span>
                </div>
                <div>
                  <h3 className="font-display font-semibold leading-snug">{a.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
                </div>
                <div className="mt-auto">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{cur} / {a.goal} {a.unit}</span>
                    <span>{prog}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", unlocked ? "bg-gold" : "bg-primary/50")} style={{ width: `${prog}%` }} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
