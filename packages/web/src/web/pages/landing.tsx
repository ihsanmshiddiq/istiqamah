import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import {
  LayoutDashboard,
  CalendarDays,
  Moon,
  BookOpenText,
  BookMarked,
  HandHeart,
  Repeat,
  Target,
  BarChart3,
  Wallet,
  HeartPulse,
  NotebookPen,
  WifiOff,
  ArrowRight,
  ArrowUp,
  Star,
  Quote,
  Sparkles,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Wordmark } from "@/components/logo";
import { ThemeToggle, LangToggle } from "@/components/switches";
import { Button } from "@/components/ui/primitives";
import { verseOfDay } from "@/lib/domain";
import {
  computePrayerTimes,
  getNextPrayer,
  getHadithOfTheDay,
  getUpcomingIslamicEvents,
  getHijriDate,
} from "@/lib/content/islamic";
import { cn } from "@/lib/utils";
import type { DictKey } from "@/lib/translations";

type Feature = { icon: typeof HandHeart; title: DictKey; desc: DictKey };

const FEATURES: Feature[] = [
  { icon: LayoutDashboard, title: "landing.f.dashboard.title", desc: "landing.f.dashboard.desc" },
  { icon: Moon, title: "landing.f.salah.title", desc: "landing.f.salah.desc" },
  { icon: BookOpenText, title: "landing.f.quran.title", desc: "landing.f.quran.desc" },
  { icon: BookMarked, title: "landing.f.khatma.title", desc: "landing.f.khatma.desc" },
  { icon: Repeat, title: "landing.f.habits.title", desc: "landing.f.habits.desc" },
  { icon: HandHeart, title: "landing.f.hifdz.title", desc: "landing.f.hifdz.desc" },
  { icon: CalendarDays, title: "landing.f.calendar.title", desc: "landing.f.calendar.desc" },
  { icon: Sparkles, title: "landing.f.duas.title", desc: "landing.f.duas.desc" },
  { icon: Target, title: "landing.f.goals.title", desc: "landing.f.goals.desc" },
  { icon: NotebookPen, title: "landing.f.notes.title", desc: "landing.f.notes.desc" },
  { icon: BarChart3, title: "landing.f.analytics.title", desc: "landing.f.analytics.desc" },
  { icon: Wallet, title: "landing.f.finance.title", desc: "landing.f.finance.desc" },
  { icon: HeartPulse, title: "landing.f.cycle.title", desc: "landing.f.cycle.desc" },
  { icon: WifiOff, title: "landing.f.offline.title", desc: "landing.f.offline.desc" },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* Demo location for the public preview (Jakarta) — real computation, sample data. */
const DEMO = { lat: -6.2088, lng: 106.8456, tz: 7 };

export default function Landing() {
  const { t, lang } = useI18n();
  const verse = verseOfDay();

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <motion.div
        aria-hidden
        style={{ scaleX: bar }}
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-primary via-gold to-primary"
      />

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Wordmark />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#preview" className="transition-colors hover:text-foreground">
              {t("landing.nav.preview")}
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              {t("landing.nav.features")}
            </a>
            <a href="#events" className="transition-colors hover:text-foreground">
              {t("landing.nav.events")}
            </a>
            <a href="#philosophy" className="transition-colors hover:text-foreground">
              {t("landing.nav.philosophy")}
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
            <Link to="/login" className="ml-1 hidden sm:block">
              <Button variant="ghost" size="sm">
                {t("landing.nav.login")}
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">{t("landing.nav.start")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Mesh gradient aurora background */}
        <div className="pointer-events-none absolute inset-0">
          <div
            aria-hidden
            className="animate-aurora absolute -top-[20%] -left-[10%] h-[50vw] w-[50vw] rounded-full bg-primary/15 blur-[120px]"
          />
          <div
            aria-hidden
            className="animate-aurora absolute top-[40%] -right-[15%] h-[45vw] w-[45vw] rounded-full bg-gold/12 blur-[140px]"
            style={{ animationDelay: "-5s" }}
          />
          <div
            aria-hidden
            className="animate-aurora absolute -bottom-[20%] left-[20%] h-[55vw] w-[55vw] rounded-full bg-primary/10 blur-[160px]"
            style={{ animationDelay: "-10s" }}
          />
        </div>
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div
          aria-hidden
          className="animate-float-slow pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-gold/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <motion.p
              variants={fade}
              initial="hidden"
              animate="show"
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-gold-foreground"
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              {t("landing.hero.eyebrow")}
            </motion.p>
            <motion.h1
              variants={fade}
              custom={1}
              initial="hidden"
              animate="show"
              className="font-display text-[2.6rem] font-semibold leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl gradient-text"
            >
              {t("landing.hero.title")}
            </motion.h1>
            <motion.p
              variants={fade}
              custom={2}
              initial="hidden"
              animate="show"
              className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {t("landing.hero.sub")}
            </motion.p>
            <motion.div
              variants={fade}
              custom={3}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link to="/signup">
                <Button size="lg" className="group">
                  {t("landing.hero.cta")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <a href="#preview">
                <Button size="lg" variant="outline">
                  {t("landing.hero.secondary")}
                </Button>
              </a>
            </motion.div>
            <motion.ul
              variants={fade}
              custom={4}
              initial="hidden"
              animate="show"
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
            >
              {(["landing.hero.trust1", "landing.hero.trust2", "landing.hero.trust3"] as DictKey[]).map(
                (k) => (
                  <li key={k} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {t(k)}
                  </li>
                ),
              )}
            </motion.ul>
          </div>

          {/* Verse card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="paper-grain relative overflow-hidden rounded-[2rem] border border-border/80 bg-card p-7 shadow-[0_30px_80px_-40px_rgba(20,60,45,0.5)] sm:p-10 mesh-gradient">
              <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
              <div className="relative">
                <p className="font-arabic text-right text-3xl leading-[1.9] text-primary sm:text-5xl">
                  {verse.ar}
                </p>
                <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                <p className="mt-6 text-base italic leading-relaxed text-foreground/85">
                  “{lang === "id" ? verse.id : verse.en}”
                </p>
                <p className="mt-3 text-sm font-medium text-gold-foreground">— {verse.ref}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PreviewSection />

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-foreground">
            {t("landing.features.eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            {t("landing.features.title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("landing.features.sub")}</p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={fade}
                custom={i % 3}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-32px_rgba(20,60,45,0.45)]"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{t(f.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(f.desc)}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <HadithSection />
      <EventsSection />

      {/* Philosophy */}
      <section
        id="philosophy"
        className="relative overflow-hidden border-y border-border bg-secondary/40"
      >
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-foreground">
            {t("landing.philosophy.eyebrow")}
          </p>
          <h2 className="mt-5 font-display text-2xl font-semibold leading-snug tracking-tight sm:text-4xl">
            {t("landing.philosophy.title")}
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("landing.philosophy.sub")}
          </p>
          <blockquote className="mx-auto mt-14 max-w-2xl">
            <div className="relative">
              <Quote className="absolute -left-8 -top-4 h-8 w-8 text-primary/20" />
              <p className="font-display text-xl italic leading-relaxed text-foreground sm:text-3xl">
                “{t("landing.philosophy.hadith")}”
              </p>
            </div>
            <footer className="mt-6 text-sm font-medium text-muted-foreground">
              {t("landing.philosophy.hadithSrc")}
            </footer>
          </blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24 mesh-gradient">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          {t("landing.cta.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          {t("landing.cta.sub")}
        </p>
        <Link to="/signup" className="mt-8 inline-block">
          <Button size="lg" className="group">
            {t("landing.hero.cta")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/20">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-sm">
              <Wordmark />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t("landing.footer.tagline")}
              </p>
            </div>
            <div className="flex gap-12 text-sm">
              <div>
                <p className="mb-3 font-semibold">{t("landing.footer.product")}</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    <a href="#preview" className="transition-colors hover:text-foreground">
                      {t("landing.nav.preview")}
                    </a>
                  </li>
                  <li>
                    <a href="#features" className="transition-colors hover:text-foreground">
                      {t("landing.nav.features")}
                    </a>
                  </li>
                  <li>
                    <a href="#philosophy" className="transition-colors hover:text-foreground">
                      {t("landing.nav.philosophy")}
                    </a>
                  </li>
                  <li>
                    <Link to="/login" className="transition-colors hover:text-foreground">
                      {t("landing.nav.login")}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-border/60 pt-6 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Istiqamah · {t("landing.footer.rights")}
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showTop ? (
          <motion.button
            key="top"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label={t("landing.top")}
            className="fixed bottom-6 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live product preview                                                */
/* ------------------------------------------------------------------ */

const DEMO_HABITS: { id: string; done: boolean; label: Record<"id" | "en", string> }[] = [
  { id: "quran", done: true, label: { id: "Tilawah 1 juz", en: "Read 1 juz" } },
  { id: "dhuha", done: true, label: { id: "Sholat Dhuha", en: "Dhuha prayer" } },
  { id: "sadaqah", done: false, label: { id: "Sedekah harian", en: "Daily sadaqah" } },
  { id: "walk", done: true, label: { id: "Jalan 20 menit", en: "20-min walk" } },
];

function PreviewSection() {
  const { t, lang } = useI18n();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = useMemo(() => {
    const times = computePrayerTimes({
      date: now,
      lat: DEMO.lat,
      lng: DEMO.lng,
      timezone: DEMO.tz,
      method: "Kemenag",
    });
    return getNextPrayer(times, now);
  }, [now]);

  const hijri = useMemo(() => getHijriDate(), []);
  const remain = Math.max(0, next.msRemaining);
  const hh = String(Math.floor(remain / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((remain % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, "0");

  const doneCount = DEMO_HABITS.filter((h) => h.done).length;
  const pct = Math.round((doneCount / DEMO_HABITS.length) * 100);

  return (
    <section id="preview" className="relative overflow-hidden border-y border-border bg-secondary/30">
      <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-foreground">
            {t("landing.preview.eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("landing.preview.title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("landing.preview.sub")}</p>
        </div>

        <motion.div
          variants={fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_40px_100px_-50px_rgba(20,60,45,0.55)]"
        >
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <p className="ml-3 truncate text-xs text-muted-foreground">
              istiqamah.app · {hijri ? `${hijri.day} ${hijri.monthName} ${hijri.year} H` : "—"}
            </p>
            <span className="ml-auto shrink-0 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              {t("landing.preview.demo")}
            </span>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3">
            {/* next prayer */}
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4 text-primary" />
                {t("landing.preview.nextPrayer")}
              </div>
              <p className="mt-3 font-display text-2xl font-semibold">{next.name}</p>
              <p className="text-sm text-muted-foreground">
                {next.time.toLocaleTimeString(lang === "id" ? "id-ID" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                {t("landing.preview.inTime")}
              </p>
              <p className="font-display text-3xl font-bold tabular-nums text-primary">
                {hh}:{mm}:{ss}
              </p>
            </div>

            {/* habits */}
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-emerald-500" />
                  {t("landing.preview.habits")}
                </span>
                <span className="tabular-nums">
                  {doneCount}/{DEMO_HABITS.length}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <ul className="mt-4 space-y-2.5">
                {DEMO_HABITS.map((h) => (
                  <li key={h.id} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-md border",
                        h.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className={cn(h.done && "text-muted-foreground")}>{h.label[lang]}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* quran */}
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpenText className="h-4 w-4 text-primary" />
                {t("landing.preview.quran")}
              </div>
              <p className="mt-3 font-display text-3xl font-bold tabular-nums">
                128 <span className="text-base font-medium text-muted-foreground">/ 604</span>
              </p>
              <p className="text-sm text-muted-foreground">{t("landing.preview.pages")}</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  whileInView={{ width: "21%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-5 flex items-end gap-1.5">
                {[3, 5, 2, 6, 4, 7, 5].map((v, i) => (
                  <motion.span
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: v * 7 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                    className="w-full rounded-t bg-gold/70"
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">12 {t("landing.preview.streak")}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hadith of the day                                                   */
/* ------------------------------------------------------------------ */

function HadithSection() {
  const { t } = useI18n();
  const hadith = useMemo(() => getHadithOfTheDay(), []);

  return (
    <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="paper-grain relative overflow-hidden rounded-[2rem] border border-border bg-card p-7 text-center sm:p-12"
      >
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-foreground">
            {t("landing.hadith.eyebrow")}
          </p>
          <Quote className="mx-auto mt-5 h-6 w-6 text-primary/40" />
          <p className="font-arabic mt-5 text-2xl leading-[2] text-primary sm:text-3xl" dir="rtl">
            {hadith.arabic}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base italic leading-relaxed text-foreground/85 sm:text-lg">
            “{hadith.english}”
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {hadith.narrator} · {hadith.source}
          </p>
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming Islamic events                                             */
/* ------------------------------------------------------------------ */

function EventsSection() {
  const { t } = useI18n();
  const events = useMemo(() => getUpcomingIslamicEvents(4), []);
  if (events.length === 0) return null;

  return (
    <section id="events" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-foreground">
          {t("landing.events.eyebrow")}
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("landing.events.title")}
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((ev, i) => (
          <motion.div
            key={ev.name}
            variants={fade}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-gold/40"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {ev.daysUntil <= 0 ? t("landing.events.today") : `${ev.daysUntil} ${t("landing.events.inDays")}`}
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{ev.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{ev.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
