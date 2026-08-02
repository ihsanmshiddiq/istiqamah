import { Link } from "wouter";
import { motion } from "motion/react";
import { ArrowRight, Flame, BookOpenText, Wallet, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { useTable, useSingleton } from "@/hooks/use-store";
import { today as todayHelper, type Row } from "@/lib/store";
import { Card, ProgressRing } from "@/components/ui/primitives";
import {
  PRAYERS,
  ymd,
  verseOfDay,
  formatIDR,
  PAGES_PER_JUZ,
  prayerStreak,
} from "@/lib/domain";

function greetingKey() {
  const h = new Date().getHours();
  if (h < 11) return "dash.greeting.morning" as const;
  if (h < 15) return "dash.greeting.afternoon" as const;
  if (h < 18) return "dash.greeting.evening" as const;
  return "dash.greeting.night" as const;
}

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function StatCard({
  index,
  to,
  children,
}: {
  index: number;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={fade} custom={index} initial="hidden" animate="show">
      <Link to={to}>
        <Card className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-30px_rgba(20,60,45,0.5)]">
          {children}
        </Card>
      </Link>
    </motion.div>
  );
}

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

  // prayer today
  const prayerToday = prayerLogs.find((p) => p.date === day);
  const prayerDone = PRAYERS.filter((k) => Number(prayerToday?.[k] ?? 0) > 0).length;
  const prayerLogMap = new Map(prayerLogs.map((p) => [String(p.date), p]));
  const pStreak = prayerStreak(prayerLogMap);

  // habits today
  const doneToday = new Set(
    habitLogs.filter((l) => l.date === day && l.done).map((l) => String(l.habitId)),
  );
  const habitDone = habits.filter((h) => doneToday.has(String(h.id))).length;

  // hifdz today
  const hifdzTodayPages = hifdzLogs
    .filter((l) => l.date === day)
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const totalPages = hifdzLogs
    .filter((l) => l.type === "new")
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const dailyTarget = Number(hifdz?.dailyPages ?? 1);

  // murajaah due
  const dueCount = murajaah.filter((m) => String(m.nextDue) <= day).length;

  // finance balance
  const balance = transactions.reduce(
    (s, tx) => s + (tx.type === "income" ? 1 : -1) * Number(tx.amount ?? 0),
    0,
  );

  const name = profile?.displayName || session?.user?.name || "";
  const hifdzOn = profile?.hifdzEnabled ?? true;

  return (
    <div>
      {/* Greeting + verse */}
      <motion.div variants={fade} initial="hidden" animate="show" className="mb-8">
        <p className="text-sm font-medium text-gold-foreground">
          {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t(greetingKey())}
          {name ? `, ${name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("dash.subtitle")}</p>
      </motion.div>

      <motion.div variants={fade} custom={1} initial="hidden" animate="show" className="mb-6">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-arabic text-3xl leading-[1.8] text-primary sm:text-4xl">{verse.ar}</p>
              <p className="mt-3 max-w-lg text-sm italic text-foreground/80">
                “{lang === "id" ? verse.id : verse.en}”
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium text-gold-foreground">{verse.ref}</p>
          </div>
        </Card>
      </motion.div>

      {/* Stat grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Prayer */}
        <StatCard index={2} to="/app/salah">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("dash.prayerProgress")}</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                {prayerDone}
                <span className="text-lg text-muted-foreground">/5</span>
              </p>
              {pStreak > 0 && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gold-foreground">
                  <Flame className="h-3.5 w-3.5" /> {t("dash.streak")} {pStreak} {t("dash.days")}
                </p>
              )}
            </div>
            <ProgressRing value={prayerDone / 5} size={64}>
              <span className="text-sm font-semibold">{Math.round((prayerDone / 5) * 100)}%</span>
            </ProgressRing>
          </div>
        </StatCard>

        {/* Habits */}
        <StatCard index={3} to="/app/habits">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("dash.habitProgress")}</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                {habitDone}
                <span className="text-lg text-muted-foreground">/{habits.length || 0}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dash.todayIbadah")}</p>
            </div>
            <ProgressRing value={habits.length ? habitDone / habits.length : 0} size={64}>
              <span className="text-sm font-semibold">
                {habits.length ? Math.round((habitDone / habits.length) * 100) : 0}%
              </span>
            </ProgressRing>
          </div>
        </StatCard>

        {/* Hifdz */}
        {hifdzOn && (
          <StatCard index={4} to="/app/hifz">
            <div className="flex items-center justify-between">
              <div>
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <BookOpenText className="h-4 w-4" /> {t("dash.hifdzToday")}
                </p>
                <p className="mt-1 font-display text-3xl font-semibold">
                  {hifdzTodayPages}
                  <span className="text-lg text-muted-foreground">
                    /{dailyTarget} {t("dash.pages")}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(totalPages / PAGES_PER_JUZ).toFixed(1)} {t("hifdz.totalJuz")}
                </p>
              </div>
              <ProgressRing value={dailyTarget ? hifdzTodayPages / dailyTarget : 0} size={64}>
                <BookOpenText className="h-5 w-5 text-primary" />
              </ProgressRing>
            </div>
          </StatCard>
        )}

        {/* Murajaah due */}
        {hifdzOn && (
          <StatCard index={5} to="/app/hifz">
            <div className="flex items-center gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-gold-foreground">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("dash.murajaahDue")}</p>
                <p className="mt-0.5 font-display text-2xl font-semibold">
                  {dueCount > 0 ? dueCount : t("dash.nothingDue")}
                </p>
              </div>
            </div>
          </StatCard>
        )}

        {/* Finance */}
        <StatCard index={6} to="/app/finance">
          <div className="flex items-center gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">{t("dash.finance.balance")}</p>
              <p className="mt-0.5 truncate font-display text-2xl font-semibold">
                {formatIDR(balance)}
              </p>
            </div>
          </div>
        </StatCard>

        {/* Journal quick */}
        <StatCard index={7} to="/app/journal">
          <div className="flex h-full items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("dash.quickJournal")}</p>
              <p className="mt-1 font-display text-xl font-semibold">{t("nav.journal")}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </StatCard>
      </div>

      <span className="sr-only">{ymd(new Date())}</span>
    </div>
  );
}
