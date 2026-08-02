import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import * as Icons from "lucide-react";
import { Play, Pause, RotateCcw, Check, Timer as TimerIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card, Button, Input } from "@/components/ui/primitives";
import { FOCUS_MODES, FOCUS_PRESETS, FOCUS_INTENTIONS } from "@/lib/content/islamic";
import { cn } from "@/lib/utils";

function ModeIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Focus() {
  const { t } = useI18n();
  const day = todayHelper();
  const sessions = useTable<Row>("focusSessions", (r) => r.filter((x) => x.date === day && x.completed));

  const [modeId, setModeId] = useState<string>("deep");
  const [presetId, setPresetId] = useState<string>("classic");
  const [intention, setIntention] = useState("");
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const startedRef = useRef<number | null>(null);

  const preset = FOCUS_PRESETS.find((p) => p.id === presetId) ?? FOCUS_PRESETS[0];
  const mode = FOCUS_MODES.find((m) => m.id === modeId) ?? FOCUS_MODES[0];
  const phaseTotal = (phase === "focus" ? preset.focusMin : preset.breakMin) * 60;

  // reset timer when preset/phase changes while not running
  useEffect(() => {
    if (!running) setRemaining((phase === "focus" ? preset.focusMin : preset.breakMin) * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, phase]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(iv);
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function onComplete() {
    setRunning(false);
    if (phase === "focus") {
      await upsert("focusSessions", {
        id: uid(),
        date: day,
        durationSec: preset.focusMin * 60,
        mode: modeId,
        intention: intention || null,
        completed: true,
      });
      setPhase("break");
      setRemaining(preset.breakMin * 60);
    } else {
      setPhase("focus");
      setRemaining(preset.focusMin * 60);
    }
  }

  function toggle() {
    if (!running && startedRef.current === null) startedRef.current = Date.now();
    setRunning((v) => !v);
  }
  function reset() {
    setRunning(false);
    startedRef.current = null;
    setRemaining(phaseTotal);
  }

  const totalMin = useMemo(
    () => Math.round(sessions.reduce((s, x) => s + Number(x.durationSec ?? 0), 0) / 60),
    [sessions],
  );
  const progress = phaseTotal > 0 ? 1 - remaining / phaseTotal : 0;
  const R = 130, STROKE = 10, C = 2 * Math.PI * R;

  return (
    <div>
      <PageHeader title={t("focus.title")} subtitle={t("focus.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Timer */}
        <Card className="relative flex flex-col items-center gap-6 overflow-hidden p-8">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
          <div className="flex gap-2">
            {(["focus", "break"] as const).map((p) => (
              <button
                key={p}
                onClick={() => { if (!running) { setPhase(p); } }}
                disabled={running}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-40",
                  phase === p ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground",
                )}
              >
                {p === "focus" ? t("focus.focus") : t("focus.break")}
              </button>
            ))}
          </div>

          <div className="relative grid place-items-center">
            <svg width={2 * R + STROKE} height={2 * R + STROKE} className="-rotate-90">
              <circle cx={R + STROKE / 2} cy={R + STROKE / 2} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-muted" />
              <motion.circle
                cx={R + STROKE / 2} cy={R + STROKE / 2} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE}
                strokeLinecap="round" strokeDasharray={C}
                animate={{ strokeDashoffset: C * (1 - progress) }}
                transition={{ ease: "linear", duration: 0.9 }}
                className={phase === "focus" ? "text-primary" : "text-gold"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-6xl font-bold tabular-nums tracking-tight">{fmt(remaining)}</span>
              <span className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <ModeIcon name={mode.icon} className={cn("h-4 w-4", mode.accent)} /> {mode.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="lg" onClick={toggle}>
              {running ? <><Pause className="h-5 w-5" /> {t("focus.pause")}</> : <><Play className="h-5 w-5" /> {t("focus.start")}</>}
            </Button>
            <Button size="lg" variant="outline" onClick={reset}><RotateCcw className="h-5 w-5" /></Button>
          </div>
        </Card>

        {/* Setup + stats */}
        <div className="space-y-5">
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold">{t("focus.mode")}</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModeId(m.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition",
                    modeId === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("grid h-8 w-8 place-items-center rounded-lg", m.bg)}>
                    <ModeIcon name={m.icon} className={cn("h-4 w-4", m.accent)} />
                  </span>
                  <span className="font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold">{t("focus.preset")}</p>
            <div className="space-y-2">
              {FOCUS_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPresetId(p.id); }}
                  disabled={running}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition disabled:opacity-50",
                    presetId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.focusMin}/{p.breakMin} min</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-2 text-sm font-semibold">{t("focus.intention")}</p>
            <Input value={intention} onChange={(e) => setIntention(e.target.value)} list="focus-intentions" placeholder={t("focus.intentionPlaceholder")} />
            <datalist id="focus-intentions">
              {FOCUS_INTENTIONS.map((i) => <option key={i} value={i} />)}
            </datalist>
          </Card>

          <Card className="flex items-center justify-around p-5 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-primary">{sessions.length}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3 w-3" /> {t("focus.sessionsToday")}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="font-display text-2xl font-bold text-primary">{totalMin}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><TimerIcon className="h-3 w-3" /> {t("focus.minutesToday")}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
