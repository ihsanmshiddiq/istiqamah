import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Plus,
  Minus,
  Trash2,
  Flame,
  Layers,
  Clock,
  BookMarked,
  CheckCircle2,
  CalendarDays,
  Target,
  BarChart3,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Card,
  Button,
  Input,
  Select,
  Field,
  Modal,
  SegmentedControl,
  EmptyState,
} from "@/components/ui/primitives";
import { ProgressRing } from "@/components/shared/progress-ring";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { QURAN_SURAHS } from "@/lib/content/islamic";
import { last7Days, shortDay, addDays, ymd, daysBetween, niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

/* ─── constants ─── */
const TOTAL_PAGES = 604;
type Tab = "baca" | "khatam";

/* ─── main page ─── */
export default function Quran() {
  const { t, lang } = useI18n();

  // Read initial tab from URL query param
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialTab = params.get("tab") === "khatam" ? "khatam" : "baca";
  const [tab, setTab] = useState<Tab>(initialTab);

  // Cross-tab data: khatam progress + last reading position
  const khatmaPlans = useTable<Row>("khatmaPlans");
  const quranLogs = useTable<Row>("quranLogs");
  const activePlan = khatmaPlans.find((p) => p.isActive && !p.completedAt);
  const totalPages = useMemo(() => quranLogs.reduce((s, l) => s + Number(l.pagesRead ?? 0), 0), [quranLogs]);

  // Find last reading position (most recent log with surah/ayah)
  const lastPosition = useMemo(() => {
    const sorted = [...quranLogs]
      .filter((l) => l.lastSurah)
      .sort((a, b) => Number(b.createdAt ?? b.date ?? 0) - Number(a.createdAt ?? a.date ?? 0));
    return sorted[0] ?? null;
  }, [quranLogs]);

  return (
    <div>
      <PageHeader
        title={t("quran.title")}
        subtitle={t("quran.subtitle")}
      />

      <CrossTabSummary
        activePlan={activePlan}
        totalPages={totalPages}
        lastPosition={lastPosition}
        lang={lang}
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "baca", label: t("quran.tab.read") },
          { value: "khatam", label: t("quran.tab.khatam") },
        ]}
        className="mb-6"
      />

      {tab === "baca" && <ReadTab />}
      {tab === "khatam" && <KhatamTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CROSS-TAB SUMMARY (always visible above tabs)
   ═══════════════════════════════════════════════════════════════════ */
function CrossTabSummary({
  activePlan,
  totalPages,
  lastPosition,
  lang,
}: {
  activePlan: Row | undefined;
  totalPages: number;
  lastPosition: Row | null;
  lang: string;
}) {
  const { t } = useI18n();

  const planDone = activePlan ? Number(activePlan.completedPages ?? 0) : 0;
  const planTotal = activePlan ? Number(activePlan.totalPages ?? TOTAL_PAGES) : TOTAL_PAGES;
  const planPct = planTotal > 0 ? Math.round((planDone / planTotal) * 100) : 0;

  const lastSurah = lastPosition?.lastSurah ? QURAN_SURAHS.find((s) => s.number === Number(lastPosition.lastSurah)) : null;
  const lastAyah = lastPosition?.lastAyah ? Number(lastPosition.lastAyah) : null;

  const hasContent = activePlan || lastPosition;
  if (!hasContent) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {/* Khatam progress mini card */}
      {activePlan && (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-2.5 text-sm backdrop-blur-sm">
          <BookMarked className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{t("quran.khatamProgress")}</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${planPct}%` }} />
              </div>
              <span className="text-xs font-medium tabular-nums text-foreground">{planDone}/{planTotal} <span className="text-muted-foreground">({planPct}%)</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Continue reading shortcut */}
      {lastPosition && lastSurah && (
        <button
          type="button"
          onClick={() => {
            // Scroll to today's log section in ReadTab
            const el = document.getElementById("quran-today-log");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {t("quran.continueReading")} <span className="font-semibold">{lastSurah.name} {lastAyah ? `: ${lastAyah}` : ""}</span>
          </span>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 1: BACA (Quran Reader) — hayat-os style
   ═══════════════════════════════════════════════════════════════════ */
function ReadTab() {
  const { t, lang } = useI18n();
  const day = todayHelper();
  const logs = useTable<Row>("quranLogs");
  const bookmarks = useTable<Row>("quranBookmarks", (r) =>
    [...r].sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0)),
  );
  const todayLog = logs.find((l) => l.date === day);

  const totalPages = useMemo(() => logs.reduce((s, l) => s + Number(l.pagesRead ?? 0), 0), [logs]);
  const totalMin = useMemo(() => logs.reduce((s, l) => s + Number(l.minutesSpent ?? 0), 0), [logs]);
  const streak = useMemo(() => {
    const days = new Set(logs.filter((l) => Number(l.pagesRead ?? 0) > 0).map((l) => String(l.date)));
    let cur = 0, d = ymd(new Date());
    if (!days.has(d)) d = addDays(d, -1);
    for (let i = 0; i < 400; i++) {
      if (days.has(d)) { cur++; d = addDays(d, -1); } else break;
    }
    return cur;
  }, [logs]);

  const week = useMemo(() => {
    const days = last7Days();
    const map = new Map(logs.map((l) => [String(l.date), Number(l.pagesRead ?? 0)]));
    return days.map((d) => ({ date: d, pages: map.get(d) ?? 0 }));
  }, [logs]);
  const maxWeek = Math.max(1, ...week.map((w) => w.pages));

  const patchToday = useCallback(async (patch: Partial<Row>) => {
    await upsert("quranLogs", { id: todayLog ? String(todayLog.id) : uid(), date: day, ...patch });
  }, [todayLog, day]);

  const stepPages = useCallback(async (delta: number) => {
    const next = Math.max(0, Number(todayLog?.pagesRead ?? 0) + delta);
    await patchToday({ pagesRead: next });
  }, [todayLog, patchToday]);

  const overallPct = Math.min(100, Math.round((totalPages / TOTAL_PAGES) * 100));

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Layers} label={t("quran.totalPages")} value={totalPages} accent="text-primary" />
        <Stat icon={Flame} label={t("quran.streak")} value={`${streak} ${t("quran.days")}`} accent="text-amber-500" />
        <Stat icon={BookOpen} label={t("quran.pagesToday")} value={Number(todayLog?.pagesRead ?? 0)} accent="text-emerald-500" />
        <Stat icon={Clock} label={t("quran.minutesTotal")} value={totalMin} accent="text-sky-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Today's log */}
        <Card id="quran-today-log" className="relative overflow-hidden p-6">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <h3 className="mb-4 font-display text-lg font-semibold">{t("quran.logToday")}</h3>

            <div className="mb-5 flex items-center justify-between rounded-2xl bg-muted/50 p-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("quran.pagesRead")}</p>
                <p className="font-display text-3xl font-bold tabular-nums">
                  <AnimatedNumber value={Number(todayLog?.pagesRead ?? 0)} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => void stepPages(-1)}><Minus className="h-4 w-4" /></Button>
                <Button size="icon" onClick={() => void stepPages(1)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t("quran.ayahsRead")}>
                <Input type="number" min={0} value={Number(todayLog?.ayahsRead ?? 0)} onChange={(e) => void patchToday({ ayahsRead: Math.max(0, Number(e.target.value)) })} />
              </Field>
              <Field label={t("quran.minutes")}>
                <Input type="number" min={0} value={Number(todayLog?.minutesSpent ?? 0)} onChange={(e) => void patchToday({ minutesSpent: Math.max(0, Number(e.target.value)) })} />
              </Field>
              <Field label={t("quran.lastSurah")}>
                <Select value={String(todayLog?.lastSurah ?? "")} onChange={(e) => void patchToday({ lastSurah: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {QURAN_SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
                </Select>
              </Field>
              <Field label={t("quran.lastAyah")}>
                <Input type="number" min={0} value={Number(todayLog?.lastAyah ?? 0)} onChange={(e) => void patchToday({ lastAyah: Math.max(0, Number(e.target.value)) })} />
              </Field>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Overall progress */}
          <Card className="relative overflow-hidden p-6">
            <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t("quran.overall")}</h3>
                <span className="text-sm text-muted-foreground">{totalPages} / {TOTAL_PAGES}</span>
              </div>
              <div className="flex items-center gap-6">
                <ProgressRing value={overallPct / 100} size={100} strokeWidth={8}>
                  <span className="text-lg font-bold">{overallPct}%</span>
                </ProgressRing>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t("quran.ofMushaf")}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${overallPct}%` }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 7-day chart */}
          <Card className="relative overflow-hidden p-6">
            <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t("quran.last7days")}</h3>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex h-32 items-end justify-between gap-2">
                {week.map((w) => (
                  <div key={w.date} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <motion.div
                        className={cn("w-full rounded-t-md", w.pages > 0 ? "bg-primary" : "bg-muted")}
                        initial={{ height: 0 }}
                        animate={{ height: `${(w.pages / maxWeek) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ minHeight: 4 }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{shortDay(w.date, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bookmarks */}
      <Card className="relative overflow-hidden p-6">
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
        <div className="relative">
          <h3 className="mb-4 font-display text-lg font-semibold">{t("quran.bookmarks")}</h3>
          {bookmarks.length === 0 ? (
            <div className="rounded-xl bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              {t("quran.noBookmarks")}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bookmarks.map((b) => {
                const s = QURAN_SURAHS.find((x) => x.number === Number(b.surah));
                return (
                  <div key={String(b.id)} className="group flex items-start justify-between gap-2 rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{String(b.surah)}</span>
                      <div>
                        <p className="font-medium">{s?.name ?? `Surah ${b.surah}`} : {String(b.ayah)}</p>
                        {b.note ? <p className="mt-0.5 text-sm text-muted-foreground">{String(b.note)}</p> : null}
                      </div>
                    </div>
                    <button onClick={() => void remove("quranBookmarks", String(b.id))} className="text-muted-foreground/40 opacity-0 transition group-hover:opacity-100 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 2: KHATAM (Completion Tracker) — hayat-os khatma-view style
   ═══════════════════════════════════════════════════════════════════ */
function KhatamTab() {
  const { t, lang } = useI18n();
  const plans = useTable<Row>("khatmaPlans", (r) =>
    [...r].sort((a, b) => Number(b.isActive) - Number(a.isActive) || Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)),
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">{t("khatma.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("khatma.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("khatma.new")}</Button>
      </div>

      {plans.length === 0 ? (
        <Card className="relative overflow-hidden p-8">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BookMarked className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">{t("khatma.empty")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("empty.khatma.desc")}</p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t("khatma.new")}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {plans.map((p) => (
              <motion.div
                key={String(p.id)}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <PlanCard key={String(p.id)} plan={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <NewPlanModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ─── Plan Card — hayat-os khatma-view style ─── */
function PlanCard({ plan }: { plan: Row }) {
  const { t, lang } = useI18n();
  const total = Number(plan.totalPages ?? TOTAL_PAGES);
  const done = Math.min(total, Number(plan.completedPages ?? 0));
  const pct = total > 0 ? done / total : 0;
  const remaining = total - done;

  const startDate = String(plan.startDate);
  const targetDays = Number(plan.targetDays ?? 30);
  const today = ymd(new Date());
  const dayIndex = Math.max(0, daysBetween(startDate, today));
  const daysLeft = Math.max(0, targetDays - dayIndex);
  const dailyTarget = Math.max(1, Math.ceil(remaining / Math.max(1, daysLeft)));
  const projectedFinish = addDays(today, daysLeft);
  const isDone = done >= total;
  const daysWord = lang === "id" ? "hari" : "days";
  const pagesWord = lang === "id" ? "hlm" : "pg";

  const step = useCallback(async (delta: number) => {
    const next = Math.max(0, Math.min(total, done + delta));
    await upsert("khatmaPlans", {
      id: String(plan.id),
      completedPages: next,
      completedAt: next >= total ? (plan.completedAt ? String(plan.completedAt) : today) : null,
      isActive: next >= total ? false : Boolean(plan.isActive),
    });
  }, [plan.id, total, done, plan.completedAt, plan.isActive, today]);

  return (
    <Card className={cn("relative overflow-hidden p-6", isDone && "ring-1 ring-primary/30")}>
      <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 shrink-0 text-primary" />
              <h3 className="truncate font-display text-lg font-semibold">{String(plan.name)}</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("khatma.progress")}: {done} / {total}
            </p>
          </div>
          <button
            onClick={() => void remove("khatmaPlans", String(plan.id))}
            className="text-muted-foreground/40 transition hover:text-destructive"
            aria-label="delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-5">
          <div className="relative">
            <ProgressRing value={pct} size={92} strokeWidth={8}>
              <span className="font-display text-xl font-bold tabular-nums">
                <AnimatedNumber value={Math.round(pct * 100)} suffix="%" />
              </span>
            </ProgressRing>
            {isDone && (
              <div className="absolute -right-1 -top-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            {isDone ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" /> {t("khatma.completed")}
              </div>
            ) : (
              <>
                <MetaRow icon={Target} label={t("khatma.dailyTarget")} value={`${dailyTarget} ${pagesWord}`} />
                <MetaRow icon={CalendarDays} label={t("khatma.daysLeft")} value={`${daysLeft} ${daysWord}`} />
                <MetaRow icon={CalendarDays} label="Target" value={niceDate(projectedFinish, lang)} />
              </>
            )}
          </div>
        </div>

        {!isDone && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => void step(-dailyTarget)}><Minus className="h-4 w-4" /></Button>
            <Button className="flex-1" onClick={() => void step(dailyTarget)}>
              <Plus className="h-4 w-4" /> {t("khatma.markRead")} ({dailyTarget})
            </Button>
          </div>
        )}

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>
    </Card>
  );
}

/* ─── Shared sub-components ─── */

function Stat({ icon: Icon, label, value, accent }: { icon: typeof BookOpen; label: string; value: number | string; accent: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
      <div className="relative">
        <Icon className={cn("mb-2 h-5 w-5", accent)} />
        <p className="font-display text-2xl font-bold tabular-nums">
          <AnimatedNumber value={typeof value === "number" ? value : parseInt(String(value)) || 0} />
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function NewPlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState("Khatma");
  const [days, setDays] = useState(30);

  useEffect(() => { if (open) { setName("Khatma"); setDays(30); } }, [open]);

  const dailyPreview = useMemo(() => Math.ceil(TOTAL_PAGES / Math.max(1, days)), [days]);

  async function save() {
    await upsert("khatmaPlans", {
      id: uid(),
      name: name.trim() || "Khatma",
      startPage: 1,
      endPage: TOTAL_PAGES,
      totalPages: TOTAL_PAGES,
      startDate: ymd(new Date()),
      targetDays: Math.max(1, days),
      completedPages: 0,
      isActive: true,
      createdAt: Date.now(),
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("khatma.new")}>
      <div className="space-y-4">
        <Field label={t("khatma.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("khatma.targetDays")}>
          <Input type="number" min={1} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} />
        </Field>
        <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          {t("khatma.dailyTarget")}: <span className="font-semibold text-foreground tabular-nums">{dailyPreview} {lang === "id" ? "hlm/hari" : "pg/day"}</span>
        </div>
        <Button className="w-full" onClick={save}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}
