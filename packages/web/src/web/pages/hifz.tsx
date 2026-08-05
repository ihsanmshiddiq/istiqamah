import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  BookOpenText,
  Plus,
  Trash2,
  RotateCcw,
  Target,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable, useSingleton } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Card,
  Button,
  Input,
  Field,
  Modal,
  SegmentedControl,
  Textarea,
  EmptyState,
} from "@/components/ui/primitives";
import { ProgressRing } from "@/components/shared/progress-ring";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { PAGES_PER_JUZ, addDays, ymd } from "@/lib/domain";
import { cn } from "@/lib/utils";

export default function Hifz() {
  const { t, lang } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const hifdzOn = profile?.hifdzEnabled ?? true;

  return (
    <div>
      <PageHeader title={t("hifdz.title")} subtitle={t("hifdz.subtitle")} />

      {hifdzOn ? (
        <HifdzContent />
      ) : (
        <Card className="relative overflow-hidden p-8">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpenText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">{t("hifdz.disabled")}</h3>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HIFDZ CONTENT — hayat-os hifz-view style
   ═══════════════════════════════════════════════════════════════════ */
function HifdzContent() {
  const { t, lang } = useI18n();
  const settings = useSingleton<Row>("hifdzSettings");
  const logs = useTable<Row>("hifdzLogs", (r) =>
    [...r].sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)),
  );
  const reviews = useTable<Row>("murajaah", (r) =>
    [...r].sort((a, b) => (String(a.nextDue) < String(b.nextDue) ? -1 : 1)),
  );
  const day = todayHelper();
  const [logOpen, setLogOpen] = useState(false);
  const [murOpen, setMurOpen] = useState(false);

  const totalPages = logs
    .filter((l) => l.type === "new")
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const todayPages = logs.filter((l) => l.date === day).reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const daily = Number(settings?.dailyPages ?? 1);
  const totalJuz = totalPages / PAGES_PER_JUZ;

  /* ─── heatmap data ─── */
  const heatmapData = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const l of logs) {
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
  }, [logs]);

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
      {/* Hero Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden p-5">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("hifdz.todayProgress")}</p>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Flame className="h-3.5 w-3.5" />
                  {streak} {t("dash.days")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ProgressRing value={daily ? todayPages / daily : 0} size={72} strokeWidth={6}>
                <BookOpenText className="h-6 w-6 text-primary" />
              </ProgressRing>
              <div>
                <p className="font-display text-3xl font-bold">
                  <AnimatedNumber value={todayPages} />
                </p>
                <p className="text-sm text-muted-foreground">/ {daily} {t("hifdz.pages")}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("hifdz.totalJuz")}</p>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-display text-3xl font-bold">
              <AnimatedNumber value={Math.round(totalJuz * 10) / 10} />
            </p>
            <p className="text-xs text-muted-foreground">
              {totalPages} {t("hifdz.totalPages")}
            </p>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <p className="mb-3 text-sm text-muted-foreground">{t("hifdz.settings")}</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t("hifdz.dailyTarget")}</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={String(settings?.dailyPages ?? 1)}
                  onChange={(e) => void setSingleton("hifdzSettings", { dailyPages: Number(e.target.value) })}
                  className="h-8 w-20 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t("hifdz.weeklyTarget")}</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={String(settings?.weeklyPages ?? 5)}
                  onChange={(e) => void setSingleton("hifdzSettings", { weeklyPages: Number(e.target.value) })}
                  className="h-8 w-20 text-right"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="relative overflow-hidden p-5">
        <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{t("dash.section.hifz")}</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <ConsistencyHeatmap data={heatmapData} color="violet" weeks={12} />
          <p className="mt-3 text-[10px] text-muted-foreground/60">
            {t("analytics.last30")}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Murajaah */}
        <Card className="relative overflow-hidden p-5">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                <RotateCcw className="h-5 w-5" /> {t("hifdz.murajaah")}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setMurOpen(true)}>
                <Plus className="h-4 w-4" /> {t("hifdz.murajaah.add")}
              </Button>
            </div>
            {reviews.length === 0 ? (
              <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">{t("empty.murajaah.desc")}</p>
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
                          due ? "border-amber-500/50 bg-amber-500/10" : "border-border",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{String(m.label)}</p>
                          <p className="text-xs text-muted-foreground">
                            {due ? t("hifdz.murajaah.due") : `${t("hifdz.murajaah.next")}: ${String(m.nextDue)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant={due ? "gold" : "soft"} onClick={() => void reviewNow(m)}>
                            {t("hifdz.murajaah.reviewed")}
                          </Button>
                          <button
                            onClick={() => void remove("murajaah", String(m.id))}
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
              <h3 className="font-display text-lg font-semibold">{t("hifdz.recent")}</h3>
              <Button size="sm" onClick={() => setLogOpen(true)}>
                <Plus className="h-4 w-4" /> {t("hifdz.logNew")}
              </Button>
            </div>
            {logs.length === 0 ? (
              <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
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
                          {l.type === "murajaah" ? t("hifdz.type.murajaah") : t("hifdz.type.new")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">
                          {Number(l.pages)} {t("hifdz.pages")}
                        </span>
                        <button
                          onClick={() => void remove("hifdzLogs", String(l.id))}
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

      <LogHifdzModal open={logOpen} onClose={() => setLogOpen(false)} />
      <AddMurajaahModal open={murOpen} onClose={() => setMurOpen(false)} />
    </div>
  );
}

/* ─── Modals ─── */

function LogHifdzModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            <Input type="number" step="0.5" min="0" value={pages} onChange={(e) => setPages(e.target.value)} />
          </Field>
          <Field label={t("hifdz.surah")}>
            <Input value={surah} onChange={(e) => setSurah(e.target.value)} placeholder="Al-Baqarah" />
          </Field>
        </div>
        <Field label={t("hifdz.ayahRange")}>
          <Input value={ayah} onChange={(e) => setAyah(e.target.value)} placeholder="1-10" />
        </Field>
        <Field label={t("hifdz.note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}

function AddMurajaahModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("hifdz.murajaah.labelPlaceholder")} />
        </Field>
        <Field label={t("hifdz.murajaah.interval")}>
          <Input type="number" min="1" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save} disabled={!label.trim()}>
          {t("common.add")}
        </Button>
      </div>
    </Modal>
  );
}
