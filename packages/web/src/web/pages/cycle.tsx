import { useState } from "react";
import { Redirect } from "wouter";
import { motion } from "motion/react";
import { Plus, Trash2, Droplet, HeartPulse } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable, useSingleton } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Textarea,
  EmptyState,
} from "@/components/ui/primitives";
import { predictCycle, CYCLE_SYMPTOMS, niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

const FLOWS = ["light", "medium", "heavy"] as const;

export default function Cycle() {
  const { t, lang } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const logs = useTable<Row>("cycleLogs", (r) =>
    [...r].sort((a, b) => (String(a.startDate) < String(b.startDate) ? 1 : -1)),
  );
  const [open, setOpen] = useState(false);

  // gate
  if (profile && !(profile.cycleEnabled && profile.gender === "female")) {
    return <Redirect to="/app" />;
  }

  const avg = Number(profile?.cycleAvgLength ?? 28);
  const pred = predictCycle(
    logs.map((l) => ({ startDate: String(l.startDate), endDate: l.endDate ? String(l.endDate) : null })),
    avg,
  );

  return (
    <div>
      <PageHeader
        title={t("cycle.title")}
        subtitle={t("cycle.subtitle")}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("cycle.logPeriod")}
          </Button>
        }
      />

      {/* Prediction hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <Card className={cn("relative overflow-hidden p-6 sm:p-8", pred.status === "period" ? "bg-rose-500/10" : "bg-primary/8")}>
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
          <div className="relative flex items-center gap-5">
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", pred.status === "period" ? "bg-rose-500/20 text-rose-500" : "bg-primary/15 text-primary")}>
              <HeartPulse className="h-8 w-8" />
            </div>
            <div>
              {pred.status === "period" ? (
                <>
                  <p className="text-sm font-medium text-muted-foreground">{t("cycle.current")}</p>
                  <p className="font-display text-2xl font-semibold sm:text-3xl">
                    {t("cycle.inPeriod")} · {t("cycle.day")} {pred.dayInPeriod}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">{t("cycle.clean")}</p>
                  <p className="font-display text-2xl font-semibold sm:text-3xl">
                    {pred.nextStart
                      ? `${t("cycle.daysUntil")}: ${pred.daysUntilNext} · ${niceDate(pred.nextStart, lang)}`
                      : t("cycle.empty")}
                  </p>
                  {pred.nextStart && (
                    <p className="text-xs text-muted-foreground">{t("cycle.predicted")}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* History */}
      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-semibold">{t("cycle.history")}</h3>
        {logs.length === 0 ? (
          <EmptyState icon={<HeartPulse className="h-8 w-8" />} title={t("cycle.empty")} description={t("empty.cycle.desc")} />
        ) : (
          <div className="space-y-2">
            {logs.map((l) => {
              const symptoms: string[] = l.symptoms ? (JSON.parse(String(l.symptoms)) as string[]) : [];
              return (
                <div key={String(l.id)} className="flex items-start justify-between gap-3 border-b border-border/60 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {niceDate(String(l.startDate), lang)}
                      {l.endDate ? ` — ${niceDate(String(l.endDate), lang)}` : ` · ${t("cycle.ongoing")}`}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-500">
                        <Droplet className="h-3 w-3" /> {t(`cycle.flow.${l.flow}` as never)}
                      </span>
                      {symptoms.map((s) => {
                        const meta = CYCLE_SYMPTOMS.find((x) => x.key === s);
                        return (
                          <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {lang === "id" ? meta?.id : meta?.en}
                          </span>
                        );
                      })}
                    </div>
                    {l.note ? <p className="mt-1 text-xs text-muted-foreground">{String(l.note)}</p> : null}
                  </div>
                  <button onClick={() => void remove("cycleLogs", String(l.id))} className="text-muted-foreground/40 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <LogCycleModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function LogCycleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [start, setStart] = useState(todayHelper());
  const [end, setEnd] = useState("");
  const [flow, setFlow] = useState<(typeof FLOWS)[number]>("medium");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  async function save() {
    if (!start) return;
    await upsert("cycleLogs", {
      id: uid(),
      startDate: start,
      endDate: end || null,
      flow,
      symptoms: JSON.stringify(symptoms),
      note: note || null,
    });
    setEnd("");
    setSymptoms([]);
    setNote("");
    onClose();
  }
  function toggleSym(k: string) {
    setSymptoms((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  }

  return (
    <Modal open={open} onClose={onClose} title={t("cycle.logPeriod")}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("cycle.start")}>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={`${t("cycle.end")} (${t("common.optional")})`}>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label={t("cycle.flow")}>
          <div className="flex gap-2">
            {FLOWS.map((f) => (
              <button
                key={f}
                onClick={() => setFlow(f)}
                className={cn(
                  "flex-1 rounded-xl border py-2 text-sm font-medium transition-all",
                  flow === f ? "border-transparent bg-rose-500 text-white" : "border-border text-muted-foreground hover:border-rose-400/50",
                )}
              >
                {t(`cycle.flow.${f}` as never)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("cycle.symptoms")}>
          <div className="flex flex-wrap gap-2">
            {CYCLE_SYMPTOMS.map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSym(s.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-all",
                  symptoms.includes(s.key) ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {lang === "id" ? s.id : s.en}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("cycle.note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}
