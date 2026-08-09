import { useMemo, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "motion/react";
import {
  Flame,
  BookOpenText,
  CalendarDays,
  NotebookPen,
  Sparkles,
  Target,
  Timer,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Check,
  ChevronRight,
  Activity,
  Clock,
  BookOpen,
  Quote,
  BookMarked,
  RefreshCw,
  ScrollText,
  ChevronLeft,
  PenLine,
  Heart,
  BarChart3,
  Crown,
  Trophy,
  Lock,
  PenLine as PenLineIcon,
  Save,
  AlertCircle,
  RotateCcw,
  CheckCircle,
  Loader,
  Play,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { useTable, useSingleton } from "@/hooks/use-store";
import { upsert, uid, today as todayHelper, type Row } from "@/lib/store";
import { Card, GlassCard, ProgressRing } from "@/components/ui/primitives";
import {
  PRAYERS,
  ymd,
  parseYmd,
  verseOfDay,
  formatIDR,
  prayerStreak,
  last7Days,
  shortDay,
} from "@/lib/domain";
import {
  computePrayerTimes,
  getNextPrayer,
  formatCountdown,
  formatTimeInZone,
  localTimezoneHours,
  TOTAL_QURAN_AYAHS,
  getHadithOfTheDay,
  HADITHS_OF_THE_DAY,
  getScholarQuoteOfTheDay,
  SCHOLAR_QUOTES,
  getHijriDate,
  ACHIEVEMENTS,
  TIER_STYLES,
  SURAHS,
  PRAYER_AR,
} from "@/lib/content/islamic";
import { SparklineChart } from "@/components/shared/sparkline-chart";
import { IslamicGeometricPattern } from "@/components/shared/islamic-pattern";
import { SpotlightCard } from "@/components/spotlight-card";
import { useNow } from "@/hooks/use-now";
import { usePersona } from "@/lib/persona";
import { cn } from "@/lib/utils";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";

// ─── Animations ───
const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// ─── Greeting helper ───
function greetingKey() {
  const h = new Date().getHours();
  if (h < 11) return "dash.greeting.morning" as const;
  if (h < 15) return "dash.greeting.afternoon" as const;
  if (h < 18) return "dash.greeting.evening" as const;
  return "dash.greeting.night" as const;
}

function getWarmGreeting(t: (key: string) => string): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return t(`dash.warm.${dayOfYear % 10}`);
}

// ─── SectionHeader ───
function SectionHeader({
  eyebrow,
  title,
  action,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/75">
          {eyebrow}
        </p>
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      {action && actionHref && (
        <Link
          to={actionHref}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {action} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── MiniBarChart (7 days) ───
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

// ─── Helper: get Monday-Sunday of current week ───
function getWeekDays(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const SHORT_DAYS_ID = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

// ─── Hadith of the Day Widget ───
const HADITH_ID: Record<number, string> = {
  1: "Amal dinilai berdasarkan niat, dan setiap orang mendapatkan sesuai yang ia niatkan.",
  2: "Siapa yang beriman kepada Allah dan hari akhir, hendaklah berkata baik atau diam.",
  3: "Tidak sempurna iman seseorang sampai ia mencintai saudaranya seperti mencintai dirinya sendiri.",
  4: "Seorang Muslim adalah orang yang kaum Muslimin selamat dari lisan dan tangannya.",
  5: "Agama adalah nasihat yang tulus.",
  6: "Siapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan menuju surga.",
  7: "Senyummu kepada saudaramu adalah sedekah.",
  8: "Sedekah tidak mengurangi harta.",
  9: "Kebersihan adalah sebagian dari iman.",
  10: "Siapa yang tidak menyayangi manusia, Allah tidak menyayanginya.",
  11: "Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya.",
  12: "Shalat adalah cahaya.",
  13: "Siapa yang menegakkan shalat Ramadan karena iman dan mengharap pahala, diampuni dosa-dosanya yang telah lalu.",
  14: "Di antara tanda baiknya Islam seseorang adalah meninggalkan hal yang tidak bermanfaat baginya.",
  15: "Bersungguh-sungguhlah pada hal yang bermanfaat bagimu, mohon pertolongan Allah, dan jangan merasa lemah.",
};

function HadithOfTheDay() {
  const now = useNow(60_000);
  const { t } = useI18n();
  const todays = useMemo(() => {
    const d = now ? new Date(now.getTime()) : new Date();
    return getHadithOfTheDay(d);
  }, [now]);
  const [current, setCurrent] = useState(todays);
  const [index, setIndex] = useState(() => HADITHS_OF_THE_DAY.findIndex((h) => h.id === todays.id));

  const shuffle = useCallback(() => {
    const nextIdx = (index + 1) % HADITHS_OF_THE_DAY.length;
    setIndex(nextIdx);
    setCurrent(HADITHS_OF_THE_DAY[nextIdx]);
  }, [index]);

  const indonesianText = HADITH_ID[current.id] ?? current.english;

  const themeLabel = (() => {
    switch (current.theme) {
      case "Character": return t("dash.hadith.theme.character");
      case "Speech": return t("dash.hadith.theme.speech");
      case "Intention": return t("dash.hadith.theme.intention");
      case "Knowledge": return t("dash.hadith.theme.knowledge");
      case "Kindness": return t("dash.hadith.theme.kindness");
      case "Charity": return t("dash.hadith.theme.charity");
      case "Purity": return t("dash.hadith.theme.purity");
      case "Mercy": return t("dash.hadith.theme.mercy");
      case "Quran": return t("dash.hadith.theme.quran");
      case "Prayer": return t("dash.hadith.theme.prayer");
      case "Ramadan": return t("dash.hadith.theme.ramadan");
      case "Discipline": return t("dash.hadith.theme.discipline");
      case "Striving": return t("dash.hadith.theme.striving");
      case "Brotherhood": return t("dash.hadith.theme.brotherhood");
      case "Sincerity": return t("dash.hadith.theme.sincerity");
      case "Brother": return t("dash.hadith.theme.brother");
      default: return current.theme;
    }
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px 320px at 100% -10%, rgba(16,185,129,0.14), transparent 60%), radial-gradient(700px 280px at -10% 110%, rgba(245,158,11,0.12), transparent 60%)",
        }}
      />
      <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <BookMarked className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                {t("dash.hadith.title")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                {themeLabel}
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                  {current.grade}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={shuffle}
            className="group flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background hover:border-primary/30 transition-all"
            title={t("dash.hadith.theme.next")}
          >
            <RefreshCw className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
          <div className="md:order-1 md:border-r md:border-border/60 md:pr-8">
            <Quote className="h-6 w-6 text-primary/40 mb-2" />
            <p className="text-[15px] sm:text-base text-foreground/85 italic leading-relaxed">
              &ldquo;{indonesianText}&rdquo;
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-2 py-1 ring-1 ring-primary/15">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="font-medium text-foreground/80">{current.narrator}</span>
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span>{current.source}</span>
            </div>
          </div>
          <div className="md:order-2 md:text-right">
            <p className="text-2xl sm:text-3xl leading-[2.1] text-foreground" dir="rtl" style={{ fontFamily: "var(--font-arabic, serif)" }}>
              {current.arabic}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {HADITHS_OF_THE_DAY.map((h, i) => (
              <button
                key={h.id}
                onClick={() => {
                  setIndex(i);
                  setCurrent(HADITHS_OF_THE_DAY[i]);
                }}
                className="group/dot py-1.5"
              >
                <span
                  className={
                    i === index
                      ? "block h-1.5 w-5 rounded-full bg-primary transition-all"
                      : "block h-1.5 w-1.5 rounded-full bg-muted-foreground/30 group-hover/dot:bg-muted-foreground/60 transition-all"
                  }
                />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {index + 1} <span className="opacity-60">/</span> {HADITHS_OF_THE_DAY.length}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

// ─── Scholar Quote of the Day Widget ───
const HIKMAH_ID: Record<number, string> = {
  1: "Orang bijak adalah yang menghisab dirinya dan beramal untuk kehidupan setelah kematian.",
  2: "Ilmu bukanlah apa yang dihafal; ilmu adalah apa yang memberi manfaat.",
  3: "Siapa yang tidak merenungkan keagungan Tuhannya akan meremehkan perintah-Nya.",
  4: "Tingkat ilmu tertinggi adalah berkata, 'Aku tidak tahu' ketika memang tidak tahu.",
  5: "Keikhlasan adalah rahasia antara Allah dan hamba, yang bahkan tidak ditulis oleh para malaikat.",
  6: "Sabar memiliki dua bagian: setengahnya iman dan setengahnya kesabaran.",
  7: "Kesempurnaan Islam seseorang adalah meninggalkan hal yang tidak menjadi urusannya.",
  8: "Siapa yang mengenal dirinya, ia mengenal Tuhannya.",
  9: "Jangan melihat kecilnya dosa, tetapi lihatlah keagungan Zat yang kamu durhakai.",
  10: "Ilmu menghidupkan hati, mengusir rasa lapar, dan menemani tubuh dalam kesendirian.",
  11: "Waspadalah terhadap dosa kecil; ia dapat terkumpul hingga menjadi besar.",
  12: "Siapa yang ingin menjadi manusia paling mulia, hendaklah ia bertakwa kepada Allah.",
};

function ScholarQuoteOfTheDay() {
  const now = useNow(60_000);
  const { t } = useI18n();
  const todays = useMemo(() => {
    const d = now ? new Date(now.getTime()) : new Date();
    return getScholarQuoteOfTheDay(d);
  }, [now]);
  const [index, setIndex] = useState(() => SCHOLAR_QUOTES.findIndex((q) => q.id === todays.id));
  const [current, setCurrent] = useState(todays);

  const next = useCallback(() => {
    const i = (index + 1) % SCHOLAR_QUOTES.length;
    setIndex(i);
    setCurrent(SCHOLAR_QUOTES[i]);
  }, [index]);

  const indonesianText = HIKMAH_ID[current.id] ?? current.text;

  return (
    <motion.button
      onClick={next}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      whileHover={{ y: -2 }}
      className="group relative w-full overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-7 text-left shadow-sm transition-colors hover:border-border"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none transition-opacity group-hover:opacity-70"
        style={{
          background:
            "radial-gradient(560px 220px at 100% -20%, rgba(245,158,11,0.10), transparent 60%), radial-gradient(420px 200px at -10% 120%, rgba(16,185,129,0.08), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600/80 dark:text-amber-400/80">
            {t("dash.scholar.title")}
          </p>
        </div>
        <div>
          <Quote className="h-5 w-5 text-amber-500/40 mb-2" />
          <p className="text-[15px] sm:text-base text-foreground/90 italic leading-relaxed">
            {indonesianText}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-foreground/80">— {current.author}</p>
              <p className="text-[11px] text-muted-foreground">
                {current.era}
                {current.context ? <span className="opacity-70"> · {current.context}</span> : null}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <span>{t("dash.scholar.next")}</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-1">
          {SCHOLAR_QUOTES.map((q, i) => (
            <span
              key={q.id}
              className={
                i === index
                  ? "h-1 w-4 rounded-full bg-amber-500 transition-all"
                  : "h-1 w-1 rounded-full bg-muted-foreground/30 transition-all"
              }
            />
          ))}
        </div>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════
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
  const quranLogs = useTable<Row>("quranLogs");
  const journalEntries = useTable<Row>("journalEntries");
  const goals = useTable<Row>("goals");
  const focusSessions = useTable<Row>("focusSessions");
  const khatmaPlans = useTable<Row>("khatmaPlans");
  const calendarEvents = useTable<Row>("calendarEvents");
  const achievementRows = useTable<Row>("achievements");

  // ─── Prayer data ───
  const prayerLogMap = useMemo(() => new Map(prayerLogs.map((p) => [String(p.date), p])), [prayerLogs]);
  const pStreak = prayerStreak(prayerLogMap);

  // ─── Day-picker state ───
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDay = ymd(selectedDate);
  const isToday = selectedDay === day;
  const prayerSelected = prayerLogs.find((p) => p.date === selectedDay);
  const prayerDone = PRAYERS.filter((k) => Number(prayerSelected?.[k] ?? 0) > 0).length;

  const weekDays = getWeekDays();

  function goToPrevDay() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  }
  function goToToday() {
    setSelectedDate(new Date());
  }

  // ─── Habit data ───
  const doneToday = useMemo(
    () => new Set(habitLogs.filter((l) => l.date === day && l.done).map((l) => String(l.habitId))),
    [habitLogs, day],
  );
  const habitDone = habits.filter((h) => doneToday.has(String(h.id))).length;

  // ─── Hifdz data ───
  const hifdzTodayPages = hifdzLogs
    .filter((l) => l.date === day)
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const totalPages = hifdzLogs
    .filter((l) => l.type === "new")
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const dailyTarget = Number(hifdz?.dailyPages ?? 1);
  const hifdzOn = profile?.hifdzEnabled ?? true;

  // ─── Finance data ───
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

  // ─── Weekly prayer data (last 7 days) ───
  const days = last7Days();
  const weeklyPrayer = useMemo(() =>
    days.map((d) => {
      const row = prayerLogMap.get(d);
      return row ? PRAYERS.filter((k) => Number(row[k] ?? 0) > 0).length : 0;
    }), [days, prayerLogMap]);
  const weeklyHabit = useMemo(() =>
    days.map((d) => {
      const logs = habitLogs.filter((l) => l.date === d && l.done);
      return logs.length;
    }), [days, habitLogs]);

  const name = profile?.displayName || session?.user?.name || "";
  const persona = usePersona();
  const isTantri = persona === "tantri";
  const displayName = useMemo(() => {
    if (isTantri) {
      const now = new Date();
      const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const key = `tantri-greeting-nickname:${day}`;
      const saved = sessionStorage.getItem(key);
      const nicknames = ["Bayi Tercinta", "Manusia Favorit", "Orang Hebat", "Nona Keju", "Smurf Anti Pedas"];
      if (saved && nicknames.includes(saved)) return saved;
      const nickname = nicknames[Math.floor(Math.random() * nicknames.length)];
      sessionStorage.setItem(key, nickname);
      return nickname;
    }
    return name.split(" ")[0];
  }, [isTantri, name]);

  // ─── Next prayer countdown ───
  const now = useNow(1000);
  const tz = localTimezoneHours(now);
  const prayerTimes = useMemo(() => {
    try {
      return computePrayerTimes({ date: now, lat: -6.2088, lng: 106.8456, timezone: tz });
    } catch {
      return null;
    }
  }, [now, tz]);
  const nextPrayer = useMemo(() => prayerTimes ? getNextPrayer(prayerTimes, now) : null, [prayerTimes, now]);

  // ─── Toggle prayer (cycles 0 → 1 → 2 → 0) ───
  async function togglePrayer(key: string) {
    const current = Number(prayerSelected?.[key] ?? 0);
    const next = current >= 2 ? 0 : current + 1;
    const base = prayerSelected ?? { id: uid(), date: selectedDay };
    await upsert("prayerLogs", { ...base, id: String(base.id), [key]: next });
  }

  // ─── Khatma data ───
  const activeKhatma = khatmaPlans.find((p) => p.isActive && !p.completedAt);

  // ─── Focus data ───
  const todayFocusSessions = focusSessions.filter((x) => x.date === day && x.completed);
  const focusMinutes = Math.round(todayFocusSessions.reduce((s, x) => s + Number(x.durationSec ?? 0), 0) / 60);

  // ─── Goals data ───
  const activeGoals = useMemo(() => goals.filter((g) => !g.done).slice(0, 4), [goals]);

  // ─── Achievements data ───
  const unlockedSet = useMemo(
    () => new Set(achievementRows.map((r) => String(r.achievementId))),
    [achievementRows],
  );
  const trackableAchievements = useMemo(() => ACHIEVEMENTS.filter((a) => a.category !== "dhikr"), []);
  const unlockedCount = trackableAchievements.filter((a) => unlockedSet.has(a.id)).length;
  const achievementPct = Math.round((unlockedCount / trackableAchievements.length) * 100);

  // ─── Analytics data ───
  const last14Days = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      out.push(ymd(d));
    }
    return out;
  }, []);

  const prayerCompletionRate = useMemo(() => {
    let done = 0;
    for (const d of last14Days) {
      const log = prayerLogMap.get(d);
      if (log) done += PRAYERS.filter((k) => Number(log[k] ?? 0) > 0).length;
    }
    const total = last14Days.length * 5;
    return total ? Math.round((done / total) * 100) : 0;
  }, [last14Days, prayerLogMap]);

  const quranDays = useMemo(() => {
    const qDays = new Set(quranLogs.filter((l) => Number(l.pagesRead ?? 0) > 0).map((l) => String(l.date)));
    return last14Days.filter((d) => qDays.has(d)).length;
  }, [last14Days, quranLogs]);

  const habitCompletionRate = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const d of last14Days) {
      const logs = habitLogs.filter((l) => l.date === d);
      for (const h of habits) {
        total++;
        if (logs.some((l) => l.habitId === h.id && l.done)) done++;
      }
    }
    return total ? Math.round((done / total) * 100) : 0;
  }, [last14Days, habitLogs, habits]);

  // ─── Journal data ───
  const todayJournal = journalEntries.find((e) => e.date === day);

  // ─── Calendar data ───
  const todayEvents = useMemo(() => {
    return calendarEvents.filter((e) => e.date === day).slice(0, 3);
  }, [calendarEvents, day]);

  // ─── Weekly motivation text ───
  const motivationText = useMemo(() => {
    if (prayerCompletionRate >= 70) return t("dash.analytics.motivation.strong");
    if (prayerCompletionRate >= 40) return t("dash.analytics.motivation.stable");
    return t("dash.analytics.motivation.start");
  }, [prayerCompletionRate, t]);

  // ─── Heatmap data (30 days combined activity) ───
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
      if (pages > 0) dayMap.set(d, (dayMap.get(d) ?? 0) + Math.min(pages, 10));
    }
    const out: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      out.push({ date: dStr, value: dayMap.get(dStr) ?? 0 });
    }
    return out;
  }, [prayerLogs, habitLogs, quranLogs]);

  // ─── Context-aware section order (time of day) ───
  const timeOfDay = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) return "morning" as const;
    if (h >= 11 && h < 15) return "midday" as const;
    if (h >= 15 && h < 18) return "afternoon" as const;
    return "night" as const;
  }, []);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════ */}
      {/* WELCOME SECTION                            */}
      {/* ═══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm mesh-gradient"
      >
        <div className="hero-glow pointer-events-none absolute inset-0 opacity-60 animate-breathe" />
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-[0.5]" />
        <IslamicGeometricPattern className="text-primary" opacity={0.04} size={72} />
        <div className="relative p-7 sm:p-10">
          <div className="flex flex-col gap-1.5">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl sm:text-4xl font-semibold tracking-tight"
            >
              {t(greetingKey())},{" "}
              <span className="text-primary">{displayName}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="text-[15px] text-muted-foreground max-w-xl leading-relaxed"
            >
              {getWarmGreeting(t)}
            </motion.p>
          </div>

          {/* Verse of the Day */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5 }}
            className="mt-6"
          >
            <div className="block rounded-2xl border border-border/60 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1">{t("dash.verse")}</p>
                  <p className="text-xl sm:text-2xl text-primary leading-relaxed text-right mb-1.5" style={{ fontFamily: "var(--font-arabic, serif)" }}>
                    {verse.ar}
                  </p>
                  <p className="text-sm text-foreground/80 italic leading-relaxed">&ldquo;{lang === "id" ? verse.id : verse.en}&rdquo;</p>
                  <p className="text-[11px] text-muted-foreground mt-1">— {verse.ref}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {[
              {
                label: t("dash.stats.habits"),
                value: `${habitDone}/${habits.length || 0}`,
                icon: Flame,
                tint: "text-amber-500",
                bg: "bg-amber-500/10",
                sparkData: weeklyHabit,
                sparkColor: "oklch(0.75 0.15 85)",
              },
              {
                label: t("dash.stats.prayer"),
                value: `${prayerDone}/5`,
                icon: Check,
                tint: "text-primary",
                bg: "bg-primary/10",
                sparkData: weeklyPrayer,
                sparkColor: "oklch(0.68 0.09 160)",
              },
              {
                label: t("dash.stats.hifdz"),
                value: `${hifdzTodayPages}/${dailyTarget}`,
                icon: BookMarked,
                tint: "text-emerald-500",
                bg: "bg-emerald-500/10",
                sparkData: [hifdzTodayPages, ...Array(6).fill(0)],
                sparkColor: "oklch(0.65 0.15 155)",
              },
              {
                label: t("dash.stats.finance"),
                value: formatIDR(balance),
                icon: TrendingUp,
                tint: "text-sky-500",
                bg: "bg-sky-500/10",
                sparkData: [balance / 1000, balance / 1100, balance / 1050, balance / 1200, balance / 1000, balance / 900, balance / 1000],
                sparkColor: "oklch(0.65 0.1 230)",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (                  <SpotlightCard
                  key={s.label}
                  className="group relative rounded-2xl border border-border/60 bg-background/60 backdrop-blur-sm p-4 transition-all hover:border-border hover:bg-background/80"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.bg}`}>
                      <Icon className={`h-4 w-4 ${s.tint}`} />
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-xl font-semibold tracking-tight tabular-nums">
                      {s.value}
                    </span>
                  </div>
                  {s.sparkData && s.sparkData.length > 0 && (
                    <div className="mt-2 h-8 w-full opacity-70 group-hover:opacity-100 transition-opacity">
                      <SparklineChart
                        data={s.sparkData}
                        color={s.sparkColor}
                        height={32}
                      />
                    </div>
                  )}
                </SpotlightCard>
              );
            })}
          </motion.div>

          {/* Next prayer countdown + Time context */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {nextPrayer && now ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {t(`prayer.${nextPrayer.name.toLowerCase()}` as any)} {t("dash.nextPrayerIn")} {formatTimeInZone(nextPrayer.time, tz)} ·{" "}
                <span className="text-foreground/80">{formatCountdown(nextPrayer.msRemaining)}</span>
              </div>
            ) : null}
            {/* Context-aware focus hint */}
            {timeOfDay === "morning" && (
              <div className="flex items-center gap-1.5 text-[11px] text-primary/80">
                <Sunrise className="h-3 w-3" />
                <span>Pagi yang baik untuk memulai ibadah</span>
              </div>
            )}
            {timeOfDay === "midday" && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <Sun className="h-3 w-3" />
                <span>Waktu yang tepat untuk tilawah</span>
              </div>
            )}
            {timeOfDay === "afternoon" && (
              <div className="flex items-center gap-1.5 text-[11px] text-sky-600 dark:text-sky-400">
                <Clock className="h-3 w-3" />
                <span>Sore hari, jangan lupa ashar</span>
              </div>
            )}
            {timeOfDay === "night" && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-600 dark:text-violet-400">
                <Moon className="h-3 w-3" />
                <span>Malam hari, saatnya muhasabah</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════ */}
      {/* DAILY FOCUS + PRAYER OVERVIEW               */}
      {/* ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Focus */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <Card className="h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-medium tracking-tight">{t("dash.section.prayerTitle")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t("dash.section.prayer")}</p>
              </div>
              <ProgressRing value={prayerDone / 5} size={72} stroke={7}>
                <span className="text-base font-semibold">{Math.round((prayerDone / 5) * 100)}%</span>
              </ProgressRing>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">{t("prayer.title")}</span>
                  <span className="text-[11px] text-muted-foreground">· 5 waktu</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {PRAYERS.filter((k) => k !== "Sunrise").map((k) => {
                    const val = Number(prayerSelected?.[k] ?? 0);
                    const done = val > 0;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => void togglePrayer(k)}
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all",
                          done
                            ? "border-primary/40 bg-primary/8"
                            : "border-border bg-card hover:border-border hover:bg-muted/40"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border transition-all",
                            done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent group-hover:border-foreground/30"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className={cn("text-xs font-medium", done ? "text-primary" : "text-foreground")}>
                          {t(`prayer.${k.toLowerCase()}` as any)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Quran + Journal */}
              <div className="grid sm:grid-cols-2 gap-2.5">
                <Link to="/app/quran">
                  <button className={cn(
                    "group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all w-full",
                    hifdzTodayPages > 0 ? "border-primary/40 bg-primary/8" : "border-border bg-card hover:border-border hover:bg-muted/40"
                  )}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{t("nav.quran")}</p>
                      <p className={cn("text-sm font-medium leading-tight", hifdzTodayPages > 0 ? "text-primary" : "text-foreground")}>
                        {hifdzTodayPages}/{dailyTarget} {t("dash.pages")}
                      </p>
                    </div>
                    <span className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                      hifdzTodayPages > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
                    )}>
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                </Link>
                <Link to="/app/notes">
                  <button className={cn(
                    "group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all w-full",
                    todayJournal ? "border-primary/40 bg-primary/8" : "border-border bg-card hover:border-border hover:bg-muted/40"
                  )}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <PenLine className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{t("notes.title")}</p>
                      <p className={cn("text-sm font-medium leading-tight", todayJournal ? "text-primary" : "text-foreground")}>
                        {todayJournal ? "Sudah ditulis" : "Belum"}
                      </p>
                    </div>
                    <span className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                      todayJournal ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
                    )}>
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Prayer Overview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <Card className="h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-medium tracking-tight">{t("dash.section.prayer")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {nextPrayer && now ? (
                    <>{t("dash.nextPrayer")}: <span className="text-foreground font-medium">{t(`prayer.${nextPrayer.name.toLowerCase()}` as any)}</span> · {formatTimeInZone(nextPrayer.time, tz)}</>
                  ) : (
                    t("common.loading")
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums">{prayerCompletionRate}%</p>
                <p className="text-[11px] text-muted-foreground">14 {t("dash.days")}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              <ul className="space-y-3">
                {PRAYERS.filter((k) => k !== "Sunrise").map((name) => {
                  const time = prayerTimes?.[name as keyof typeof prayerTimes];
                  const done = Number(prayerSelected?.[name.toLowerCase()] ?? 0) > 0;
                  const isNext = nextPrayer?.name === name && nextPrayer.isToday;
                  return (
                    <li key={name} className="relative flex items-center gap-3">
                      <div
                        className={cn(
                          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-card transition-colors",
                          done ? "border-primary bg-primary text-primary-foreground" : isNext ? "border-primary text-primary" : "border-border text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{t(`prayer.${name.toLowerCase()}` as any)}</span>
                            <span className="text-arabic text-xs text-muted-foreground">{PRAYER_AR[name]}</span>
                            {isNext && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{t("dash.nextPrayer")}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {time instanceof Date ? formatTimeInZone(time, tz) : "—"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Weekly consistency */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("dash.section.weekly")}</span>
              </div>
              <div className="flex items-end gap-1.5 h-24">
                {weeklyPrayer.map((count, i) => {
                  const pct = (count / 5) * 100;
                  const dayDate = new Date(days[i] + "T00:00:00");
                  const isTodayDay = days[i] === day;
                  const hasData = count > 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                      {/* Tooltip */}
                      <div className="relative w-full flex-1 flex items-end">
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] font-medium px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {count}/5 sholat
                        </div>
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all duration-500 cursor-pointer",
                            hasData
                              ? isTodayDay ? "bg-primary" : count === 5 ? "bg-emerald-500" : count >= 3 ? "bg-primary/60" : "bg-primary/40"
                              : "bg-muted-foreground/25"
                          )}
                          style={{ height: hasData ? `${Math.max(pct, 16)}%` : "4%", minHeight: hasData ? 8 : 3 }}
                        />
                      </div>
                      <span className={cn("text-[10px] tabular-nums", isTodayDay ? "text-primary font-semibold" : "text-muted-foreground")}>
                        {SHORT_DAYS_ID[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1]}
                      </span>
                    </div>
                  );
                })}
                {weeklyPrayer.length === 0 && (
                  <div className="w-full text-center text-xs text-muted-foreground py-6">{t("common.empty")}</div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 30-DAY CONSISTENCY HEATMAP                 */}
      {/* ═══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
      >
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-display text-sm font-semibold">Konsistensi 30 Hari</h3>
                <p className="text-[11px] text-muted-foreground">Gabungan sholat, habit, Qur'an</p>
              </div>
            </div>
            <Link to="/app/analytics" className="text-xs text-primary hover:underline">
              {t("common.seeAll")} →
            </Link>
          </div>
          <ConsistencyHeatmap
            data={heatmapData}
            color="primary"
            weeks={5}
            showLegend
            interactive
            tooltipFormatter={(date, value) => {
              const d = parseYmd(date);
              const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
              return value > 0 ? `${label} · ${value} aktivitas` : `${label} · kosong`;
            }}
          />
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════ */}
      {/* SCHOLAR QUOTE + HADITH                      */}
      {/* ═══════════════════════════════════════════ */}
      <ScholarQuoteOfTheDay />
      <HadithOfTheDay />

      {/* ═══════════════════════════════════════════ */}
      {/* QURAN PROGRESS + HABIT TRACKER              */}
      {/* ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quran Progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <Card className="h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">{t("dash.quran.openWorkspace")}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("dash.pages")}</p>
                </div>
              </div>
              <ProgressRing value={dailyTarget ? Math.min(1, hifdzTodayPages / dailyTarget) : 0} size={64} stroke={6}>
                <span className="text-xs font-semibold">{hifdzTodayPages}/{dailyTarget}</span>
              </ProgressRing>
            </div>
            {/* Page counter */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 p-3.5 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("quran.pagesToday")}</p>
                <p className="text-2xl font-semibold tabular-nums">{hifdzTodayPages}</p>
              </div>
              <Link to="/app/quran">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <BookMarked className="h-3.5 w-3.5" /> {t("quran.totalPages")}
                </div>
                <p className="text-sm font-medium tabular-nums">{totalPages}</p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Target className="h-3.5 w-3.5" /> {t("dash.hifz.title")}
                </div>
                <p className="text-sm font-medium tabular-nums">{Math.round((totalPages / TOTAL_QURAN_AYAHS) * 100)}%</p>
              </div>
            </div>
            <Link to="/app/quran" className="w-full text-sm text-primary font-medium hover:underline underline-offset-4 block text-center">
              {t("dash.quran.openWorkspace")}
            </Link>
          </Card>
        </motion.div>

        {/* Habit Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <Card className="h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-medium tracking-tight">{t("dash.section.habitsTitle")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {habitDone}/{habits.length || 0} {t("dash.today")}
                </p>
              </div>
              <Link to="/app/habits">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {habits.slice(0, 4).map((h) => {
                const done = doneToday.has(String(h.id));
                return (
                  <motion.div
                    key={String(h.id)}
                    whileHover={{ y: -2 }}
                    className={cn(
                      "group relative rounded-xl border p-4 transition-all",
                      done ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{h.name}</p>
                          <span className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                            done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent group-hover:border-foreground/30"
                          )}>
                            <Check className="h-3 w-3" />
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Flame className="h-3 w-3 text-amber-500" />
                            <span className="tabular-nums">{pStreak}d</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {habits.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                {t("empty.habits.desc")}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* KHATMA PREVIEW                              */}
      {/* ═══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
      >
        <Link to="/app/quran?tab=khatam">
          <Card className="relative overflow-hidden p-5 sm:p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.04]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <ScrollText className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-medium">{t("dash.khatma.title")}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {activeKhatma ? activeKhatma.name : t("dash.khatma.empty")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              {!activeKhatma ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-background/40 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium mb-1">{t("dash.khatma.empty")}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t("dash.khatma.desc")}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] to-transparent p-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("dash.khatma.progress")}</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {activeKhatma.completionPct ?? 0}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("dash.khatma.pages")}</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {activeKhatma.pagesRead ?? 0}
                        <span className="text-xs text-muted-foreground font-normal"> / {activeKhatma.totalPages}</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${activeKhatma.completionPct ?? 0}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* ═══════════════════════════════════════════ */}
      {/* HIFZ PREVIEW + FOCUS PREVIEW                */}
      {/* ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hifz Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <Link to="/app/hifz">
            <Card className="relative overflow-hidden p-5 sm:p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.04]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookMarked className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-medium">{t("dash.hifz.title")}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {totalPages > 0 ? `${Math.round((totalPages / TOTAL_QURAN_AYAHS) * 100)}% ${t("dash.hifz.percentQuran", { n: "" })}` : t("dash.hifz.start")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-4">
                  <ProgressRing value={totalPages / TOTAL_QURAN_AYAHS} size={84} stroke={8}>
                    <div className="text-center">
                      <p className="text-sm font-semibold tabular-nums">
                        {Math.round((totalPages / TOTAL_QURAN_AYAHS) * 100)}%
                      </p>
                    </div>
                  </ProgressRing>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader className="h-3 w-3" />
                      <span>{Math.round((totalPages / TOTAL_QURAN_AYAHS) * 100)}% {t("dash.hifz.percentQuran", { n: "" })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Focus Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <Link to="/app/focus">
            <Card className="relative overflow-hidden p-5 sm:p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.04]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Timer className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-medium">{t("dash.focus.title")}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {focusMinutes > 0 ? `${focusMinutes} menit · ${todayFocusSessions.length} sesi` : t("dash.focus.ready")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
                    <p className="text-base font-semibold tabular-nums">{focusMinutes}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("dash.focus.todayMin")}</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 px-2 py-2 text-center">
                    <p className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">{pStreak}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("dash.focus.streak")}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 px-2 py-2 text-center">
                    <p className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{todayFocusSessions.length}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("dash.focus.sevenDay")}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2 text-sm font-medium"
                >
                  <Play className="h-3.5 w-3.5" /> {t("dash.focus.startSession")}
                </button>
              </div>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* CALENDAR PREVIEW + ANALYTICS PREVIEW        */}
      {/* ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
        >
          <Link to="/app/calendar">
            <Card className="p-5 sm:p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <CalendarDays className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h3 className="text-lg font-medium tracking-tight">
                      {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {getHijriDate(new Date()).formatted}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              {/* Mini calendar */}
              <div className="grid grid-cols-7 gap-1 mb-3">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-muted-foreground uppercase py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const dayNum = i + 1;
                  const isTodayDay = dayNum === new Date().getDate();
                  return (
                    <div
                      key={dayNum}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors",
                        isTodayDay ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"
                      )}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>
              {/* Upcoming events */}
              {todayEvents.length > 0 && (
                <div className="mt-4 border-t border-border/60 pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("dash.calendar.upcoming")}</p>
                  <div className="space-y-2">
                    {todayEvents.map((e) => (
                      <div key={String(e.id)} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </Link>
        </motion.div>

        {/* Analytics Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4 }}
        >
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <BarChart3 className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">{t("dash.analytics.title")}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("dash.analytics.subtitle")}</p>
                </div>
              </div>
              <Link to="/app/analytics">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { label: t("dash.analytics.prayerConsistency"), value: prayerCompletionRate, tint: "bg-emerald-500" },
                { label: t("dash.analytics.quranDays"), value: Math.round((quranDays / 14) * 100), tint: "bg-amber-500" },
                { label: t("dash.analytics.habitCompletion"), value: habitCompletionRate, tint: "bg-sky-500" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <span className="text-sm font-semibold tabular-nums">{s.value}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      className={cn("h-full rounded-full", s.tint)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-muted/40 p-3">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">{motivationText}</p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* GOALS + ACHIEVEMENTS + JOURNAL              */}
      {/* ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          <Card className="h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Target className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">{t("dash.goals.title")}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("dash.goals.subtitle")}</p>
                </div>
              </div>
              <Link to="/app/goals">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
            <div className="space-y-3">
              {activeGoals.map((g) => {
                const progress = Number(g.progress ?? 0);
                return (
                  <div key={String(g.id)} className="group">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>
                );
              })}
              {activeGoals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">{t("dash.goals.allComplete")}</p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Achievements Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          <Card className="h-full p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-400/5 text-amber-600 dark:text-amber-400">
                  <Crown className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{t("dash.achievements.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("dash.achievements.unlocked", { n: unlockedCount, m: trackableAchievements.length })}</p>
                </div>
              </div>
              <ProgressRing value={achievementPct} size={48} stroke={4}>
                <span className="text-[10px] font-bold tabular-nums">{achievementPct}%</span>
              </ProgressRing>
            </div>
            <Link to="/app/achievements" className="mt-3 flex items-center justify-center gap-1 w-full text-xs font-medium text-primary hover:underline">
              {t("dash.achievements.viewAll")}
            </Link>
          </Card>
        </motion.div>

        {/* Journal Quick Entry */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <Card className="h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <PenLine className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">{t("dash.journal.title")}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
              <span className={cn("flex items-center gap-1 text-[11px]", todayJournal ? "text-emerald-500" : "text-muted-foreground/40")}>
                {todayJournal ? <><Check className="h-3 w-3" /> {t("journal.saved")}</> : <Save className="h-3.5 w-3.5" />}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <Heart className="h-3.5 w-3.5 text-rose-500" /> {t("journal.gratitude")}
                </label>
                <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground/60">
                  {todayJournal?.gratitude || t("journal.gratitudePlaceholder")}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> {t("journal.body")}
                </label>
                <div className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground/60 min-h-[40px]">
                  {todayJournal?.body || t("journal.bodyPlaceholder")}
                </div>
              </div>
            </div>
            <Link to="/app/journal" className="mt-4 text-sm text-primary font-medium hover:underline underline-offset-4 block">
              {t("dash.journal.openFull")}
            </Link>
          </Card>
        </motion.div>
      </div>

      {/* ── Shortcuts Row ── */}
      <motion.div variants={fade} custom={7} initial="hidden" animate="show">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {t("dash.shortcuts")}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {[
            { to: "/app/habits", icon: Flame, label: "nav.habits" as const, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
            { to: "/app/salah", icon: BookOpenText, label: "nav.salah" as const, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
            { to: "/app/notes", icon: NotebookPen, label: "nav.notes" as const, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
            { to: "/app/journal", icon: Sparkles, label: "nav.journal" as const, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
            { to: "/app/quran?tab=khatam", icon: BookOpenText, label: "nav.khatma" as const, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
            { to: "/app/duas", icon: ScrollText, label: "nav.duas" as const, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
            { to: "/app/goals", icon: Target, label: "nav.goals" as const, color: "bg-rose-500/10 text-rose-500 dark:text-rose-300" },
            { to: "/app/focus", icon: Timer, label: "nav.focus" as const, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
            { to: "/app/analytics", icon: BarChart3, label: "nav.analytics" as const, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
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
      <motion.div variants={fade} custom={8} initial="hidden" animate="show">
        <Card className="p-5">
          <SectionHeader
            eyebrow={t("dash.section.weekly")}
            title={t("dash.weeklyInsight")}
            action={t("dash.viewAll")}
            actionHref="/app/analytics"
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {t("dash.section.prayer")}
                </p>
                <SparklineChart
                  data={weeklyPrayer}
                  color="oklch(0.496 0.11 157)"
                  height={24}
                  className="h-6 w-20"
                />
              </div>
              <MiniBarChart
                values={weeklyPrayer}
                labels={days.map((d) => shortDay(d, lang))}
                maxVal={5}
                color="oklch(0.42 0.085 165)"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {t("dash.section.habits")}
                </p>
                <SparklineChart
                  data={weeklyHabit}
                  color="oklch(0.8 0.157 83.9)"
                  height={24}
                  className="h-6 w-20"
                />
              </div>
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
