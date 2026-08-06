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
import { Button, Card, Field, Input, Label, Modal, Select, EmptyState } from "@/components/ui/primitives";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { HABIT_SUGGESTIONS, HABIT_COLORS, habitStreak, last7Days, shortDay, ymd } from "@/lib/domain";
import { cn } from "@/lib/utils";

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

  /* ── Toggle habit for any date (supports back-dating) ── */
  const toggle = useCallback(async (habitId: string, date: string) => {
    const existing = logIndex.get(`${habitId}:${date}`);
    if (existing) await upsert("habitLogs", { id: String(existing.id), done: !existing.done });
    else await upsert("habitLogs", { id: uid(), habitId, date, done: true });
  }, [logIndex]);

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

  /* ── 90-day heatmap data ── */
  const heatmapData = useMemo(() => {
    const doneMap = new Map<string, Set<string>>();
    for (const l of logs) {
      if (l.done) {
        const dStr = String(l.date);
        if (!doneMap.has(dStr)) doneMap.set(dStr, new Set());
        doneMap.get(dStr)!.add(String(l.habitId));
      }
    }
    const out: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      const count = doneMap.get(dStr)?.size ?? 0;
      out.push({ date: dStr, value: count });
    }
    return out;
  }, [logs]);

  /* ── Heatmap stats ── */
  const heatmapStats = useMemo(() => {
    const activeDays = heatmapData.filter((d) => d.value > 0);
    const totalDone = activeDays.reduce((a, d) => a + d.value, 0);
    const avgPerDay = activeDays.length ? totalDone / activeDays.length : 0;
    return { completedDays: activeDays.length, totalDone, avgPerDay };
  }, [heatmapData]);

  const openEdit = useCallback((h: Row) => { setEditing(h); setOpen(true); }, []);
  const openDetail = useCallback((h: Row) => { setDetail(h); }, []);

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
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
            <Repeat className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-display text-lg font-medium">{t("habit.empty")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("empty.habits.desc")}</p>
          <Button size="sm" className="mt-4" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("habit.add")}
          </Button>
        </Card>
      ) : (
        <>
          {/* ── Mobile: Card layout ── */}
          <div className="md:hidden space-y-3">
            {filteredHabits.map((h, i) => {
              const color = HABIT_COLORS[String(h.color)] ?? HABIT_COLORS.emerald;
              const doneDates = new Set(
                logs.filter((l) => l.habitId === h.id && l.done).map((l) => String(l.date)),
              );
              const hStreak = habitStreak(doneDates);
              const isDoneToday = doneDates.has(day);
              const weekCount = days.filter((d) => doneDates.has(d)).length;

              return (
                <motion.div
                  key={String(h.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="p-4 group">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color.soft, color.text)}>
                        <DynIcon name={String(h.icon)} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openDetail(h)} className="font-semibold text-sm truncate text-left hover:underline">
                            {String(h.name)}
                          </button>
                          {hStreak > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <Flame className="h-2.5 w-2.5" />{hStreak}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{weekCount}/7 minggu ini</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(h)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => void remove("habits", String(h.id))} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-muted transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Weekly mini-bar */}
                    <div className="flex items-center gap-1 mb-3">
                      {days.map((d) => (
                        <div key={d} className={cn("flex-1 h-2 rounded-full transition-colors", doneDates.has(d) ? "" : "bg-muted")} style={doneDates.has(d) ? { backgroundColor: String(h.color) || "#10b981" } : undefined} />
                      ))}
                    </div>

                    <button
                      onClick={() => void toggle(String(h.id), day)}
                      className={cn(
                        "w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                        isDoneToday
                          ? "bg-primary text-primary-foreground"
                          : "border border-border hover:bg-muted",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" /> {isDoneToday ? "Selesai" : "Tandai selesai"}
                    </button>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* ── Desktop: 7-day grid layout ── */}
          <Card className="hidden md:block overflow-hidden">
            {/* Header row */}
            <div className="px-4 py-3 grid items-center gap-3 border-b border-border/50" style={{ gridTemplateColumns: "1fr repeat(7, 2.25rem) 5rem" }}>
              <span className="font-display font-bold text-sm">Daftar Habit</span>
              {days.map((d) => (
                <span key={d} className={cn("text-center text-[11px] font-semibold", d === day ? "text-primary" : "text-muted-foreground")}>
                  {shortDay(d, lang).slice(0, 2)}<br /><span className="text-[10px] opacity-70">{Number(d.split("-")[2])}</span>
                </span>
              ))}
              <span />
            </div>

            <div className="divide-y divide-border/50">
              {filteredHabits.map((h, i) => {
                const color = HABIT_COLORS[String(h.color)] ?? HABIT_COLORS.emerald;
                const doneDates = new Set(
                  logs.filter((l) => l.habitId === h.id && l.done).map((l) => String(l.date)),
                );
                const hStreak = habitStreak(doneDates);
                const weekCount = days.filter((d) => doneDates.has(d)).length;

                return (
                  <motion.div
                    key={String(h.id)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group grid items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    style={{ gridTemplateColumns: "1fr repeat(7, 2.25rem) 5rem" }}
                  >
                    <button onClick={() => openDetail(h)} className="flex items-center gap-3 min-w-0 text-left">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", color.soft, color.text)}>
                        <DynIcon name={String(h.icon)} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{String(h.name)}</span>
                          {hStreak > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <Flame className="h-2.5 w-2.5" />{hStreak}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{weekCount}/7 minggu ini</span>
                      </div>
                    </button>

                    {days.map((d) => {
                      const isDone = doneDates.has(d);
                      const isToday = d === day;
                      return (
                        <button
                          key={d}
                          title={`${d} · ${isDone ? "selesai" : "tandai selesai"}`}
                          onClick={() => void toggle(String(h.id), d)}
                          className={cn(
                            "mx-auto h-9 w-9 rounded-full flex items-center justify-center transition-all duration-150 group/cell",
                            isDone ? "" : cn("border hover:bg-primary/10", isToday ? "border-2" : "border"),
                          )}
                          style={isDone ? { backgroundColor: String(h.color) || "#10b981" } : isToday ? { borderColor: String(h.color) || "#10b981" } : { borderColor: "var(--border)" }}
                        >
                          <Check className={cn("h-3.5 w-3.5 transition-colors", isDone ? "text-white" : "text-transparent group-hover/cell:text-foreground/40")} />
                        </button>
                      );
                    })}

                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(h)} title="Edit" className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => void remove("habits", String(h.id))} title="Hapus" className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-muted transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border/50">
              Klik kotak hari mana pun untuk menandai selesai — berguna jika lupa check-in di hari sebelumnya.
            </div>
          </Card>
        </>
      )}

      {/* ── 90-day Heatmap ── */}
      {habits.length > 0 && (
        <Card className="mt-5 overflow-hidden p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <p className="font-display text-base font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Konsistensi 90 Hari
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {heatmapStats.completedDays} hari aktif · {heatmapStats.totalDone} total · {heatmapStats.avgPerDay.toFixed(1)} rata-rata/hari
              </p>
            </div>
          </div>

          <ConsistencyHeatmap data={heatmapData} color="emerald" weeks={13} showLegend interactive />

          {stats.bestStreak > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-amber-500" />
                Streak: <span className="font-medium text-foreground">{stats.bestStreak} hari</span>
              </span>
              <span className="text-primary font-medium">
                {Math.round((heatmapStats.completedDays / 90) * 100)}% dari 90 hari terakhir
              </span>
            </div>
          )}
        </Card>
      )}

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

  const heatmapData = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (89 - i));
    const dStr = ymd(d);
    return { date: dStr, value: doneDates.has(dStr) ? 1 : 0 };
  });

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
          <div className="text-sm font-semibold mb-2">Heatmap</div>
          <ConsistencyHeatmap data={heatmapData} color="emerald" weeks={13} showLegend interactive />
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
