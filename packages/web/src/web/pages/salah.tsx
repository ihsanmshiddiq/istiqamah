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

/* ── Sunnah presets (NizamOS style) ── */
const SUNNAH_PRESETS: { key: string; nameId: string; nameEn: string }[] = [
  { key: "qobliyah_fajr", nameId: "Qobliyah Subuh", nameEn: "Before Fajr" },
  { key: "rawatib_dhuhr_before", nameId: "Qobliyah Dzuhur", nameEn: "Before Dhuhr" },
  { key: "rawatib_dhuhr_after", nameId: "Ba'diyah Dzuhur", nameEn: "After Dhuhr" },
  { key: "rawatib_isha_before", nameId: "Qobliyah Isya", nameEn: "Before Isha" },
  { key: "rawatib_isha_after", nameId: "Ba'diyah Isya", nameEn: "After Isha" },
  { key: "rawatib_maghrib_after", nameId: "Ba'diyah Maghrib", nameEn: "After Maghrib" },
  { key: "dhuha", nameId: "Dhuha", nameEn: "Dhuha" },
  { key: "tahajjud", nameId: "Tahajud", nameEn: "Tahajjud" },
  { key: "witr", nameId: "Witir", nameEn: "Witr" },
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
  const [manage, setManage] = useState(false);
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

  /* ── Quality details per prayer (stored in sunnah JSON as _details) ── */
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

  /* ── Set prayer ── */
  async function setPrayer(key: string, value: number) {
    const base = todayLog ?? { id: uid(), date: day };
    await upsert("prayerLogs", { ...base, id: String(base.id), [key]: value });
  }

  /* ── Toggle quality attribute (stored in sunnah JSON) ── */
  async function toggleQuality(prayerKey: string, attr: "jamaah" | "onTime" | "masbuk") {
    const base = todayLog ?? { id: uid(), date: day };
    const cur = qualityDetails[prayerKey] || { jamaah: false, onTime: false, masbuk: false };
    const newDetail = { ...cur, [attr]: !cur[attr] };
    // If toggling any quality attribute ON, also mark prayer as done
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
    const next = { ...sunnahState, [key]: !sunnahState[key] };
    await upsert("prayerLogs", { ...base, id: String(base.id), sunnah: JSON.stringify(next) });
  }



  /* ── Month stats for guilt-free UX ── */
  const monthLogs = logs.filter((l) => String(l.date).startsWith(month));
  const consistentDays = monthLogs.filter(
    (l) => PRAYERS.filter((k) => Number(l[k] ?? 0) > 0).length >= 5,
  ).length;

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

  /* ── Guilt-free messages ── */
  const guiltMessage = useMemo(() => {
    if (doneToday === 5) return t("prayer.guilt.allDone");
    if (doneToday >= 3) return t("prayer.guilt.almost", { n: String(5 - doneToday) });
    if (doneToday >= 1) return t("prayer.guilt.encourage");
    // Check if user had prayers yesterday (recovery message)
    const yesterday = ymd(new Date(Date.now() - 86400000));
    const yesterdayLog = logs.find((l) => String(l.date) === yesterday);
    const yesterdayDone = yesterdayLog
      ? PRAYERS.filter((k) => Number(yesterdayLog[k] ?? 0) > 0).length
      : 0;
    if (yesterdayDone > 0) return t("prayer.guilt.recovery");
    return t("prayer.guilt.encourage");
  }, [doneToday, logs, t]);

  return (
    <div>
      <PageHeader
        title={t("prayer.title")}
        subtitle={t("salah.subtitle")}
        icon={<Sparkles className="h-5 w-5" />}
      />

      {/* ── Prayer times + progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Prayer times grid (hayat-os style) */}
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

          {/* Prayer cards (hayat-os style with quality toggles) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PRAYERS.map((name) => {
              const key = name.toLowerCase();
              const time = times?.[name];
              const done = Number(todayLog?.[key] ?? 0) > 0;
              const isNext = next?.name === name && next.isToday;
              const past = time && now && time.getTime() < now.getTime();
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
                  <span className="text-arabic text-xs text-muted-foreground">{PRAYER_AR[name]}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {time ? formatTimeInZone(time, tz) : "—"}
                  </span>
                  {/* Status indicator - guilt-free: no red dot, just gentle styling */}
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

          {/* Quality toggles per prayer (NizamOS style, hidden for female) */}
          {!isFemale && (
          <div className="mt-4 space-y-2">
            {PRAYERS.map((name) => {
              const key = name.toLowerCase();
              const done = Number(todayLog?.[key] ?? 0) > 0;
              const detail = getDetail(key);
              const past = times?.[name] && now && times[name].getTime() < now.getTime();

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
                  {/* Quality buttons */}
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

          {/* Sunnah section (NizamOS style — preset chips, no counter) */}
          <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">{t("prayer.sunnah.counter")}</p>
                <p className="text-xs text-muted-foreground">{t("prayer.sunnah.counterDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {sunnahCheckCount}/{sunnahList.length} selesai
                </span>
                <button
                  onClick={() => setManage(true)}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sunnah checklist chips (NizamOS style) */}
            {sunnahList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {sunnahList.map((key) => {
                  const preset = SUNNAH_PRESETS.find((p) => p.key === key);
                  const meta = SUNNAH_PRAYERS.find((s) => s.key === key);
                  const label = preset
                    ? lang === "id"
                      ? preset.nameId
                      : preset.nameEn
                    : lang === "id"
                      ? meta?.name_id
                      : meta?.name_en;
                  const on = sunnahState[key];
                  return (
                    <button
                      key={key}
                      onClick={() => void toggleSunnah(key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                        on
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "border-border text-muted-foreground hover:border-amber-500/30",
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                onClick={() => setManage(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> {t("prayer.sunnah.manage")}
              </button>
            )}
          </div>
        </Card>

        {/* Settings button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={openSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Settings2 className="h-3.5 w-3.5" /> {t("prayer.sunnah.manage")}
          </button>
        </div>

        {/* Today progress (hayat-os style) */}
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

          {/* Streak badge */}
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

      {/* ── 14-day history heatmap ── */}
      <Card className="p-5 mb-6">
        <h3 className="font-display text-lg font-medium mb-1">Riwayat Shalat</h3>
        <p className="text-sm text-muted-foreground mb-5">14 hari terakhir · hijau = selesai</p>
        <ConsistencyHeatmap data={historyData} color="primary" weeks={2} />
      </Card>

      {/* ── Sunnah management modal ── */}
      <ManageSunnahModal open={manage} onClose={() => setManage(false)} selected={sunnahList} />

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

/* ── Manage Sunnah Modal (NizamOS style with presets) ── */
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

  async function addPreset(preset: { key: string; nameId: string; nameEn: string }) {
    if (selected.includes(preset.key)) return;
    const next = [...selected, preset.key];
    await setSingleton("userProfile", { sunnahPrayers: JSON.stringify(next) });
  }

  async function removeKey(key: string) {
    const next = selected.filter((k) => k !== key);
    await setSingleton("userProfile", { sunnahPrayers: JSON.stringify(next) });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("prayer.sunnah.manage")}>
      <div className="space-y-4">
        {/* Active selections */}
        {selected.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Aktif
            </p>
            <div className="space-y-1.5">
              {selected.map((key) => {
                const preset = SUNNAH_PRESETS.find((p) => p.key === key);
                const meta = SUNNAH_PRAYERS.find((s) => s.key === key);
                const label = preset
                  ? lang === "id"
                    ? preset.nameId
                    : preset.nameEn
                  : lang === "id"
                    ? meta?.name_id
                    : meta?.name_en;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {label}
                    </span>
                    <button
                      onClick={() => void removeKey(key)}
                      className="text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preset picker */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Tambah dari preset
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUNNAH_PRESETS.filter((p) => !selected.includes(p.key)).map((p) => (
              <button
                key={p.key}
                onClick={() => void addPreset(p)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
              >
                <Plus className="h-3 w-3" />
                {lang === "id" ? p.nameId : p.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle from full list */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Semua sunnah
          </p>
          <div className="space-y-1.5">
            {SUNNAH_PRAYERS.map((s) => (
              <label
                key={s.key}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-2.5 hover:bg-muted/40 transition"
              >
                <span className="text-sm font-medium">{lang === "id" ? s.name_id : s.name_en}</span>
                <Switch checked={selected.includes(s.key)} onChange={() => void toggle(s.key)} />
              </label>
            ))}
          </div>
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={onClose}>
        {t("common.done")}
      </Button>
    </Modal>
  );
}
