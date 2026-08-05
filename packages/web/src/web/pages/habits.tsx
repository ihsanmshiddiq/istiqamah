import { useMemo, useState } from "react";
import { motion } from "motion/react";
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

/* ── Category definitions (simplified from hayat-os) ── */
const CATEGORIES = [
  { id: "all", label: "Semua", icon: "Sparkles" },
  { id: "worship", label: "Ibadah", icon: "Heart" },
  { id: "knowledge", label: "Ilmu", icon: "BookOpen" },
  { id: "health", label: "Kesehatan", icon: "Dumbbell" },
  { id: "general", label: "Umum", icon: "Star" },
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
    // For now, all habits are "general" since the schema doesn't have a category field
    return habits;
  }, [habits, filterCat]);

  /* ── Toggle habit ── */
  async function toggle(habitId: string, date: string) {
    const existing = logIndex.get(`${habitId}:${date}`);
    if (existing) await upsert("habitLogs", { id: String(existing.id), done: !existing.done });
    else await upsert("habitLogs", { id: uid(), habitId, date, done: true });
  }

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

  /* ── Streak ── */
  const streak = useMemo(() => {
    const doneDates = new Set(logs.filter((l) => l.done).map((l) => String(l.date)));
    return habitStreak(doneDates);
  }, [logs]);

  return (
    <div>
      <PageHeader
        title={t("habit.title")}
        subtitle={t("habits.subtitle")}
        icon={<Repeat className="h-5 w-5" />}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("habit.add")}
          </Button>
        }
      />

      {/* ── Recommendations ── */}
      <Card className="mb-5 overflow-hidden bg-gradient-to-r from-primary/5 via-card to-amber-500/5 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-display text-base font-medium">Rekomendasi kebiasaan</p>
            <p className="text-xs text-muted-foreground">Pilih satu untuk menambahkannya dengan cepat.</p>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { name: "Baca Al-Quran", icon: "BookOpen", color: "emerald" },
            { name: "Sedekah harian", icon: "Heart", color: "rose" },
            { name: "Minum air cukup", icon: "Droplets", color: "sky" },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => {
                // Pre-fill and open add modal
                setOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5 text-left text-xs hover:border-primary/40 hover:bg-primary/5 transition-colors overflow-hidden"
            >
              <DynIcon name={item.icon} className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{item.name}</span>
              <Plus className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </Card>

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

      {/* ── 90-day heatmap ── */}
      {habits.length > 0 && (
        <Card className="mb-6 overflow-hidden p-5">
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
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>Sedikit</span>
              <div className="h-3 w-3 rounded-sm bg-muted" />
              <div className="h-3 w-3 rounded-sm bg-primary/20" />
              <div className="h-3 w-3 rounded-sm bg-primary/40" />
              <div className="h-3 w-3 rounded-sm bg-primary/70" />
              <div className="h-3 w-3 rounded-sm bg-primary" />
              <span>Banyak</span>
            </div>
          </div>

          <ConsistencyHeatmap data={heatmapData} color="emerald" weeks={13} />

          {streak > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-amber-500" />
                Streak: <span className="font-medium text-foreground">{streak} hari</span>
              </span>
              <span className="text-primary font-medium">
                {Math.round((heatmapStats.completedDays / 90) * 100)}% dari 90 hari terakhir
              </span>
            </div>
          )}
        </Card>
      )}

      {/* ── Habit cards ── */}
      {filteredHabits.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
            <Repeat className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-display text-lg font-medium">{t("habit.empty")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("empty.habits.desc")}</p>
          <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("habit.add")}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredHabits.map((h, i) => {
            const color = HABIT_COLORS[String(h.color)] ?? HABIT_COLORS.emerald;
            const doneDates = new Set(
              logs.filter((l) => l.habitId === h.id && l.done).map((l) => String(l.date)),
            );
            const hStreak = habitStreak(doneDates);
            const isDoneToday = doneDates.has(day);
            const last7 = days.map((d) => ({ date: d, done: doneDates.has(d) }));
            const weekCount = last7.filter((d) => d.done).length;

            return (
              <motion.div
                key={String(h.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-5 group">
                  <div className="flex items-start gap-3 mb-4">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", color.soft, color.text)}>
                      <DynIcon name={String(h.icon)} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{String(h.name)}</p>
                      {hStreak > 0 && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Flame className="h-3 w-3 text-amber-500" />
                          {hStreak}d streak
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => void remove("habits", String(h.id))}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">{weekCount}/7 minggu ini</span>
                    <button
                      onClick={() => void toggle(String(h.id), day)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                        isDoneToday
                          ? "bg-primary text-primary-foreground"
                          : "border border-border hover:bg-muted",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" /> {isDoneToday ? "Selesai" : "Tandai selesai"}
                    </button>
                  </div>

                  {/* Weekly trend */}
                  <div className="flex items-center gap-1">
                    {last7.map((d, idx) => (
                      <div key={idx} className="flex-1">
                        <div className={cn("h-8 rounded-md", d.done ? color.dot : "bg-muted")} />
                        <p className="text-[9px] text-center text-muted-foreground mt-1">
                          {shortDay(d.date, lang)[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddHabitModal open={open} onClose={() => setOpen(false)} count={habits.length} />
    </div>
  );
}

/* ── Add Habit Modal ── */
function AddHabitModal({ open, onClose, count }: { open: boolean; onClose: () => void; count: number }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState("");
  const [color, setColor] = useState("emerald");
  const [icon, setIcon] = useState("Sparkles");

  async function addCustom() {
    if (!name.trim()) return;
    await upsert("habits", { id: uid(), name: name.trim(), color, icon, sortOrder: count });
    setName("");
    onClose();
  }

  async function addSuggestion(s: (typeof HABIT_SUGGESTIONS)[number]) {
    await upsert("habits", {
      id: uid(),
      name: lang === "id" ? s.name_id : s.name_en,
      color: s.color,
      icon: s.icon,
      sortOrder: count,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("habit.add")}>
      <div className="space-y-4">
        <Field label={t("habit.name")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("habit.namePlaceholder")}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("habit.color")}>
            <div className="flex flex-wrap gap-2">
              {Object.entries(HABIT_COLORS).map(([k, c]) => (
                <button
                  key={k}
                  onClick={() => setColor(k)}
                  className={cn(
                    "h-7 w-7 rounded-full",
                    c.dot,
                    color === k && "ring-2 ring-offset-2 ring-offset-card ring-primary",
                  )}
                />
              ))}
            </div>
          </Field>
          <Field label={t("habit.icon")}>
            <Select value={icon} onChange={(e) => setIcon(e.target.value)}>
              {["Sparkles", "BookOpen", "Sunrise", "HandHeart", "Droplets", "Dumbbell", "Moon", "Heart", "Users", "Library"].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Button className="w-full" onClick={addCustom} disabled={!name.trim()}>
          <Plus className="h-4 w-4" /> {t("common.add")}
        </Button>

        <div>
          <Label>{t("habit.suggestions")}</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {HABIT_SUGGESTIONS.map((s) => {
              const c = HABIT_COLORS[s.color] ?? HABIT_COLORS.emerald;
              return (
                <button
                  key={s.key}
                  onClick={() => void addSuggestion(s)}
                  className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", c.soft, c.text)}>
                    <DynIcon name={s.icon} className="h-4 w-4" />
                  </span>
                  <span className="truncate">{lang === "id" ? s.name_id : s.name_en}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
