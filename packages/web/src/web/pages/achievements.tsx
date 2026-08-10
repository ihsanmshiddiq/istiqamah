import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Trophy, Star, X, PartyPopper } from "lucide-react";
import { getIconByName } from "@/lib/icon-map";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/primitives";
import { ACHIEVEMENTS, TIER_STYLES, type Achievement } from "@/lib/content/islamic";
import { PRAYERS, addDays, ymd } from "@/lib/domain";
import { cn } from "@/lib/utils";

function AchIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = getIconByName(name);
  return <Cmp className={className} />;
}

// achievements we can actually track (dhikr feature was cut)
const TRACKABLE = ACHIEVEMENTS.filter((a) => a.category !== "dhikr");

/* ── Confetti particle component ── */
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const x = Math.random() * 300 - 150;
  const rotation = Math.random() * 720 - 360;
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ backgroundColor: color, left: "50%", top: "50%" }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        x: x,
        y: -(100 + Math.random() * 150),
        opacity: [1, 1, 0],
        scale: [1, 1.2, 0.5],
        rotate: rotation,
      }}
      transition={{ duration: 1.2 + Math.random() * 0.5, delay, ease: "easeOut" }}
    />
  );
}

/* ── Tier-based confetti counts ── */
const TIER_CONFETTI: Record<string, number> = {
  bronze: 16,
  silver: 24,
  gold: 36,
  platinum: 48,
};

/* ── Celebration Modal ── */
function CelebrationModal({
  achievement,
  onClose,
}: {
  achievement: Achievement | null;
  onClose: () => void;
}) {
  if (!achievement) return null;
  const tier = TIER_STYLES[achievement.tier];
  const confettiColors = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#ec4899", "#06b6d4", "#f97316"];
  const confettiCount = TIER_CONFETTI[achievement.tier] ?? 24;
  const isPlatinum = achievement.tier === "platinum";
  const isGold = achievement.tier === "gold";

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl"
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
          >
            {/* Confetti */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              {Array.from({ length: confettiCount }).map((_, i) => (
                <ConfettiParticle
                  key={i}
                  delay={0.1 + i * 0.03}
                  color={confettiColors[i % confettiColors.length]}
                />
              ))}
            </div>

            {/* Glow ring */}
            <motion.div
              className={cn(
                "mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br",
                tier.ring,
                isPlatinum && "animate-pulse",
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 150, delay: 0.2 }}
            >
              <AchIcon name={achievement.icon} className={cn("h-12 w-12", tier.text)} />
            </motion.div>

            {/* Stars */}
            <motion.div
              className="flex justify-center gap-1 mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {Array.from({ length: achievement.tier === "platinum" ? 4 : achievement.tier === "gold" ? 3 : achievement.tier === "silver" ? 2 : 1 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 300 }}
                >
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </motion.div>
              ))}
            </motion.div>

            {/* Badge */}
            <motion.div
              className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide mb-3", tier.text)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <PartyPopper className="h-3 w-3" />
              {tier.label} Achievement
            </motion.div>

            {/* Title */}
            <motion.h2
              className="font-display text-2xl font-bold mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {achievement.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              className="text-sm text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {achievement.description}
            </motion.p>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              className={cn(
                "w-full h-11 rounded-xl font-medium text-white transition-colors",
                `bg-gradient-to-r ${tier.ring}`,
                isPlatinum && "shadow-lg shadow-amber-500/25",
                isGold && "shadow-md shadow-amber-500/20",
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isPlatinum ? "MashaAllah! 🌟🎉" : isGold ? "Mantap! 🎉" : "Keren! 💪"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Achievements() {
  const { t } = useI18n();
  const prayerLogs = useTable<Row>("prayerLogs");
  const habitLogs = useTable<Row>("habitLogs");
  const quranLogs = useTable<Row>("quranLogs");
  const journalEntries = useTable<Row>("journalEntries");
  const unlockedRows = useTable<Row>("achievements");

  const [celebrating, setCelebrating] = useState<Achievement | null>(null);
  const [seenAchievements, setSeenAchievements] = useState<Set<string>>(new Set());

  const metrics = useMemo(() => {
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

  // persist newly unlocked + trigger celebration
  useEffect(() => {
    for (const a of TRACKABLE) {
      if (isUnlocked(a) && !unlockedSet.has(a.id)) {
        void upsert("achievements", { id: a.id, achievementId: a.id, unlockedAt: Date.now() });
        // Show celebration if not yet seen in this session
        if (!seenAchievements.has(a.id)) {
          setSeenAchievements((prev) => new Set(prev).add(a.id));
          setCelebrating(a);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, unlockedSet]);

  const unlockedCount = TRACKABLE.filter(isUnlocked).length;
  const pct = Math.round((unlockedCount / TRACKABLE.length) * 100);

  const viewDetail = useCallback((a: Achievement) => {
    if (isUnlocked(a)) {
      setCelebrating(a);
    }
  }, [isUnlocked]);

  return (
    <div>
      <PageHeader title={t("achievements.title")} subtitle={t("achievements.subtitle")} />

      {/* Hero card */}
      <Card className="relative mb-6 overflow-hidden p-6">
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div className="relative flex items-center gap-5">
          <motion.div
            className="grid h-16 w-16 place-items-center rounded-2xl bg-gold/15"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Trophy className="h-8 w-8 text-gold-foreground" />
          </motion.div>
          <div className="flex-1">
            <p className="font-display text-2xl font-bold">{unlockedCount} / {TRACKABLE.length}</p>
            <p className="text-sm text-muted-foreground">{t("achievements.unlocked")}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Achievement grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKABLE.map((a, i) => {
          const cur = Math.min(current(a), a.goal);
          const unlocked = isUnlocked(a);
          const tier = TIER_STYLES[a.tier];
          const prog = Math.round((cur / a.goal) * 100);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
            >
              <button
                onClick={() => viewDetail(a)}
                className={cn(
                  "flex h-full w-full flex-col gap-3 p-5 text-left transition rounded-xl border",
                  unlocked
                    ? cn("border-transparent", tier.glow, "hover:shadow-lg cursor-pointer")
                    : "border-border opacity-70 cursor-default",
                )}
              >
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
                    <div className={cn("h-full rounded-full transition-all duration-500", unlocked ? "bg-gold" : "bg-primary/50")} style={{ width: `${prog}%` }} />
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Celebration Modal */}
      <CelebrationModal achievement={celebrating} onClose={() => setCelebrating(null)} />
    </div>
  );
}
