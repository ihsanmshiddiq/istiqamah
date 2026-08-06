import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Check,
  Users,
  User,
  Flame,
  MapPin,
  Clock,
  Timer,
  AlertCircle,
  Star,
  Plus,
  Trash2,
  Settings2,
  Heart,
  X,
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
  Field,
} from "@/components/ui/primitives";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import {
  PRAYERS,
  SUNNAH_PRAYERS,
  prayerStreak,
  ymd,
  currentMonth,
  habitStreak,
} from "@/lib/domain";
import {
  computePrayerTimes,
  getNextPrayer,
  formatCountdown,
  formatTimeInZone,
  localTimezoneHours,
  PRAYER_AR,
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

/* ── Capitalize helper for prayer times lookup ── */
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Sunnah presets ── */
const SUNNAH_PRESETS: { key: string; nameId: string; nameEn: string; icon: string }[] = [
  { key: "qobliyah_fajr", nameId: "Qobliyah Subuh", nameEn: "Before Fajr", icon: "🌅" },
  { key: "rawatib_dhuhr_before", nameId: "Qobliyah Dzuhur", nameEn: "Before Dhuhr", icon: "☀️" },
  { key: "rawatib_dhuhr_after", nameId: "Ba'diyah Dzuhur", nameEn: "After Dhuhr", icon: "☀️" },
  { key: "rawatib_isha_before", nameId: "Qobliyah Isya", nameEn: "Before Isha", icon: "🌙" },
  { key: "rawatib_isha_after", nameId: "Ba'diyah Isya", nameEn: "After Isha", icon: "🌙" },
  { key: "rawatib_maghrib_after", nameId: "Ba'diyah Maghrib", nameEn: "After Maghrib", icon: "🌇" },
  { key: "dhuha", nameId: "Dhuha", nameEn: "Dhuha", icon: "🌤️" },
  { key: "tahajjud", nameId: "Tahajud", nameEn: "Tahajjud", icon: "🌙" },
  { key: "witr", nameId: "Witir", nameEn: "Witr", icon: "✨" },
];

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ lat: "", lng: "" });

  const todayLog = logs.find((l) => l.date === day);
  const isFemale = profile?.gender === "female";

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

  /* ── Prayer time settings ── */
  function openSettings() {
    setSettingsForm({ lat: String(lat), lng: String(lng) });
    setSettingsOpen(true);
  }
  async function saveSettings() {
    await setSingleton("userProfile", {
      latitude: Number(settingsForm.lat),
      longitude: Number(settingsForm.lng),
    });
    setSettingsOpen(false);
  }

  /* ── Quality details per prayer ── */
  const sunnahData: Record<string, any> = todayLog?.sunnah
    ? (JSON.parse(String(todayLog.sunnah)) as Record<string, any>)
    : {};
  const qualityDetails: Record<string, { jamaah: boolean; onTime: boolean; masbuk: boolean }> = sunnahData._details || {};

  const getDetail = (key: string): { jamaah: boolean; onTime: boolean; masbuk: boolean } => {
    return qualityDetails[key] || { jamaah: false, onTime: false, masbuk: false };
  };

  /* ── Sunnah prayers ── */
  const sunnahList: string[] = profile?.sunnahPrayers
    ? (JSON.parse(String(profile.sunnahPrayers)) as string[])
    : [];
  const sunnahState: Record<string, boolean> = Object.fromEntries(
    Object.entries(sunnahData).filter(([k]) => !k.startsWith("_"))
  );
  const sunnahCheckCount = Object.values(sunnahState).filter(Boolean).length;

  /* ── Sunnah streak (based on days with at least one sunnah done) ── */
  const sunnahStreak = useMemo(() => {
    const doneDates = new Set<string>();
    for (const l of logs) {
      const data: Record<string, any> = l.sunnah ? JSON.parse(String(l.sunnah)) : {};
      const hasDone = Object.entries(data).some(([k, v]) => !k.startsWith("_") && v === true);
      if (hasDone) doneDates.add(String(l.date));
    }
    return habitStreak(doneDates);
  }, [logs]);

  /* ── Set prayer ── */
  async function setPrayer(key: string, value: number) {
    const base = todayLog ?? { id: uid(), date: day };
    await upsert("prayerLogs", { ...base, id: String(base.id), [key]: value });
  }

  /* ── Toggle quality attribute ── */
  async function toggleQuality(prayerKey: string, attr: "jamaah" | "onTime" | "masbuk") {
    const base = todayLog ?? { id: uid(), date: day };
    const cur = qualityDetails[prayerKey] || { jamaah: false, onTime: false, masbuk: false };
    const newDetail = { ...cur, [attr]: !cur[attr] };
    const newPrayerVal = newDetail[attr] ? 1 : Number(base[prayerKey] ?? 0);
    const updatedDetails = { ...qualityDetails, [prayerKey]: newDetail };
    const updatedSunnah = { ...sunnahData, _details: updatedDetails };
    await upsert("prayerLogs", {
      ...base,
      id: String(base.id),
      [prayerKey]: newPrayerVal,
      sunnah: JSON.stringify(updatedSunnah),
    });
  }

  /* ── Toggle sunnah ── */
  async function toggleSunnah(key: string) {
    const base = todayLog ?? { id: uid(), date: day };
    const nextSunnah = { ...sunnahState, [key]: !sunnahState[key] };
    await upsert("prayerLogs", { ...base, id: String(base.id), sunnah: JSON.stringify(nextSunnah) });
  }

  /* ── Remove sunnah from active list ── */
  async function removeSunnah(key: string) {
    const next = sunnahList.filter((k) => k !== key);
    await setSingleton("userProfile", { sunnahPrayers: JSON.stringify(next) });
  }

  /* ── Add sunnah to active list ── */
  async function addSunnah(key: string) {
    if (sunnahList.includes(key)) return;
    await setSingleton("userProfile", { sunnahPrayers: JSON.stringify([...sunnahList, key]) });
  }

  /* ── Add custom sunnah (user-typed) ── */
  async function addCustomSunnah(name: string) {
    const key = `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    if (sunnahList.includes(key)) return;
    await setSingleton("userProfile", {
      sunnahPrayers: JSON.stringify([...sunnahList, key]),
      customSunnahNames: JSON.stringify({
        ...(profile?.customSunnahNames ? JSON.parse(String(profile.customSunnahNames)) : {}),
        [key]: name,
      }),
    });
  }

  /* ── Month stats ── */
  const monthLogs = logs.filter((l) => String(l.date).startsWith(month));
  const consistentDays = monthLogs.filter(
    (l) => PRAYERS.filter((k) => Number(l[k] ?? 0) > 0).length >= 5,
  ).length;

  /* ── History heatmap data (14 days) ── */
  const historyData = useMemo(() => {
    const out: { date: string; value: number }[] = [];
    const nowDate = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(nowDate);
      d.setDate(d.getDate() - i);
      const dStr = ymd(d);
      const row = logs.find((l) => String(l.date) === dStr);
      const done = row ? PRAYERS.filter((k) => Number(row[k] ?? 0) > 0).length : 0;
      out.push({ date: dStr, value: done });
    }
    return out;
  }, [logs]);

  /* ── Prayer streak ── */
  const streak = useMemo(() => {
    const map = new Map(logs.map((p) => [String(p.date), p]));
    return prayerStreak(map);
  }, [logs]);

  /* ── Guilt-free messages ── */
  const guiltMessage = useMemo(() => {
    if (doneToday === 5) return t("prayer.guilt.allDone");
    if (doneToday >= 3) return t("prayer.guilt.almost", { n: String(5 - doneToday) });
    if (doneToday >= 1) return t("prayer.guilt.encourage");
    const yesterday = ymd(new Date(Date.now() - 86400000));
    const yesterdayLog = logs.find((l) => String(l.date) === yesterday);
    const yesterdayDone = yesterdayLog
      ? PRAYERS.filter((k) => Number(yesterdayLog[k] ?? 0) > 0).length
      : 0;
    if (yesterdayDone > 0) return t("prayer.guilt.recovery");
    return t("prayer.guilt.encourage");
  }, [doneToday, logs, t]);

  /* ── Available sunnah suggestions (not yet active) ── */
  const sunnahSuggestions = useMemo(() => {
    return SUNNAH_PRESETS.filter((p) => !sunnahList.includes(p.key));
  }, [sunnahList]);

  return (
    <div>
      <PageHeader
        title={t("prayer.title")}
        subtitle={t("salah.subtitle")}
        icon={<Sparkles className="h-5 w-5" />}
      />

      {/* ── Prayer times + progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Prayer times card */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-lg font-medium">Waktu Shalat Hari Ini</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" /> {profile?.location || "Jakarta, Indonesia"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {next && now ? (
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Shalat berikutnya</p>
                  <p className="font-display text-xl font-semibold text-primary">{next.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatTimeInZone(next.time, tz)} · in {formatCountdown(next.msRemaining)}
                  </p>
                </div>
              ) : null}
              <button
                onClick={openSettings}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                title="Atur waktu sholat"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Prayer cards — using capitalized key for times lookup */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PRAYERS.map((name) => {
              const key = name.toLowerCase();
              const time = times?.[capitalize(name) as keyof typeof times];
              const done = Number(todayLog?.[key] ?? 0) > 0;
              const isNext = next?.name.toLowerCase() === key && next.isToday;
              const detail = getDetail(key);

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
                  <span className="text-arabic text-xs text-muted-foreground">{PRAYER_AR[capitalize(name)]}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {time ? formatTimeInZone(time as Date, tz) : "—"}
                  </span>
                  {/* Status indicator */}
                  {done ? (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : isNext ? (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>

          {/* Quality toggles (hidden for female) */}
          {!isFemale && (
            <div className="mt-4 space-y-2">
              {PRAYERS.map((name) => {
                const key = name.toLowerCase();
                const done = Number(todayLog?.[key] ?? 0) > 0;
                const detail = getDetail(key);
                const past = times?.[capitalize(name) as keyof typeof times] && (times[capitalize(name) as keyof typeof times] as Date).getTime() < now.getTime();

                if (!done && !past) return null;

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2 transition-all",
                      done ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/20 opacity-60",
                    )}
                  >
                    <span className="text-lg">{PRAYER_EMOJI[key]}</span>
                    <span className="text-xs font-medium min-w-[60px]">
                      {t(`prayer.${key}` as never)}
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={() => void toggleQuality(key, "jamaah")}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all",
                        detail.jamaah
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "border-border text-muted-foreground hover:border-emerald-500/30",
                      )}
                    >
                      {detail.jamaah ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {detail.jamaah ? t("prayer.quality.jamaah") : t("prayer.quality.munfarid")}
                    </button>
                    <button
                      onClick={() => void toggleQuality(key, "onTime")}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all",
                        detail.onTime
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "border-border text-muted-foreground hover:border-amber-500/30",
                      )}
                    >
                      <Timer className="h-3 w-3" />
                      {detail.onTime ? t("prayer.quality.onTime") : t("prayer.quality.early")}
                    </button>
                    {past && !done && (
                      <button
                        onClick={() => void toggleQuality(key, "masbuk")}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all",
                          detail.masbuk
                            ? "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            : "border-border text-muted-foreground hover:border-violet-500/30",
                        )}
                      >
                        <AlertCircle className="h-3 w-3" />
                        {detail.masbuk ? t("prayer.quality.masbuk") : t("prayer.quality.notMasbuk")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Today progress */}
        <Card className="flex flex-col items-center justify-center gap-2 p-5">
          <ProgressRing value={pct / 100} size={140} stroke={11}>
            <span className="font-display text-3xl font-semibold">{doneToday}</span>
            <span className="text-xs text-muted-foreground">of 5</span>
          </ProgressRing>
          <p className="text-sm font-medium mt-4">{t("prayer.today")}</p>

          {/* Guilt-free message */}
          <motion.p
            key={guiltMessage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground mt-0.5 text-center px-2"
          >
            {guiltMessage}
          </motion.p>

          {/* Prayer streak badge */}
          {streak > 0 && (
            <div className="flex items-center gap-2 mt-3 rounded-lg bg-amber-500/10 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {streak} hari berturut-turut
              </span>
            </div>
          )}

          {/* Consistent days this month */}
          <div className="flex items-center gap-2 mt-2 rounded-lg bg-primary/5 px-3 py-1.5">
            <Heart className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary/80">
              {consistentDays} hari konsisten bulan ini
            </span>
          </div>
        </Card>
      </div>

      {/* ── Sunnah Card (habits-style) ── */}
      <SunnahCard
        sunnahList={sunnahList}
        sunnahState={sunnahState}
        sunnahCheckCount={sunnahCheckCount}
        sunnahStreak={sunnahStreak}
        onToggle={toggleSunnah}
        onRemove={removeSunnah}
        onAddCustom={addCustomSunnah}
        customNames={profile?.customSunnahNames ? JSON.parse(String(profile.customSunnahNames)) : undefined}
        t={t}
        lang={lang}
      />

      {/* ── Sunnah Suggestions (like ContohHabit) ── */}
      {sunnahSuggestions.length > 0 && (
        <Card className="mt-5 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-sm">{t("prayer.sunnah.suggestions")}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{t("prayer.sunnah.suggestionsDesc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {sunnahSuggestions.map((preset) => (
              <button
                key={preset.key}
                onClick={() => void addSunnah(preset.key)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition text-left group"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 text-lg">
                  {preset.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {lang === "id" ? preset.nameId : preset.nameEn}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Sholat sunnah</div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── 14-day history heatmap ── */}
      <Card className="p-5 mt-6">
        <h3 className="font-display text-lg font-medium mb-1">Riwayat Shalat</h3>
        <p className="text-sm text-muted-foreground mb-5">14 hari terakhir · hijau = selesai</p>
        <ConsistencyHeatmap data={historyData} color="primary" weeks={2} />
      </Card>

      {/* ── Prayer time settings modal ── */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Atur Waktu Sholat">
        <div className="space-y-4">
          <Field label="Latitude">
            <Input
              type="number"
              step="0.001"
              value={settingsForm.lat}
              onChange={(e) => setSettingsForm({ ...settingsForm, lat: e.target.value })}
              placeholder="-6.2088"
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="0.001"
              value={settingsForm.lng}
              onChange={(e) => setSettingsForm({ ...settingsForm, lng: e.target.value })}
              placeholder="106.8456"
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            Lokasi default: Jakarta, Indonesia (-6.2088, 106.8456)
          </p>
          <Button className="w-full" onClick={saveSettings}>
            {t("common.save")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* SUNNAH CARD — habits-style dedicated card    */
/* ──────────────────────────────────────────── */
function SunnahCard({
  sunnahList,
  sunnahState,
  sunnahCheckCount,
  sunnahStreak,
  onToggle,
  onRemove,
  onAddCustom,
  customNames,
  t,
  lang,
}: {
  customNames?: Record<string, string>;
  sunnahList: string[];
  sunnahState: Record<string, boolean>;
  sunnahCheckCount: number;
  sunnahStreak: number;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onAddCustom: (name: string) => void;
  t: (key: string) => string;
  lang: "id" | "en";
}) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");

  function handleAddCustom() {
    if (!customName.trim()) return;
    onAddCustom(customName.trim());
    setCustomName("");
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display font-bold text-sm flex items-center gap-2">
            {t("prayer.sunnah.counter")}
            {sunnahList.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {sunnahCheckCount}/{sunnahList.length}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{t("prayer.sunnah.counterDesc")}</p>
        </div>
        {sunnahStreak > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
            <Flame className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {sunnahStreak} hari
            </span>
          </div>
        )}
      </div>

      {sunnahList.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">
          {t("prayer.sunnah.empty")}
        </div>
      ) : (
        <div className="space-y-1.5">
          {sunnahList.map((key) => {
            const preset = SUNNAH_PRESETS.find((p) => p.key === key);
            const meta = SUNNAH_PRAYERS.find((s) => s.key === key);
            const customLabel = customNames?.[key];
            const label = customLabel
              ?? (preset
                ? lang === "id" ? preset.nameId : preset.nameEn
                : lang === "id" ? meta?.name_id : meta?.name_en)
              ?? key;
            const icon = preset?.icon || "✨";
            const on = sunnahState[key];

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                  on
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span className="text-lg">{icon}</span>
                <button
                  onClick={() => onToggle(key)}
                  className="flex-1 text-left"
                >
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    on ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                  )}>
                    {label}
                  </span>
                </button>
                {on && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <button
                  onClick={() => {
                    if (confirmRemove === key) {
                      void onRemove(key);
                      setConfirmRemove(null);
                    } else {
                      setConfirmRemove(key);
                      setTimeout(() => setConfirmRemove(null), 2000);
                    }
                  }}
                  className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                    confirmRemove === key
                      ? "text-rose-500 bg-rose-500/10"
                      : "text-muted-foreground hover:text-rose-500 hover:bg-muted",
                  )}
                  title={confirmRemove === key ? "Klik lagi untuk hapus" : "Hapus"}
                >
                  {confirmRemove === key ? <Check className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom sunnah input */}
      <div className="mt-4 flex gap-2">
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={t("prayer.sunnah.customPlaceholder")}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddCustom(); }}
          className="flex-1"
        />
        <Button size="sm" onClick={handleAddCustom} disabled={!customName.trim()}>
          <Plus className="h-3.5 w-3.5" /> {t("prayer.sunnah.addCustom")}
        </Button>
      </div>
    </Card>
  );
}
