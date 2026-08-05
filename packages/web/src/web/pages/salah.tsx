import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Check,
  Users,
  Flame,
  MapPin,
  Clock,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable, useSingleton } from "@/hooks/use-store";
import { upsert, setSingleton, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  ProgressRing,
  Modal,
  Switch,
  Input,
} from "@/components/ui/primitives";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import {
  PRAYERS,
  SUNNAH_PRAYERS,
  prayerStreak,
  ymd,
  currentMonth,
} from "@/lib/domain";
import {
  computePrayerTimes,
  getNextPrayer,
  formatCountdown,
  formatTimeInZone,
  localTimezoneHours,
} from "@/lib/content/islamic";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

/* ── Prayer emoji mapping ── */
const PRAYER_EMOJI: Record<string, string> = {
  fajr: "🌅",
  dhuhr: "☀️",
  asr: "🌤️",
  maghrib: "🌇",
  isha: "🌙",
};

/* ═══════════════════════════════════════════ */
/* MAIN SALAH COMPONENT                        */
/* ═══════════════════════════════════════════ */
export default function Salah() {
  const { t, lang } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const logs = useTable<Row>("prayerLogs");
  const day = todayHelper();
  const month = currentMonth();
  const now = useNow(1000);
  const [manage, setManage] = useState(false);

  const todayLog = logs.find((l) => l.date === day);

  /* ── Prayer times computation ── */
  const tz = localTimezoneHours(now);
  const lat = Number(profile?.latitude ?? -6.2088);
  const lng = Number(profile?.longitude ?? 106.8456);

  const times = useMemo(() => {
    if (!now) return null;
    try {
      return computePrayerTimes({ date: now, lat, lng, timezone: tz });
    } catch {
      return null;
    }
  }, [now, lat, lng, tz]);

  const next = useMemo(() => {
    if (!times || !now) return null;
    return getNextPrayer(times, now);
  }, [times, now]);

  /* ── Done count ── */
  const doneToday = PRAYERS.filter((k) => Number(todayLog?.[k] ?? 0) > 0).length;
  const pct = Math.round((doneToday / 5) * 100);

  /* ── Sunnah prayers ── */
  const sunnahList: string[] = profile?.sunnahPrayers
    ? (JSON.parse(String(profile.sunnahPrayers)) as string[])
    : [];
  const sunnahState: Record<string, boolean> = todayLog?.sunnah
    ? (JSON.parse(String(todayLog.sunnah)) as Record<string, boolean>)
    : {};

  /* ── Set prayer ── */
  async function setPrayer(key: string, value: number) {
    const base = todayLog ?? { id: uid(), date: day };
    await upsert("prayerLogs", { ...base, id: String(base.id), [key]: value });
  }

  /* ── Toggle sunnah ── */
  async function toggleSunnah(key: string) {
    const base = todayLog ?? { id: uid(), date: day };
    const next = { ...sunnahState, [key]: !sunnahState[key] };
    await upsert("prayerLogs", { ...base, id: String(base.id), sunnah: JSON.stringify(next) });
  }

  /* ── Month completion ── */
  const monthLogs = logs.filter((l) => String(l.date).startsWith(month));
  const totalSlots = monthLogs.length * 5;
  const filled = monthLogs.reduce(
    (s, l) => s + PRAYERS.filter((k) => Number(l[k] ?? 0) > 0).length,
    0,
  );
  const donePct = totalSlots ? Math.round((filled / totalSlots) * 100) : 0;

  /* ── History heatmap data (14 days) ── */
  const historyData = useMemo(() => {
    const out: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      const row = logs.find((l) => String(l.date) === dStr);
      const done = row ? PRAYERS.filter((k) => Number(row[k] ?? 0) > 0).length : 0;
      out.push({ date: dStr, value: done });
    }
    return out;
  }, [logs]);

  /* ── Streak ── */
  const streak = useMemo(() => {
    const map = new Map(logs.map((p) => [String(p.date), p]));
    return prayerStreak(map);
  }, [logs]);

  return (
    <div>
      <PageHeader
        title={t("prayer.title")}
        subtitle={t("salah.subtitle")}
        icon={<Sparkles className="h-5 w-5" />}
      />

      {/* ── Prayer times + progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Prayer times grid */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-lg font-medium">Waktu Shalat Hari Ini</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" /> {profile?.location || "Jakarta, Indonesia"}
              </p>
            </div>
            {next && now ? (
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Shalat berikutnya</p>
                <p className="font-display text-xl font-semibold text-primary">{next.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatTimeInZone(next.time, tz)} · in {formatCountdown(next.msRemaining)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PRAYERS.map((name) => {
              const key = name.toLowerCase();
              const time = times?.[name];
              const done = Number(todayLog?.[key] ?? 0) > 0;
              const isNext = next?.name === name && next.isToday;
              const past = time && now && time.getTime() < now.getTime();

              return (
                <motion.button
                  key={name}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void setPrayer(key, done ? 0 : 1)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-2xl border p-4 transition-all",
                    done
                      ? "border-primary/40 bg-primary/8"
                      : isNext
                        ? "border-primary/60 bg-primary/5"
                        : "border-border hover:bg-muted/40",
                  )}
                >
                  <span className="text-2xl">{PRAYER_EMOJI[key]}</span>
                  <span className={cn("text-sm font-medium", done ? "text-primary" : "text-foreground")}>
                    {t(`prayer.${key}` as never)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {time ? formatTimeInZone(time, tz) : "—"}
                  </span>
                  {done ? (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : past ? (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500" />
                  ) : isNext ? (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>

          {/* Sunnah */}
          <div className="mt-5 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <div>
              <p className="text-sm font-medium">{t("prayer.sunnah")}</p>
              <p className="text-xs text-muted-foreground">Tahiyatul wudu, rawatib, tahajjud…</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setManage(true)}>
                ⚙️
              </Button>
            </div>
          </div>
        </Card>

        {/* Today progress */}
        <Card className="flex flex-col items-center justify-center gap-2 p-5">
          <ProgressRing value={pct / 100} size={140} stroke={11}>
            <span className="font-display text-3xl font-semibold">{doneToday}</span>
            <span className="text-xs text-muted-foreground">of 5</span>
          </ProgressRing>
          <p className="text-sm font-medium mt-4">{t("prayer.today")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doneToday === 5 ? "Semua shalat selesai, mashaAllah" : `${5 - doneToday} lagi`}
          </p>
          {streak > 0 && (
            <div className="flex items-center gap-2 mt-4 rounded-lg bg-amber-500/10 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {streak} hari berturut-turut
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* ── 14-day history heatmap ── */}
      <Card className="p-5 mb-6">
        <h3 className="font-display text-lg font-medium mb-1">Riwayat Shalat</h3>
        <p className="text-sm text-muted-foreground mb-5">14 hari terakhir · hijau = selesai</p>
        <ConsistencyHeatmap data={historyData} color="primary" weeks={2} />
      </Card>

      {/* ── Sunnah management ── */}
      {sunnahList.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display text-lg font-semibold mb-3">{t("prayer.sunnah")}</h3>
          <div className="flex flex-wrap gap-2">
            {sunnahList.map((key) => {
              const meta = SUNNAH_PRAYERS.find((s) => s.key === key);
              const on = sunnahState[key];
              return (
                <button
                  key={key}
                  onClick={() => void toggleSunnah(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all",
                    on
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {lang === "id" ? meta?.name_id : meta?.name_en}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <ManageSunnahModal open={manage} onClose={() => setManage(false)} selected={sunnahList} />
    </div>
  );
}

/* ── Manage Sunnah Modal ── */
function ManageSunnahModal({
  open,
  onClose,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
}) {
  const { t, lang } = useI18n();

  async function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    await setSingleton("userProfile", { sunnahPrayers: JSON.stringify(next) });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("prayer.sunnah.manage")}>
      <div className="space-y-2">
        {SUNNAH_PRAYERS.map((s) => (
          <label
            key={s.key}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3"
          >
            <span className="text-sm font-medium">{lang === "id" ? s.name_id : s.name_en}</span>
            <Switch checked={selected.includes(s.key)} onChange={() => void toggle(s.key)} />
          </label>
        ))}
      </div>
      <Button className="mt-4 w-full" onClick={onClose}>
        {t("common.done")}
      </Button>
    </Modal>
  );
}
