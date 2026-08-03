import { Link } from "wouter";
import { motion } from "motion/react";
import {
  Flame,
  BookOpenText,
  Wallet,
  RotateCcw,
  CalendarDays,
  NotebookPen,
  ListChecks,
  Sparkles,
  Target,
  Timer,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { useTable, useSingleton } from "@/hooks/use-store";
import { today as todayHelper, type Row } from "@/lib/store";
import { Card, GlassCard, ProgressRing } from "@/components/ui/primitives";
import {
  PRAYERS,
  ymd,
  verseOfDay,
  formatIDR,
  PAGES_PER_JUZ,
  prayerStreak,
  last7Days,
  shortDay,
} from "@/lib/domain";
import { TOTAL_QURAN_AYAHS } from "@/lib/content/islamic";
import { useIsTantri, getTantriNickname, TANTRI_MESSAGE } from "@/lib/special-user";

/* ─── animation ─── */
const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ─── greeting helper ─── */
function greetingKey() {
  const h = new Date().getHours();
  if (h < 11) return "dash.greeting.morning" as const;
  if (h < 15) return "dash.greeting.afternoon" as const;
  if (h < 18) return "dash.greeting.evening" as const;
  return "dash.greeting.night" as const;
}

/* ─── mini bar chart (7 days) ─── */
function MiniBarChart({
  values,
  labels,
  maxVal,
  color,
}: {
  values: number[];
  labels: string[];
  maxVal: number;
  color: string;
}) {
  return (
    <div className="flex items-end gap-1.5 h-16">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all duration-500"
            style={{
              height: maxVal > 0 ? `${(v / maxVal) * 100}%` : "0%",
              minHeight: v > 0 ? 3 : 0,
              backgroundColor: color,
              opacity: 0.6 + (v / Math.max(maxVal, 1)) * 0.4,
            }}
          />
          <span className="text-[9px] text-muted-foreground/60 font-medium">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
export default function Dashboard() {
  const { t, lang } = useI18n();
  const { data: session } = authClient.useSession();
  const profile = useSingleton<Row>("userProfile");
  const hifdz = useSingleton<Row>("hifdzSettings");
  const day = todayHelper();
  const verse = verseOfDay();

  const habits = useTable<Row>("habits");
  const habitLogs = useTable<Row>("habitLogs");
  const prayerLogs = useTable<Row>("prayerLogs");
  const hifdzLogs = useTable<Row>("hifdzLogs");
  const murajaah = useTable<Row>("murajaah");
  const transactions = useTable<Row>("transactions");

  /* ─── prayer data ─── */
  const prayerToday = prayerLogs.find((p) => p.date === day);
  const prayerDone = PRAYERS.filter((k) => Number(prayerToday?.[k] ?? 0) > 0).length;
  const prayerLogMap = new Map(prayerLogs.map((p) => [String(p.date), p]));
  const pStreak = prayerStreak(prayerLogMap);

  /* ─── habit data ─── */
  const doneToday = new Set(
    habitLogs.filter((l) => l.date === day && l.done).map((l) => String(l.habitId)),
  );
  const habitDone = habits.filter((h) => doneToday.has(String(h.id))).length;

  /* ─── hifdz data ─── */
  const hifdzTodayPages = hifdzLogs
    .filter((l) => l.date === day)
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const totalPages = hifdzLogs
    .filter((l) => l.type === "new")
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const dailyTarget = Number(hifdz?.dailyPages ?? 1);
  const hifdzOn = profile?.hifdzEnabled ?? true;

  /* ─── murajaah due ─── */
  const dueCount = murajaah.filter((m) => String(m.nextDue) <= day).length;

  /* ─── finance data ─── */
  const balance = transactions.reduce(
    (s, tx) => s + (tx.type === "income" ? 1 : -1) * Number(tx.amount ?? 0),
    0,
  );
  const monthTx = transactions.filter((tx) => {
    const d = new Date(tx.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome = monthTx
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + Number(tx.amount ?? 0), 0);
  const monthExpense = monthTx
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + Number(tx.amount ?? 0), 0);

  /* ─── weekly prayer data (last 7 days) ─── */
  const days = last7Days();
  const weeklyPrayer = days.map((d) => {
    const row = prayerLogMap.get(d);
    return row ? PRAYERS.filter((k) => Number(row[k] ?? 0) > 0).length : 0;
  });
  const weeklyHabit = days.map((d) => {
    const logs = habitLogs.filter((l) => l.date === d && l.done);
    return logs.length;
  });

  /* ─── weekly motivation text ─── */
  const avgPrayer = weeklyPrayer.reduce((s, v) => s + v, 0) / 7;
  const motivationKey =
    avgPrayer >= 4.5
      ? "dash.prayersDone"
      : avgPrayer >= 3
        ? "dash.streak"
        : "dash.subtitle";

  const name = profile?.displayName || session?.user?.name || "";
  const isTantri = useIsTantri();
  const displayName = isTantri ? getTantriNickname() : name.split(" ")[0];

  return (
    <div>
      {/* ── Greeting ── */}
      <motion.div variants={fade} initial="hidden" animate="show" className="mb-6">
        <p className="text-sm font-medium text-gold-foreground">
          {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t(greetingKey())}
          {name ? `, ${displayName}` : ""}.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("dash.subtitle")}</p>
      </motion.div>

      {/* ── Verse Card ── */}
      <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="mb-5">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.04]" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-arabic text-2xl leading-[1.8] text-primary sm:text-3xl">
                {verse.ar}
              </p>
              <p className="mt-2 max-w-lg text-sm italic text-foreground/70">
                "{lang === "id" ? verse.id : verse.en}"
              </p>
            </div>
            <p className="shrink-0 text-xs font-medium text-gold-foreground">{verse.ref}</p>
          </div>
        </Card>
      </motion.div>

      {/* ══════════════════════════════════════════════════ */}
      {/* BENTO GRID                                       */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">

        {/* ── Hero Prayer Card (spans 3 cols) ── */}
        <motion.div
          variants={fade}
          custom={2}
          initial="hidden"
          animate="show"
          className="sm:col-span-2 lg:col-span-3"
        >
          <Link to="/app/salah">
            <GlassCard className="group relative h-full overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-30px_rgba(20,60,45,0.5)] [background:radial-gradient(circle_at_85%_0%,oklch(0.42_0.085_165/0.16),transparent_45%)] dark:[background:radial-gradient(circle_at_85%_0%,oklch(0.7_0.09_160/0.22),transparent_45%)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("dash.prayerProgress")}
                  </p>
                  <p className="mt-1 font-display text-4xl font-semibold">
                    {prayerDone}
                    <span className="text-lg text-muted-foreground">/5</span>
                  </p>
                </div>
                <ProgressRing value={prayerDone / 5} size={72} stroke={6}>
                  <span className="text-base font-semibold">
                    {Math.round((prayerDone / 5) * 100)}%
                  </span>
                </ProgressRing>
              </div>

              {/* Inline prayer tracker */}
              <div className="flex gap-2">
                {PRAYERS.map((k) => {
                  const done = Number(prayerToday?.[k] ?? 0) > 0;
                  return (
                    <div
                      key={k}
                      className={`flex-1 rounded-xl px-2 py-2 text-center text-xs font-medium transition-colors ${
                        done
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/60 text-muted-foreground/60"
                      }`}
                    >
                      <div className="mb-0.5">
                        {done ? (
                          <Check className="mx-auto h-3.5 w-3.5" />
                        ) : (
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-current opacity-40" />
                        )}
                      </div>
                      {t(`prayer.${k}` as any)}
                    </div>
                  );
                })}
              </div>

              {pStreak > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold-foreground">
                  <Flame className="h-3.5 w-3.5" /> {t("dash.streak")} {pStreak}{" "}
                  {t("dash.days")}
                </p>
              )}

              <ArrowRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />

              {/* Tantri-only decorative sweet icon */}
              {isTantri && (
                <span className="pointer-events-none absolute bottom-3 right-3 select-none text-3xl opacity-15" aria-hidden>
                  🧁
                </span>
              )}
            </GlassCard>
          </Link>
        </motion.div>

        {/* ── Right Column: Calendar Mini + Summary Panels ── */}
        <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-4">
          {/* Calendar Mini */}
          <motion.div variants={fade} custom={3} initial="hidden" animate="show">
            <Link to="/app/calendar">
              <Card className="group relative p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {t("cal.hijri")}
                    </p>
                    <p className="mt-0.5 font-display text-3xl font-semibold leading-tight">
                      {new Date().getDate()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                        weekday: "long",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Summary Panels Row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Habits */}
            <motion.div variants={fade} custom={4} initial="hidden" animate="show">
              <Link to="/app/habits">
                <Card className="group h-full p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="text-[10px] font-medium text-muted-foreground">{t("dash.habitProgress")}</p>
                  <p className="mt-1 font-display text-xl font-semibold">
                    {habitDone}
                    <span className="text-sm text-muted-foreground">/{habits.length || 0}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: habits.length
                          ? `${Math.round((habitDone / habits.length) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  {pStreak > 0 && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-gold-foreground">
                      <Flame className="h-3 w-3" /> {pStreak}
                    </p>
                  )}
                </Card>
              </Link>
            </motion.div>

            {/* Hifdz */}
            {hifdzOn && (
              <motion.div variants={fade} custom={5} initial="hidden" animate="show">
                <Link to="/app/hifz">
                  <Card className="group h-full p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <BookOpenText className="h-3 w-3" /> {t("dash.hifdzToday")}
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold">
                      {hifdzTodayPages}
                      <span className="text-sm text-muted-foreground">
                        /{dailyTarget}
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: dailyTarget
                            ? `${Math.min(Math.round((hifdzTodayPages / dailyTarget) * 100), 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                      {Math.round((totalPages / TOTAL_QURAN_AYAHS) * 100)}% {t("dash.verse").split(" ").pop()}
                    </p>
                  </Card>
                </Link>
              </motion.div>
            )}

            {/* Finance */}
            <motion.div variants={fade} custom={6} initial="hidden" animate="show">
              <Link to="/app/finance">
                <Card className="group h-full p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {t("dash.finance.balance")}
                  </p>
                  <p className="mt-1 truncate font-display text-xl font-semibold">
                    {formatIDR(balance)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-2.5 w-2.5" />
                      {formatIDR(monthIncome)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-500">
                      <TrendingDown className="h-2.5 w-2.5" />
                      {formatIDR(monthExpense)}
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Tantri Personal Message ── */}
      {isTantri && (
        <motion.div variants={fade} custom={0.5} initial="hidden" animate="show" className="mb-5">
          <Card className="border-primary/20 bg-primary/5 p-4">
            <p className="text-sm leading-relaxed text-foreground/80">{TANTRI_MESSAGE}</p>
          </Card>
        </motion.div>
      )}

      {/* ── Shortcuts Row ── */}
      <motion.div variants={fade} custom={7} initial="hidden" animate="show" className="mt-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {t("dash.shortcuts")}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {[
            { to: "/app/notes", icon: NotebookPen, label: "nav.notes" as const, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
            { to: "/app/journal", icon: Sparkles, label: "nav.journal" as const, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
            { to: "/app/khatma", icon: BookOpenText, label: "nav.khatma" as const, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
            { to: "/app/duas", icon: Sparkles, label: "nav.duas" as const, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
            { to: "/app/goals", icon: Target, label: "nav.goals" as const, color: "bg-rose-500/10 text-rose-500 dark:text-rose-300" },
            { to: "/app/focus", icon: Timer, label: "nav.focus" as const, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}>
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md whitespace-nowrap">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {t(item.label)}
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ── Weekly Insight ── */}
      <motion.div variants={fade} custom={8} initial="hidden" animate="show" className="mt-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">{t("dash.weeklyInsight")}</p>
            <Link
              to="/app/analytics"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("dash.viewAll")}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Prayer bars */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {t("dash.prayerProgress")}
              </p>
              <MiniBarChart
                values={weeklyPrayer}
                labels={days.map((d) => shortDay(d, lang))}
                maxVal={5}
                color="oklch(0.42 0.085 165)"
              />
            </div>
            {/* Habit bars */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {t("dash.habitProgress")}
              </p>
              <MiniBarChart
                values={weeklyHabit}
                labels={days.map((d) => shortDay(d, lang))}
                maxVal={Math.max(...weeklyHabit, habits.length, 1)}
                color="oklch(0.74 0.11 78)"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <span className="sr-only">{ymd(new Date())}</span>
    </div>
  );
}
