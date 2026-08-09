import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Repeat,
  Plus,
  Check,
  Flame,
  Trash2,
  Activity,
  Sparkles,
  BookOpen,
  Heart,
  Droplets,
  Dumbbell,
  Moon,
  Users,
  Sunrise,
  HandHeart,
  Library,
  Pencil,
  X,
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Shield,
  Zap,
  Coffee,
  Footprints,
  Music,
  Code,
  Apple,
  Bike,
  BedDouble,
  AlarmClock,
  HandCoins,
} from "lucide-react";
import * as Icons from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Button, Card, Field, Input, Label, Modal, Select, EmptyState, Textarea } from "@/components/ui/primitives";

import { HABIT_SUGGESTIONS, HABIT_COLORS, habitStreak, last7Days, shortDay, ymd } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { playCheck, playComplete } from "@/lib/sounds";

/* ── Dynamic icon helper ── */
function DynIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Sparkles;
  return <Cmp className={className} />;
}

/* ── Category definitions ── */
const CATEGORIES = [
  { id: "all", label: "Semua", icon: "Sparkles" },
  { id: "worship", label: "Ibadah", icon: "Heart" },
  { id: "knowledge", label: "Ilmu", icon: "BookOpen" },
  { id: "health", label: "Kesehatan", icon: "Dumbbell" },
  { id: "general", label: "Umum", icon: "Sparkles" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

/* ═══════════════════════════════════════════ */
/* MAIN HABITS COMPONENT                       */
/* ═══════════════════════════════════════════ */
export default function Habits() {
  const { t, lang } = useI18n();
  const habits = useTable<Row>("habits", (r) =>
    [...r].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
  );
  const logs = useTable<Row>("habitLogs");
  const days = last7Days();
  const day = todayHelper();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [filterCat, setFilterCat] = useState<CategoryId | null>(null);

  /* ── Log index for quick lookup ── */
  const logIndex = useMemo(() => {
    const m = new Map<string, Row>();
    for (const l of logs) m.set(`${l.habitId}:${l.date}`, l);
    return m;
  }, [logs]);

  /* ── Filtered habits ── */
  const filteredHabits = useMemo(() => {
    if (!filterCat || filterCat === "all") return habits;
    return habits;
  }, [habits, filterCat]);

  /* ── Skip reason modal state ── */
  const [skipModal, setSkipModal] = useState<{ habitId: string; date: string } | null>(null);
  const [skipReason, setSkipReason] = useState("");

  /* ── Mini celebration state ── */
  const [celebratingHabit, setCelebratingHabit] = useState<string | null>(null);

  /* ── Toggle habit for any date (supports back-dating) ── */
  const toggle = useCallback(async (habitId: string, date: string) => {
    const existing = logIndex.get(`${habitId}:${date}`);
    if (existing) {
      const newDone = !existing.done;
      if (!newDone && date === day) {
        // Opening skip reason modal when unchecking today
        setSkipModal({ habitId, date });
        setSkipReason("");
        playCheck();
      } else {
        // When re-checking (newDone=true), clear skip reason
        await upsert("habitLogs", { id: String(existing.id), done: newDone, skipReason: newDone ? null : existing.skipReason });
        if (newDone) {
          playComplete();
          setCelebratingHabit(habitId);
          setTimeout(() => setCelebratingHabit(null), 800);
        } else {
          playCheck();
        }
      }
    } else {
      await upsert("habitLogs", { id: uid(), habitId, date, done: true });
      playComplete();
      setCelebratingHabit(habitId);
      setTimeout(() => setCelebratingHabit(null), 800);
    }
  }, [logIndex, day]);

  async function saveSkipReason() {
    if (!skipModal) return;
    const existing = logIndex.get(`${skipModal.habitId}:${skipModal.date}`);
    if (existing) {
      await upsert("habitLogs", { id: String(existing.id), done: false, skipReason: skipReason || null });
    }
    setSkipModal(null);
    setSkipReason("");
  }

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const doneToday = habits.filter((h) => logIndex.get(`${h.id}:${day}`)?.done).length;
    const bestStreak = Math.max(0, ...habits.map((h) => {
      const doneDates = new Set(
        logs.filter((l) => l.habitId === h.id && l.done).map((l) => String(l.date)),
      );
      return habitStreak(doneDates);
    }));
    const done7 = habits.reduce((a, h) => {
      return a + days.filter((d) => logIndex.get(`${h.id}:${d}`)?.done).length;
    }, 0);
    const rate7 = habits.length > 0 ? Math.round((done7 / (habits.length * 7)) * 100) : 0;
    return { doneToday, total: habits.length, bestStreak, rate7 };
  }, [habits, logs, day, days, logIndex]);

  /* ── 7-day bar chart data ── */
  const barData = useMemo(() => {
    return days.map((d) => ({
      date: d,
      label: shortDay(d, lang),
      count: habits.filter((h) => logIndex.get(`${h.id}:${d}`)?.done).length,
    }));
  }, [days, habits, logIndex, lang]);

  const barMax = Math.max(1, ...barData.map((d) => d.count));



  const openEdit = useCallback((h: Row) => { setEditing(h); setOpen(true); }, []);
  const openDetail = useCallback((h: Row) => { setDetail(h); }, []);

  /* ── Quick-add habit from empty state template ── */
  const onAddQuick = useCallback(async (s: (typeof EXAMPLE_HABITS)[number]) => {
    await upsert("habits", { id: uid(), name: lang === "id" ? s.name_id : s.name_en, color: s.color, icon: s.icon, description: s.category, sortOrder: habits.length });
    playComplete();
  }, [lang, habits.length]);

  return (
    <div>
      <PageHeader
        title={t("habit.title")}
        subtitle={t("habits.subtitle")}
        icon={<Repeat className="h-5 w-5" />}
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("habit.add")}
          </Button>
        }
      />

      {/* ── Summary Stats ── */}
      {habits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Card className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hari ini</div>
            <div className="font-display text-2xl font-extrabold mt-1.5 tabular-nums">{stats.doneToday}/{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Streak terbaik</div>
            <div className="font-display text-2xl font-extrabold mt-1.5 flex items-center gap-1.5 tabular-nums">
              <Flame className="h-5 w-5 text-amber-500" />{stats.bestStreak}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rate 7 hari</div>
            <div className="font-display text-2xl font-extrabold mt-1.5 text-primary tabular-nums">{stats.rate7}%</div>
          </Card>
        </div>
      )}

      {/* ── 7-Day Bar Chart ── */}
      {habits.length > 0 && (
        <Card className="mb-5 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-display font-bold text-sm">Check-in 7 Hari</span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Jumlah habit per hari</span>
          </div>
          <div className="flex items-end gap-1.5 sm:gap-2 h-20 sm:h-24">
            {barData.map((d, i) => {
              const pct = barMax > 0 ? (d.count / barMax) * 100 : 0;
              const isToday = d.date === day;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "w-full rounded-t-sm sm:rounded-t-md transition-colors",
                        isToday ? "bg-primary" : d.count > 0 ? "bg-primary/60" : "bg-muted-foreground/20",
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-[9px] sm:text-[10px] font-medium",
                    isToday ? "text-primary font-bold" : "text-muted-foreground",
                  )}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}



      {/* ── Category filter ── */}
      {habits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                filterCat === cat.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              <DynIcon name={cat.icon} className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Habit List ── */}
      {filteredHabits.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Repeat className="h-6 w-6 text-primary" />
          </div>
          <p className="font-display text-lg font-medium">{t("habit.empty")}</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{t("empty.habits.desc")}</p>
          {/* Quick-add suggested templates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {EXAMPLE_HABITS.slice(0, 6).map((e) => {
              const c = HABIT_COLORS[e.color] ?? HABIT_COLORS.emerald;
              return (
                <button
                  key={e.key}
                  onClick={() => onAddQuick(e)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition text-left group"
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", c.soft, c.text)}>
                    <DynIcon name={e.icon} className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{lang === "id" ? e.name_id : e.name_en}</div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition shrink-0" />
                </button>
              );
            })}
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("habit.add")}
          </Button>
        </Card>
      ) : (
        <>
          {/* ── Mobile + Desktop: Card layout (reference style) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredHabits.map((h, i) => {
              const color = HABIT_COLORS[String(h.color)] ?? HABIT_COLORS.emerald;
              const doneDates = new Set(
                logs.filter((l) => l.habitId === h.id && l.done).map((l) => String(l.date)),
              );
              const hStreak = habitStreak(doneDates);
              const isDoneToday = doneDates.has(day);
              const weekCount = days.filter((d) => doneDates.has(d)).length;
              const catLabel = String(h.description || "Umum");

              return (
                <motion.div
                  key={String(h.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="p-4 group hover:shadow-md transition-shadow">
                    {/* Row 1: Icon + Name + Category badge */}
                    <div className="flex items-center gap-3 mb-1">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color.soft, color.text)}>
                        <DynIcon name={String(h.icon)} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openDetail(h)} className="font-semibold text-sm truncate text-left hover:underline">
                            {String(h.name)}
                          </button>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                            color.soft, color.text,
                          )}>
                            {catLabel}
                          </span>
                        </div>
                      </div>
                      {/* Trash icon (always visible on mobile, hover on desktop) */}
                      <button onClick={() => void remove("habits", String(h.id))} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-muted transition-colors md:opacity-0 md:group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Row 2: Streak + Week count + Action button */}
                    <div className="flex items-center gap-3 mb-3 mt-2">
                      <div className="flex items-center gap-1 text-xs">
                        {hStreak > 0 ? (
                          <>
                            <Flame className="h-3.5 w-3.5 text-amber-500" />
                            <span className="font-medium text-amber-600 dark:text-amber-400">{hStreak}d</span>
                          </>
                        ) : (
                          <>
                            <Flame className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <span className="text-muted-foreground/60">0d</span>
                          </>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{weekCount}/7 minggu ini</span>
                      <div className="flex-1" />
                      <div className="relative">
                        <button
                          onClick={() => void toggle(String(h.id), day)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all relative overflow-hidden",
                            isDoneToday
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "border border-border text-foreground hover:bg-muted",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" /> {isDoneToday ? "Selesai" : "Tandai selesai"}
                        </button>
                        {/* Mini celebration particles */}
                        <AnimatePresence>
                          {celebratingHabit === String(h.id) && (
                            <>
                              {[...Array(6)].map((_, i) => (
                                <motion.span
                                  key={i}
                                  className="absolute pointer-events-none"
                                  style={{ left: "50%", top: "50%" }}
                                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                  animate={{
                                    x: (Math.random() - 0.5) * 60,
                                    y: -(20 + Math.random() * 40),
                                    opacity: 0,
                                    scale: 0,
                                  }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                                >
                                  <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
                                </motion.span>
                              ))}
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Row 3: 7-day circle indicators */}
                    <div className="flex items-center justify-between">
                      {days.map((d) => {
                        const isDone = doneDates.has(d);
                        const isPast = d < day;
                        const hasLog = logIndex.get(`${h.id}:${d}`);
                        const isSkipped = hasLog && !hasLog.done;
                        return (
                          <div key={d} className="flex flex-col items-center gap-1">
                            {isDone ? (
                              <button
                                onClick={() => void toggle(String(h.id), d)}
                                className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-150 hover:opacity-80"
                                style={{ backgroundColor: String(h.color) || "#10b981" }}
                                title={`${shortDay(d, lang)} · Selesai — ketuk untuk batalkan`}
                              >
                                <Check className="h-4 w-4 text-white" strokeWidth={3} />
                              </button>
                            ) : isPast ? (
                              <button
                                onClick={() => void toggle(String(h.id), d)}
                                className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-150",
                                  isSkipped
                                    ? "border border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900"
                                    : "border-2 border-dashed border-muted-foreground/40 hover:border-primary/50 hover:bg-primary/5",
                                )}
                                title={isSkipped ? `${shortDay(d, lang)} · Terlewat — ketuk untuk tandai selesai` : `${shortDay(d, lang)} · Tandai selesai`}
                              >
                                {isSkipped ? (
                                  <X className="h-3.5 w-3.5 text-rose-500" />
                                ) : null}
                              </button>
                            ) : (
                              <button
                                onClick={() => void toggle(String(h.id), d)}
                                className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-150 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                                title={`${shortDay(d, lang)} · Tandai selesai`}
                              />
                            )}
                            <span className="text-[9px] text-muted-foreground font-medium">
                              {shortDay(d, lang).slice(0, 2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>


        </>
      )}

      {/* ── Skip Reason Modal ── */}
      <Modal open={!!skipModal} onClose={() => setSkipModal(null)} title={t("habit.skipReason")}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("habit.skipReasonPlaceholder")}</p>
          <Textarea
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder={t("habit.skipReasonPlaceholder")}
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setSkipModal(null); setSkipReason(""); }}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={saveSkipReason}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Introspection Section ── */}
      <IntrospectionSection habits={habits} logs={logs} days={days} lang={lang} t={t} />



      {/* ── Contoh Habit (always shown) ── */}
      <ContohHabitSection habits={habits} onAdd={async (s) => {
        await upsert("habits", { id: uid(), name: lang === "id" ? s.name_id : s.name_en, color: s.color, icon: s.icon, sortOrder: habits.length });
      }} lang={lang} />

      <AddHabitModal open={open} onClose={() => { setOpen(false); setEditing(null); }} editing={editing} count={habits.length} />
      <DetailModal detail={detail} onClose={() => setDetail(null)} logs={logs} day={day} days={days} lang={lang} />
    </div>
  );
}

/* ── Add/Edit Habit Modal (NizamOS style) ── */
const HABIT_ICON_OPTIONS = [
  "Sparkles", "BookOpen", "Sunrise", "HandHeart", "Droplets", "Dumbbell", "Moon", "Heart",
  "Users", "Library", "Activity", "Apple", "Bike", "Music", "Code", "Footprints",
  "Star", "Shield", "Zap", "Coffee", "BedDouble", "AlarmClock", "HandCoins", "Pencil",
];
const HABIT_COLOR_OPTIONS = ["emerald", "gold", "amber", "rose", "sky", "teal", "indigo"];
const HABIT_CATEGORIES = ["Ibadah", "Kesehatan", "Belajar", "Produktivitas", "Sosial", "Lainnya"];
const HABIT_PRIORITIES = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Sedang" },
  { value: "high", label: "Tinggi" },
];
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function AddHabitModal({ open, onClose, editing, count }: { open: boolean; onClose: () => void; editing: Row | null; count: number }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(editing?.name ? String(editing.name) : "");
  const [color, setColor] = useState(editing?.color ? String(editing.color) : "emerald");
  const [icon, setIcon] = useState(editing?.icon ? String(editing.icon) : "Sparkles");
  const [category, setCategory] = useState(editing?.description ? String(editing.description) : "Ibadah");
  const [priority, setPriority] = useState("medium");
  const [target, setTarget] = useState(1);
  const [reminder, setReminder] = useState("");
  const [schedule, setSchedule] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const prevId = editing?.id;
  const [lastId, setLastId] = useState(prevId);
  if (prevId !== lastId) {
    setLastId(prevId);
    setName(editing?.name ? String(editing.name) : "");
    setColor(editing?.color ? String(editing.color) : "emerald");
    setIcon(editing?.icon ? String(editing.icon) : "Sparkles");
    setCategory(editing?.description ? String(editing.description) : "Ibadah");
    setPriority("medium");
    setTarget(1);
    setReminder("");
    setSchedule([0, 1, 2, 3, 4, 5, 6]);
  }

  async function save() {
    if (!name.trim()) return;
    const data: Record<string, unknown> = {
      name: name.trim(),
      color,
      icon,
      description: category,
    };
    if (editing?.id) {
      await upsert("habits", { id: String(editing.id), ...data });
    } else {
      await upsert("habits", { id: uid(), ...data, sortOrder: count });
    }
    setName("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Habit" : "Habit Baru"}>
      <div className="space-y-4">
        {/* Nama */}
        <Field label="Nama Habit">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Tilawah Quran" autoFocus />
        </Field>

        {/* Kategori + Prioritas */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Prioritas">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {HABIT_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
        </div>

        {/* Target + Reminder */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target / hari">
            <Input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value) || 1)} />
          </Field>
          <Field label={<>Reminder <span className="text-muted-foreground font-normal">(opsional)</span></>}>
            <div className="flex gap-2">
              <Input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="flex-1" />
              {reminder && (
                <button type="button" onClick={() => setReminder("")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </Field>
        </div>

        {/* Ikon grid */}
        <Field label="Ikon">
          <div className="grid grid-cols-8 gap-2">
            {HABIT_ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center transition-all",
                  icon === ic ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <DynIcon name={ic} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </Field>

        {/* Warna */}
        <Field label="Warna">
          <div className="flex gap-2 flex-wrap">
            {HABIT_COLOR_OPTIONS.map((k) => {
              const c = HABIT_COLORS[k] ?? HABIT_COLORS.emerald;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setColor(k)}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    c.dot,
                    color === k && "ring-2 ring-offset-2 ring-offset-card ring-primary",
                  )}
                />
              );
            })}
          </div>
        </Field>

        {/* Jadwal */}
        <Field label="Jadwal">
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAYS.map((d, idx) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSchedule((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]);
                }}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                  schedule.includes(idx) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {editing && (
            <button
              onClick={() => { void remove("habits", String(editing.id)); onClose(); }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Contoh Habit Section (NizamOS style) ── */
const EXAMPLE_HABITS = [
  { key: "quran", name_id: "Baca Al-Qur'an", name_en: "Read Qur'an", icon: "BookOpen", color: "emerald", category: "Ibadah" },
  { key: "dhikr", name_id: "Dzikir pagi & petang", name_en: "Morning & evening dhikr", icon: "Sparkles", color: "gold", category: "Ibadah" },
  { key: "dhuha", name_id: "Sholat Dhuha", name_en: "Dhuha prayer", icon: "Sunrise", color: "amber", category: "Ibadah" },
  { key: "sedekah", name_id: "Sedekah harian", name_en: "Daily charity", icon: "HandHeart", color: "rose", category: "Ibadah" },
  { key: "water", name_id: "Minum air cukup", name_en: "Drink enough water", icon: "Droplets", color: "sky", category: "Kesehatan" },
  { key: "exercise", name_id: "Olahraga", name_en: "Exercise", icon: "Dumbbell", color: "teal", category: "Kesehatan" },
  { key: "sleep", name_id: "Tidur lebih awal", name_en: "Sleep early", icon: "Moon", color: "indigo", category: "Kesehatan" },
  { key: "read", name_id: "Membaca buku", name_en: "Read a book", icon: "Library", color: "amber", category: "Belajar" },
  { key: "istighfar", name_id: "Istighfar 100x", name_en: "Istighfar 100x", icon: "Heart", color: "rose", category: "Ibadah" },
  { key: "family", name_id: "Waktu bersama keluarga", name_en: "Family time", icon: "Users", color: "teal", category: "Sosial" },
];

function ContohHabitSection({ habits, onAdd, lang }: { habits: Row[]; onAdd: (s: (typeof EXAMPLE_HABITS)[number]) => void; lang: "id" | "en" }) {
  const existingNames = useMemo(() => new Set(habits.map((h) => String(h.name))), [habits]);
  const available = EXAMPLE_HABITS.filter((e) => !existingNames.has(lang === "id" ? e.name_id : e.name_en));
  if (available.length === 0) return null;

  return (
    <Card className="mt-5 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-display font-bold text-sm">Contoh Habit</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Tap untuk menambahkan dengan cepat, lalu sesuaikan sesukamu.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {available.map((e) => {
          const c = HABIT_COLORS[e.color] ?? HABIT_COLORS.emerald;
          return (
            <button
              key={e.key}
              onClick={() => onAdd(e)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition text-left group"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", c.soft, c.text)}>
                <DynIcon name={e.icon} className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{lang === "id" ? e.name_id : e.name_en}</div>
                <div className="text-[11px] text-muted-foreground">{e.category}</div>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Detail Modal ── */
/* ── Introspection Section (weekly skip reasons) ── */
function IntrospectionSection({ habits, logs, days, lang, t }: { habits: Row[]; logs: Row[]; days: string[]; lang: "id" | "en"; t: (k: string) => string }) {
  const weekSkips = useMemo(() => {
    const result: { habitName: string; date: string; reason: string }[] = [];
    for (const l of logs) {
      if (days.includes(String(l.date)) && !l.done && l.skipReason) {
        const habit = habits.find((h) => h.id === l.habitId);
        result.push({
          habitName: habit ? String(habit.name) : "—",
          date: String(l.date),
          reason: String(l.skipReason),
        });
      }
    }
    return result;
  }, [habits, logs, days]);

  if (weekSkips.length === 0) return null;

  return (
    <Card className="mt-5 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="font-display font-bold text-sm">{t("habit.introspection")}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t("habit.introspection.desc")}</p>
      <div className="space-y-2">
        {weekSkips.map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{s.habitName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.date}</p>
              <p className="text-xs text-foreground/80 mt-1 italic">"{s.reason}"</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DetailModal({ detail, onClose, logs, day, days, lang }: { detail: Row | null; onClose: () => void; logs: Row[]; day: string; days: string[]; lang: "id" | "en" }) {
  if (!detail) return null;

  const hl = logs.filter((l) => l.habitId === detail.id);
  const doneDates = new Set(hl.filter((l) => l.done).map((l) => String(l.date)));
  const streak = habitStreak(doneDates);

  const now = new Date();
  const last30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (29 - i)); return ymd(d); });
  const done30 = last30.filter((d) => doneDates.has(d)).length;
  const rate30 = Math.round((done30 / 30) * 100);

  const last14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (13 - i)); return ymd(d); });

  return (
    <Modal open={!!detail} onClose={onClose} title={String(detail.name)}>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-extrabold font-display tabular-nums">{rate30}%</div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">Completion 30h</div>
          </Card>
          <Card className="p-3 sm:p-4 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-amber-500 font-display text-xl sm:text-2xl font-extrabold">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5" />{streak}
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">Streak</div>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-extrabold font-display tabular-nums">{doneDates.size}</div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">Total selesai</div>
          </Card>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">14 Hari Terakhir</div>
          <div className="flex gap-1 sm:gap-1.5 flex-wrap">
            {last14.map((d) => {
              const isDone = doneDates.has(d);
              const isToday = d === day;
              return (
                <div
                  key={d}
                  title={d}
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-colors",
                    isDone ? "text-white" : "text-muted-foreground border border-border",
                    isToday && !isDone && "ring-1 ring-primary",
                  )}
                  style={isDone ? { backgroundColor: String(detail.color) || "#10b981" } : undefined}
                >
                  {Number(d.split("-")[2])}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
