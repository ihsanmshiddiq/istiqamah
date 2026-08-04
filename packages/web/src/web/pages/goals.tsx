import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Trash2, Target, Check, Pencil,
  Moon, GraduationCap, HeartPulse, Wallet, Users, Megaphone,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button, Card, Input, Textarea, Field, Modal, Select, EmptyState, ProgressRing,
} from "@/components/ui/primitives";
import { niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

type CatMeta = { id: string; label: string; icon: typeof Moon; accent: string; bg: string };

const CATEGORIES: CatMeta[] = [
  { id: "ibadah", label: "Ibadah", icon: Moon, accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "knowledge", label: "Knowledge", icon: GraduationCap, accent: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { id: "health", label: "Health", icon: HeartPulse, accent: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  { id: "wealth", label: "Wealth", icon: Wallet, accent: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
  { id: "relationships", label: "Relationships", icon: Users, accent: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  { id: "dakwah", label: "Dakwah", icon: Megaphone, accent: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
];
const catMeta = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export default function Goals() {
  const { t, lang } = useI18n();
  const goals = useTable<Row>("goals", (r) =>
    [...r].sort((a, b) => Number(a.done) - Number(b.done) || Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)),
  );
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const active = goals.filter((g) => !g.done);
  const done = goals.filter((g) => g.done);
  const avg = active.length
    ? Math.round(active.reduce((s, g) => s + Number(g.progress ?? 0), 0) / active.length)
    : 0;

  const list = filter === "all" ? goals : goals.filter((g) => g.category === filter);

  async function setProgress(g: Row, delta: number) {
    const next = Math.max(0, Math.min(100, Number(g.progress ?? 0) + delta));
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
        action={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> {t("goals.add")}</Button>}
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatBox label={t("goals.active")} value={active.length} />
        <StatBox label={t("goals.completed")} value={done.length} />
        <StatBox label={t("goals.avgProgress")} value={`${avg}%`} />
      </div>

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

      {list.length === 0 ? (
        <EmptyState
          icon={<Target className="h-7 w-7" />}
          title={t("goals.empty")}
          description={t("empty.goals.desc")}
          action={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> {t("goals.add")}</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {list.map((g) => {
              const m = catMeta(String(g.category));
              const Icon = m.icon;
              const prog = Number(g.progress ?? 0);
              return (
                <motion.div key={String(g.id)} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                  <Card className={cn("flex flex-col gap-4 p-5", g.done && "opacity-70")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", m.bg)}>
                          <Icon className={cn("h-5 w-5", m.accent)} />
                        </span>
                        <div>
                          <h3 className={cn("font-display text-base font-semibold leading-snug", g.done && "line-through")}>{String(g.title)}</h3>
                          <span className={cn("mt-0.5 inline-block text-xs font-medium", m.accent)}>{m.label}</span>
                        </div>
                      </div>
                      <ProgressRing value={prog / 100} size={44} stroke={5}>
                        <span className="text-[10px] font-semibold tabular-nums">{prog}%</span>
                      </ProgressRing>
                    </div>

                    {g.milestone ? <p className="text-sm text-muted-foreground">{String(g.milestone)}</p> : null}
                    {g.targetDate ? (
                      <p className="text-xs text-muted-foreground">{t("goals.target")}: {niceDate(String(g.targetDate), lang)}</p>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => void setProgress(g, -10)} disabled={prog <= 0}>−10%</Button>
                        <Button size="sm" variant="ghost" onClick={() => void setProgress(g, 10)} disabled={prog >= 100}>+10%</Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => void toggleDone(g)} title={t("goals.markDone")} className={cn("rounded-lg p-1.5 transition", g.done ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500")}>
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setEditing(g); setOpen(true); }} className="rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => void remove("goals", String(g.id))} className="rounded-lg p-1.5 text-muted-foreground transition hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <GoalModal open={open} onClose={() => setOpen(false)} goal={editing} />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4 text-center">
      <p className="font-display text-2xl font-bold text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </Card>
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
