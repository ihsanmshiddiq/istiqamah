import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { BookMarked, Plus, Minus, Trash2, CheckCircle2, CalendarDays, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Button, Card, Input, Field, Modal, ProgressRing, EmptyState } from "@/components/ui/primitives";
import { ymd, addDays, daysBetween, niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

const MUSHAF_PAGES = 604;

export default function Khatma() {
  const { t } = useI18n();
  const plans = useTable<Row>("khatmaPlans", (r) =>
    [...r].sort((a, b) => Number(b.isActive) - Number(a.isActive) || Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)),
  );
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title={t("khatma.title")}
        subtitle={t("khatma.subtitle")}
        action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("khatma.new")}</Button>}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="h-8 w-8" />}
          title={t("khatma.empty")}
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("khatma.new")}</Button>}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {plans.map((p) => <PlanCard key={String(p.id)} plan={p} />)}
        </div>
      )}

      <NewPlanModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function PlanCard({ plan }: { plan: Row }) {
  const { t, lang } = useI18n();
  const total = Number(plan.totalPages ?? MUSHAF_PAGES);
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

  async function step(delta: number) {
    const next = Math.max(0, Math.min(total, done + delta));
    await upsert("khatmaPlans", {
      id: String(plan.id),
      completedPages: next,
      completedAt: next >= total ? (plan.completedAt ? String(plan.completedAt) : today) : null,
      isActive: next >= total ? false : Boolean(plan.isActive),
    });
  }

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
          <ProgressRing value={pct} size={92} stroke={8}>
            <p className="font-display text-xl font-bold tabular-nums">{Math.round(pct * 100)}%</p>
          </ProgressRing>
          <div className="flex-1 space-y-3">
            {isDone ? (
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" /> {t("khatma.completed")}
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
          <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
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

  const dailyPreview = useMemo(() => Math.ceil(MUSHAF_PAGES / Math.max(1, days)), [days]);

  async function save() {
    await upsert("khatmaPlans", {
      id: uid(),
      name: name.trim() || "Khatma",
      startPage: 1,
      endPage: MUSHAF_PAGES,
      totalPages: MUSHAF_PAGES,
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
