import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  BookOpenText,
  Plus,
  Trash2,
  RotateCcw,
  Target,
  TrendingUp,
  X,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable, useSingleton } from "@/hooks/use-store";
import {
  upsert,
  remove,
  setSingleton,
  uid,
  today as todayHelper,
  type Row,
} from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Card,
  Button,
  Input,
  Field,
  Modal,
  SegmentedControl,
  Textarea,
} from "@/components/ui/primitives";
import { ProgressRing } from "@/components/shared/progress-ring";
import { AnimatedNumber } from "@/components/shared/animated-number";

import {
  PAGES_PER_JUZ,
  juzPages,
  juzPageCount,
  addDays,
  ymd,
  type PageStatus,
  PAGE_STATUS_ORDER,
  PAGE_STATUS_META,
  cyclePageStatus,
  parseJsonSafe,
} from "@/lib/domain";
import { SURAHS } from "@/lib/content/islamic";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════ */

export default function Hifz() {
  const { t } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const hifdzOn = profile?.hifdzEnabled ?? true;

  return (
    <div>
      <PageHeader title={t("hifdz.title")} subtitle={t("hifz.subtitle")} />
      {hifdzOn ? (
        <HifdzContent />
      ) : (
        <Card className="relative overflow-hidden p-8">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpenText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">
              {t("hifdz.disabled")}
            </h3>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HIFDZ CONTENT
   ═══════════════════════════════════════════════════════════════════ */
function HifdzContent() {
  const { t } = useI18n();
  const settings = useSingleton<Row>("hifdzSettings");
  const logs = useTable<Row>("hifdzLogs", (r) =>
    [...r].sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)),
  );
  const reviews = useTable<Row>("murajaah", (r) =>
    [...r].sort(
      (a, b) => (String(a.nextDue) < String(b.nextDue) ? -1 : 1),
    ),
  );
  const day = todayHelper();
  const [logOpen, setLogOpen] = useState(false);
  const [murOpen, setMurOpen] = useState(false);

  /* ─── Target unit preferences ─── */
  const dailyUnit = String(settings?.dailyUnit ?? "halaman");
  const weeklyUnit = String(settings?.weeklyUnit ?? "halaman");

  /* ─── Parse JSON fields from hifdzSettings ─── */
  const focusJuz: number[] = useMemo(
    () => parseJsonSafe<number[]>(settings?.focusJuz, []),
    [settings?.focusJuz],
  );
  const pageStatuses: Record<string, PageStatus> = useMemo(
    () => parseJsonSafe<Record<string, PageStatus>>(settings?.pageStatuses, {}),
    [settings?.pageStatuses],
  );

  /* ─── Derived stats ─── */
  const totalPages = logs
    .filter((l) => l.type === "new")
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const todayPages = logs
    .filter((l) => l.date === day)
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const daily = Number(settings?.dailyPages ?? 1);
  const totalJuz = totalPages / PAGES_PER_JUZ;

  /* ─── Count memorized pages from pageStatuses ─── */
  const memorizedPageCount = useMemo(() => {
    let count = 0;
    for (const key in pageStatuses) {
      const st = pageStatuses[key];
      if (st === "memorized" || st === "mutqin") count++;
    }
    return count;
  }, [pageStatuses]);

  const focusJuzCount = focusJuz.length;



  /* ─── streak ─── */
  const streak = useMemo(() => {
    const doneDates = new Set(
      logs
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
  }, [logs]);

  async function reviewNow(m: Row) {
    const interval = Number(m.intervalDays ?? 3);
    await upsert("murajaah", {
      id: String(m.id),
      lastReviewed: day,
      nextDue: addDays(day, interval),
      strength: Math.min(5, Number(m.strength ?? 1) + 1),
    });
  }

  return (
    <div className="space-y-6">
      {/* ═══ 1. STATISTIK RINGKAS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today Progress */}
        <Card className="relative overflow-hidden p-4">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("hifdz.todayProgress")}
              </p>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Flame className="h-3 w-3" />
                  {streak} {t("dash.days")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing
                value={daily ? todayPages / daily : 0}
                size={56}
                strokeWidth={5}
              >
                <BookOpenText className="h-4 w-4 text-primary" />
              </ProgressRing>
              <div>
                <p className="font-display text-2xl font-bold tabular-nums">
                  <AnimatedNumber value={todayPages} />
                </p>
                <p className="text-[10px] text-muted-foreground">
                  / {daily} {dailyUnit}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Total Pages */}
        <Card className="relative overflow-hidden p-4">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <p className="mb-2 text-xs text-muted-foreground">
              {t("hifdz.totalPages")}
            </p>
            <p className="font-display text-2xl font-bold tabular-nums">
              <AnimatedNumber value={totalPages} />
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("hifdz.totalJuz")}:{" "}
              <span className="font-semibold text-foreground">
                {totalJuz.toFixed(1)}
              </span>
            </p>
          </div>
        </Card>

        {/* Memorized Pages (from page tracker) */}
        <Card className="relative overflow-hidden p-4">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <p className="mb-2 text-xs text-muted-foreground">
              {t("hifdz.memorizedPages")}
            </p>
            <p className="font-display text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              <AnimatedNumber value={memorizedPageCount} />
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("hifdz.ofTotalPages")} 604
            </p>
          </div>
        </Card>

        {/* Focus Juz count */}
        <Card className="relative overflow-hidden p-4">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <p className="mb-2 text-xs text-muted-foreground">
              {t("hifdz.focusJuz")}
            </p>
            <p className="font-display text-2xl font-bold tabular-nums text-primary">
              <AnimatedNumber value={focusJuzCount} />
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("hifdz.juzInTrack")}
            </p>
          </div>
        </Card>
      </div>

      {/* ═══ 2. TARGET HAFALAN ═══ */}
      <Card className="relative overflow-hidden p-5">
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
        <div className="relative">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            {t("hifdz.settings")}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {t("hifdz.dailyTarget")}
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={String(settings?.dailyPages ?? 1)}
                  onChange={(e) =>
                    void setSingleton("hifdzSettings", {
                      dailyPages: Number(e.target.value),
                    })
                  }
                  className="h-8 w-16 text-right"
                />
                <select
                  className="h-8 rounded-lg border border-border bg-background px-1.5 text-xs"
                  value={dailyUnit}
                  onChange={(e) =>
                    void setSingleton("hifdzSettings", {
                      dailyUnit: e.target.value,
                    })
                  }
                >
                  <option value="halaman">Halaman</option>
                  <option value="ayat">Ayat</option>
                  <option value="juz">Juz</option>
                  <option value="surat">Surat</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {t("hifdz.weeklyTarget")}
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={String(settings?.weeklyPages ?? 5)}
                  onChange={(e) =>
                    void setSingleton("hifdzSettings", {
                      weeklyPages: Number(e.target.value),
                    })
                  }
                  className="h-8 w-16 text-right"
                />
                <select
                  className="h-8 rounded-lg border border-border bg-background px-1.5 text-xs"
                  value={weeklyUnit}
                  onChange={(e) =>
                    void setSingleton("hifdzSettings", {
                      weeklyUnit: e.target.value,
                    })
                  }
                >
                  <option value="halaman">Halaman</option>
                  <option value="ayat">Ayat</option>
                  <option value="juz">Juz</option>
                  <option value="surat">Surat</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ 3. MURAJAAH + RECENT ═══ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Murajaah */}
        <Card className="relative overflow-hidden p-5">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                <RotateCcw className="h-5 w-5" /> {t("hifdz.murajaah")}
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMurOpen(true)}
              >
                <Plus className="h-4 w-4" /> {t("hifdz.murajaah.add")}
              </Button>
            </div>
            {reviews.length === 0 ? (
              <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("empty.murajaah.desc")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {reviews.map((m) => {
                    const due = String(m.nextDue) <= day;
                    return (
                      <motion.div
                        key={String(m.id)}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border p-3",
                          due
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-border",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {String(m.label)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {due
                              ? t("hifdz.murajaah.due")
                              : `${t("hifdz.murajaah.next")}: ${String(m.nextDue)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={due ? "gold" : "soft"}
                            onClick={() => void reviewNow(m)}
                          >
                            {t("hifdz.murajaah.reviewed")}
                          </Button>
                          <button
                            onClick={() =>
                              void remove("murajaah", String(m.id))
                            }
                            className="text-muted-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </Card>

        {/* Recent logs */}
        <Card className="relative overflow-hidden p-5">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">
                {t("hifdz.recent")}
              </h3>
              <Button size="sm" onClick={() => setLogOpen(true)}>
                <Plus className="h-4 w-4" /> {t("hifdz.logNew")}
              </Button>
            </div>
            {logs.length === 0 ? (
              <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("common.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {logs.slice(0, 12).map((l) => (
                    <motion.div
                      key={String(l.id)}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {String(l.surah || "—")}
                          {l.ayahRange ? ` · ${String(l.ayahRange)}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {String(l.date)} ·{" "}
                          {l.type === "murajaah"
                            ? t("hifdz.type.murajaah")
                            : t("hifdz.type.new")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">
                          {Number(l.pages)} {t("hifdz.pages")}
                        </span>
                        <button
                          onClick={() =>
                            void remove("hifdzLogs", String(l.id))
                          }
                          className="text-muted-foreground/40 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ═══ 4. JUZ & HALAMAN TRACKER ═══ */}
      <JuzPageTracker
        focusJuz={focusJuz}
        pageStatuses={pageStatuses}
        settings={settings}
        t={t}
      />

      {/* ═══ 5. AYAT TRACKER ═══ */}
      <AyatTracker logs={logs} t={t} />



      {/* ═══ MODALS ═══ */}
      <LogHifdzModal open={logOpen} onClose={() => setLogOpen(false)} />
      <AddMurajaahModal open={murOpen} onClose={() => setMurOpen(false)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   JUZ & PAGE TRACKER
   ═══════════════════════════════════════════════════════════════════ */
function JuzPageTracker({
  focusJuz,
  pageStatuses,
  settings,
  t,
}: {
  focusJuz: number[];
  pageStatuses: Record<string, PageStatus>;
  settings: Row | undefined;
  t: (key: string) => string;
}) {
  const [selJuz, setSelJuz] = useState<number>(focusJuz[0] ?? 1);
  const [addJuzVal, setAddJuzVal] = useState(3);
  const [expanded, setExpanded] = useState(true);

  const addFocusJuz = () => {
    if (focusJuz.includes(addJuzVal)) return;
    const next = [...focusJuz, addJuzVal].sort((a, b) => a - b);
    setSingleton("hifdzSettings", { focusJuz: JSON.stringify(next) });
    setSelJuz(addJuzVal);
  };

  const removeFocusJuz = (j: number) => {
    const next = focusJuz.filter((x) => x !== j);
    setSingleton("hifdzSettings", { focusJuz: JSON.stringify(next) });
    if (selJuz === j && next.length > 0) setSelJuz(next[0]);
  };

  const cyclePage = (juz: number, page: number) => {
    const key = `${juz}:${page}`;
    const cur = (pageStatuses[key] ?? "none") as PageStatus;
    const next = cyclePageStatus(cur);
    const updated = { ...pageStatuses, [key]: next };
    setSingleton("hifdzSettings", { pageStatuses: JSON.stringify(updated) });
  };

  /* ─── Summary for selected juz ─── */
  const juzSummary = useMemo(() => {
    const list = juzPages(selJuz);
    const counts: Record<PageStatus, number> = {
      none: 0,
      memorized: 0,
      weak: 0,
      mutqin: 0,
    };
    list.forEach((p) => {
      const st = (pageStatuses[`${selJuz}:${p}`] ?? "none") as PageStatus;
      counts[st]++;
    });
    return counts;
  }, [selJuz, pageStatuses]);

  return (
    <Card className="relative overflow-hidden">
      <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
      <div className="relative">
        {/* Header */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between p-5 pb-0"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </span>
            <div className="text-left">
              <h3 className="font-display text-base font-semibold">
                {t("hifdz.juzPageTracker")}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t("hifdz.juzPageTrackerSub")}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 space-y-4">
                {/* ─── Focus Juz chips ─── */}
                <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("hifdz.focusJuz")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        className="h-7 rounded-lg border border-border bg-background px-2 text-xs"
                        value={addJuzVal}
                        onChange={(e) =>
                          setAddJuzVal(Number(e.target.value))
                        }
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1)
                          .filter((n) => !focusJuz.includes(n))
                          .map((n) => (
                            <option key={n} value={n}>
                              Juz {n}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={addFocusJuz}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        <Plus className="h-3 w-3" /> {t("common.add")}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {focusJuz.map((n) => (
                      <div
                        key={n}
                        className={cn(
                          "group flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-xs font-semibold transition",
                          selJuz === n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50",
                        )}
                      >
                        <button onClick={() => setSelJuz(n)}>
                          Juz {n}
                        </button>
                        <button
                          onClick={() => removeFocusJuz(n)}
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center transition",
                            selJuz === n
                              ? "hover:bg-white/20"
                              : "hover:bg-destructive/20 hover:text-destructive",
                          )}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    {focusJuz.length === 0 && (
                      <span className="text-xs text-muted-foreground py-1">
                        {t("hifdz.noFocusJuz")}
                      </span>
                    )}
                  </div>
                </div>

                {/* ─── Juz selector ─── */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("hifdz.selectJuz")}
                  </span>
                  <select
                    className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
                    value={selJuz}
                    onChange={(e) => setSelJuz(Number(e.target.value))}
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          Juz {n}
                        </option>
                      ),
                    )}
                  </select>
                  <span className="text-[11px] text-muted-foreground">
                    {juzPageCount(selJuz)} {t("hifdz.pages")}
                  </span>
                </div>

                {/* ─── Status summary ─── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAGE_STATUS_ORDER.map((st) => {
                    const meta = PAGE_STATUS_META[st];
                    return (
                      <div
                        key={st}
                        className={cn("rounded-xl px-3 py-2.5", meta.bg)}
                      >
                        <p
                          className={cn(
                            "font-display text-xl font-bold tabular-nums",
                            meta.color,
                          )}
                        >
                          {juzSummary[st]}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <span
                            className={cn("h-2 w-2 rounded-full", meta.bg.replace("/15", ""))}
                          />
                          {meta.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* ─── Page grid ─── */}
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
                  {juzPages(selJuz).map((p) => {
                    const st =
                      (pageStatuses[`${selJuz}:${p}`] ??
                        "none") as PageStatus;
                    const meta = PAGE_STATUS_META[st];
                    return (
                      <motion.button
                        key={p}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => cyclePage(selJuz, p)}
                        title={`Halaman ${p} · ${meta.label}`}
                        className={cn(
                          "aspect-square rounded-xl flex flex-col items-center justify-center transition-all border hover:scale-105",
                          meta.bg,
                          st === "none" ? "border-border" : "border-transparent",
                        )}
                      >
                        <span
                          className={cn(
                            "font-display text-xs font-bold tabular-nums",
                            meta.color,
                          )}
                        >
                          {p}
                        </span>
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full mt-0.5", meta.bg.replace("/15", ""))}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{t("hifdz.clickToCycle")}:</span>
                  {PAGE_STATUS_ORDER.map((st) => {
                    const meta = PAGE_STATUS_META[st];
                    return (
                      <span key={st} className="flex items-center gap-1">
                        <span
                          className={cn("h-2.5 w-2.5 rounded-full", meta.bg.replace("/15", ""))}
                        />
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AYAT TRACKER
   ═══════════════════════════════════════════════════════════════════ */
function AyatTracker({
  logs,
  t,
}: {
  logs: Row[];
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(true);

  /* ─── Aggregate ayat data from logs ─── */
  const surahData = useMemo(() => {
    const map = new Map<number, { surah: number; name: string; arabic: string; ranges: Set<string>; totalAyahs: number }>();
    for (const l of logs) {
      if (!l.surah || !l.ayahRange) continue;
      const surahNum = Number(l.surah);
      if (!surahNum || isNaN(surahNum)) continue;
      const existing = map.get(surahNum);
      const rangeStr = String(l.ayahRange);
      if (existing) {
        existing.ranges.add(rangeStr);
      } else {
        const surahInfo = SURAHS.find((s) => s.number === surahNum);
        map.set(surahNum, {
          surah: surahNum,
          name: surahInfo?.name ?? `Surah ${surahNum}`,
          arabic: surahInfo?.arabic ?? "",
          ranges: new Set([rangeStr]),
          totalAyahs: surahInfo?.ayahs ?? 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.surah - b.surah);
  }, [logs]);

  const totalAyahs = surahData.reduce((sum, s) => sum + s.ranges.size, 0);

  return (
    <Card className="relative overflow-hidden">
      <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
      <div className="relative">
        {/* Header */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between p-5 pb-0"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <BookOpenText className="h-4 w-4" />
            </span>
            <div className="text-left">
              <h3 className="font-display text-base font-semibold">
                {t("hifdz.ayatTracker")}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t("hifdz.ayatTrackerSub")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {t("hifdz.ayatCount", { n: String(totalAyahs) })}
            </span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5">
                {surahData.length === 0 ? (
                  <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("hifdz.ayatTrackerEmpty")}
                    </p>
                  </div>
                ) : (
                <>
                {/* Surah cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {surahData.map((s) => (
                    <motion.div
                      key={s.surah}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 rounded-xl border border-border p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                        {s.surah}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.ranges.size} rentang · {s.totalAyahs > 0 ? `${s.totalAyahs} ayat` : ""}
                        </p>
                      </div>
                      {s.arabic && (
                        <span className="text-arabic text-xs text-muted-foreground/60 truncate max-w-[60px]">
                          {s.arabic}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground/60">
                  {t("hifdz.surahCount", { n: String(surahData.length) })}
                </p>
                </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODALS
   ═══════════════════════════════════════════════════════════════════ */

function LogHifdzModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const day = todayHelper();
  const [type, setType] = useState<"new" | "murajaah">("new");
  const [pages, setPages] = useState("1");
  const [surah, setSurah] = useState("");
  const [ayah, setAyah] = useState("");
  const [note, setNote] = useState("");

  async function save() {
    await upsert("hifdzLogs", {
      id: uid(),
      date: day,
      type,
      pages: Number(pages),
      surah: surah || null,
      ayahRange: ayah || null,
      note: note || null,
    });
    setPages("1");
    setSurah("");
    setAyah("");
    setNote("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("hifdz.logNew")}>
      <div className="space-y-4">
        <Field label={t("hifdz.type")}>
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { value: "new", label: t("hifdz.type.new") },
              { value: "murajaah", label: t("hifdz.type.murajaah") },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("hifdz.pages")}>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
            />
          </Field>
          <Field label={t("hifdz.surah")}>
            <Input
              value={surah}
              onChange={(e) => setSurah(e.target.value)}
              placeholder="Al-Baqarah"
            />
          </Field>
        </div>
        <Field label={t("hifdz.ayahRange")}>
          <Input
            value={ayah}
            onChange={(e) => setAyah(e.target.value)}
            placeholder="1-10"
          />
        </Field>
        <Field label={t("hifdz.note")}>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Button className="w-full" onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}

function AddMurajaahModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const day = todayHelper();
  const [label, setLabel] = useState("");
  const [interval, setInterval] = useState("3");

  async function save() {
    if (!label.trim()) return;
    await upsert("murajaah", {
      id: uid(),
      label: label.trim(),
      intervalDays: Number(interval),
      lastReviewed: day,
      nextDue: addDays(day, Number(interval)),
      strength: 1,
    });
    setLabel("");
    setInterval("3");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("hifdz.murajaah.add")}>
      <div className="space-y-4">
        <Field label={t("hifdz.murajaah.label")}>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("hifdz.murajaah.labelPlaceholder")}
          />
        </Field>
        <Field label={t("hifdz.murajaah.interval")}>
          <Input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          />
        </Field>
        <Button
          className="w-full"
          onClick={save}
          disabled={!label.trim()}
        >
          {t("common.add")}
        </Button>
      </div>
    </Modal>
  );
}
