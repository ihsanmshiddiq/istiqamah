import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Trash2, Target, Check, Pencil,
  Moon, GraduationCap, HeartPulse, Wallet, Users, Megaphone, Calendar,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button, Card, Input, Textarea, Field, Modal, Select, EmptyState, ProgressRing,
} from "@/components/ui/primitives";
import { SpotlightCard } from "@/components/spotlight-card";
import { niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

type CatMeta = { id: string; label: string; icon: typeof Moon; tint: string; accent: string; bg: string };

const CATEGORIES: CatMeta[] = [
  { id: "ibadah", label: "Ibadah", icon: Moon, tint: "bg-emerald-500", accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "knowledge", label: "Pengetahuan", icon: GraduationCap, tint: "bg-sky-500", accent: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
  { id: "health", label: "Kesehatan", icon: HeartPulse, tint: "bg-rose-500", accent: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  { id: "wealth", label: "Keuangan", icon: Wallet, tint: "bg-amber-500", accent: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { id: "relationships", label: "Relasi", icon: Users, tint: "bg-violet-500", accent: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  { id: "dakwah", label: "Dakwah", icon: Megaphone, tint: "bg-cyan-500", accent: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
];
const catMeta = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

type MilestoneItem = { label: string; done: boolean };

function parseMilestones(value: string | null): MilestoneItem[] {
  if (!value) return [];
  return value.split("|").map((item) => ({
    done: item.trim().startsWith("[x]"),
    label: item.replace(/^\s*\[[ x]\]\s*/i, "").trim(),
  })).filter((item) => item.label);
}

function serializeMilestones(items: MilestoneItem[]) {
  return items.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.label}`).join(" | ");
}

function progressLabel(pct: number): string {
  if (pct >= 100) return "Selesai";
  if (pct >= 75) return "Hampir selesai";
  if (pct >= 50) return "Setengah jalan";
  if (pct >= 25) return "Sedang berjalan";
  return "Baru mulai";
}

export default function Goals() {
  const { t, lang } = useI18n();
  const goals = useTable<Row>("goals", (r) =>
    [...r].sort((a, b) => Number(a.done) - Number(b.done) || Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)),
  );
  const [filter, setFilter] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "active" | "done">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const active = goals.filter((g) => !g.done);
  const done = goals.filter((g) => g.done);
  const avg = active.length
    ? Math.round(active.reduce((s, g) => s + Number(g.progress ?? 0), 0) / active.length)
    : 0;

  const list = (filter === "all" ? goals : goals.filter((g) => g.category === filter))
    .filter((g) => status === "all" || (status === "active" && !g.done) || (status === "done" && g.done));

  async function setProgressDelta(g: Row, delta: number) {
    const next = Math.max(0, Math.min(100, Number(g.progress ?? 0) + delta));
    await upsert("goals", { id: String(g.id), progress: next, done: next >= 100 });
  }
  async function setProgressValue(g: Row, value: number) {
    const next = Math.max(0, Math.min(100, value));
    await upsert("goals", { id: String(g.id), progress: next, done: next >= 100 });
  }
  async function toggleDone(g: Row) {
    const nd = !g.done;
    await upsert("goals", { id: String(g.id), done: nd, progress: nd ? 100 : Number(g.progress ?? 0) });
  }

  return (
    <div>
      <PageHeader
        title={t("goals.title")}
        subtitle={t("goals.subtitle")}
        icon={<Target className="h-5 w-5" />}
        action={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> {t("goals.add")}</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard label={t("goals.active")} value={active.length} tint="text-primary" />
        <SummaryCard label={t("goals.completed")} value={done.length} tint="text-emerald-500" />
        <SummaryCard label={t("goals.avgProgress")} value={`${avg}%`} tint="text-amber-500" />
        <SummaryCard label="Kategori" value={new Set(goals.map((g) => g.category)).size} tint="text-sky-500" />
      </div>

      {/* Status filter */}
      <div className="mb-5 flex gap-2">
        {(["all", "active", "done"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              status === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
            )}
          >
            {item === "all" ? "Semua" : item === "active" ? "Aktif" : "Selesai"}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[{ id: "all", label: t("common.all") }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              filter === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {active.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={<Target className="h-7 w-7" />}
          title={t("goals.empty")}
          description={t("empty.goals.desc")}
          action={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> {t("goals.add")}</Button>}
        />
      ) : status !== "done" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence initial={false}>
            {list.filter((g) => !g.done).map((g) => {
              const m = catMeta(String(g.category));
              const Icon = m.icon;
              const prog = Number(g.progress ?? 0);
              const milestones = parseMilestones(g.milestone ? String(g.milestone) : null);
              return (
                <motion.div key={String(g.id)} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <SpotlightCard className="relative overflow-hidden">
                    {/* Decorative gradient tint by category */}
                    <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-30 pointer-events-none", m.tint)} />
                    <div className="relative p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", m.bg, m.accent)}>
                            <Target className="h-4 w-4" />
                          </span>
                          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium", m.bg, m.accent)}>{m.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => void setProgressDelta(g, 10)} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors">+10%</button>
                          <button onClick={() => void toggleDone(g)} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { setEditing(g); setOpen(true); }} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => void remove("goals", String(g.id))} className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-display text-lg font-medium mb-1 leading-snug">{String(g.title)}</p>

                      {/* Milestones */}
                      {milestones.length > 0 ? (
                        <div className="mb-3 space-y-1.5">
                          {milestones.map((item, index, items) => (
                            <button
                              key={`${item.label}-${index}`}
                              onClick={() => {
                                const next = items.map((entry, itemIndex) => itemIndex === index ? { ...entry, done: !entry.done } : entry);
                                const completed = next.filter((entry) => entry.done).length;
                                void upsert("goals", {
                                  id: String(g.id),
                                  milestone: serializeMilestones(next),
                                  progress: Math.round((completed / next.length) * 100),
                                  done: completed === next.length,
                                });
                              }}
                              className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground"
                            >
                              <span className={cn("flex h-4 w-4 items-center justify-center rounded border", item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border")}>
                                <Check className={cn("h-3 w-3", !item.done && "opacity-0")} />
                              </span>
                              <span className={cn(item.done && "line-through")}>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : g.targetDate ? (
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {t("goals.target")}: {niceDate(String(g.targetDate), lang)}
                        </p>
                      ) : (
                        <div className="mb-3" />
                      )}

                      {/* Progress bar */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Progress</span>
                        <span className="text-sm font-semibold tabular-nums">{prog}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${prog}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          className={cn("h-full rounded-full relative", m.tint)}
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse" />
                        </motion.div>
                      </div>

                      {/* Range slider */}
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={prog}
                        onChange={(e) => void setProgressValue(g, Number(e.target.value))}
                        className="w-full mt-3 accent-primary"
                      />

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {progressLabel(prog)}
                        </span>
                        <span className="text-[10px] font-medium text-primary">{100 - prog}% lagi</span>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : null}

      {/* Done section */}
      {done.length > 0 && status !== "active" ? (
        <div className="mt-8">
          <p className="text-display text-sm font-medium text-muted-foreground mb-3">Selesai · {done.length}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {list.filter((g) => g.done).map((g) => (
              <div key={String(g.id)} className="rounded-xl border border-border/60 bg-card p-4 opacity-70">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" /></span>
                  <p className="text-sm font-medium line-through truncate">{String(g.title)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <GoalModal open={open} onClose={() => setOpen(false)} goal={editing} />
    </div>
  );
}

function SummaryCard({ label, value, tint }: { label: string; value: number | string; tint: string }) {
  return (
    <SpotlightCard className="p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-display text-2xl font-semibold mt-1", tint)}>{value}</p>
    </SpotlightCard>
  );
}

function GoalModal({ open, onClose, goal }: { open: boolean; onClose: () => void; goal: Row | null }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ibadah");
  const [milestone, setMilestone] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setTitle(goal?.title ? String(goal.title) : "");
    setCategory(goal?.category ? String(goal.category) : "ibadah");
    setMilestone(goal?.milestone ? String(goal.milestone) : "");
    setTargetDate(goal?.targetDate ? String(goal.targetDate) : "");
    setProgress(goal ? Number(goal.progress ?? 0) : 0);
  }, [goal, open]);

  async function save() {
    if (!title.trim()) { onClose(); return; }
    await upsert("goals", {
      id: goal ? String(goal.id) : uid(),
      title: title.trim(),
      category,
      milestone: milestone || null,
      targetDate: targetDate || null,
      progress,
      done: progress >= 100,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={goal ? t("goals.edit") : t("goals.add")}>
      <div className="space-y-4">
        <Field label={t("goals.name")}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("goals.namePlaceholder")} />
        </Field>
        <Field label={t("goals.category")}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label={t("goals.milestone")}>
          <Textarea rows={2} value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder={t("goals.milestonePlaceholder")} />
        </Field>
        <Field label={t("goals.target")}>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <Field label={`${t("goals.progress")} — ${progress}%`}>
          <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
        </Field>
        <Button className="w-full" onClick={save}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}
