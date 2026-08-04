import { useMemo, useState } from "react";
import { motion } from "motion/react";
import * as Icons from "lucide-react";
import { Plus, Flame, Check, Users, Trash2, RotateCcw, BookOpenText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable, useSingleton } from "@/hooks/use-store";
import { upsert, remove, setSingleton, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  Field,
  Input,
  Label,
  Modal,
  ProgressRing,
  SegmentedControl,
  Switch,
  Textarea,
  EmptyState,
  Select,
} from "@/components/ui/primitives";
import {
  HABIT_SUGGESTIONS,
  HABIT_COLORS,
  habitStreak,
  last7Days,
  shortDay,
  PRAYERS,
  SUNNAH_PRAYERS,
  addDays,
  PAGES_PER_JUZ,
  currentMonth,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

type Tab = "habits" | "prayer" | "hifdz";

// dynamic lucide icon by name
function DynIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Sparkles;
  return <Cmp className={className} />;
}

export default function Ibadah() {
  const { t } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const hifdzOn = profile?.hifdzEnabled ?? true;
  const [tab, setTab] = useState<Tab>("habits");

  const options = [
    { value: "habits" as const, label: t("ibadah.tab.habits") },
    { value: "prayer" as const, label: t("ibadah.tab.prayer") },
    ...(hifdzOn ? [{ value: "hifdz" as const, label: t("ibadah.tab.hifdz") }] : []),
  ];

  return (
    <div>
      <PageHeader title={t("ibadah.title")} subtitle={t("ibadah.subtitle")} />
      <div className="mb-6 overflow-x-auto no-scrollbar">
        <SegmentedControl value={tab} onChange={setTab} options={options} />
      </div>
      {tab === "habits" && <HabitsPanel />}
      {tab === "prayer" && <PrayerPanel />}
      {tab === "hifdz" && hifdzOn && <HifdzPanel />}
    </div>
  );
}

/* ------------------------------- HABITS ------------------------------- */
export function HabitsPanel() {
  const { t, lang } = useI18n();
  const habits = useTable<Row>("habits", (r) =>
    [...r].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
  );
  const logs = useTable<Row>("habitLogs");
  const days = last7Days();
  const day = todayHelper();
  const [open, setOpen] = useState(false);

  const logIndex = useMemo(() => {
    const m = new Map<string, Row>();
    for (const l of logs) m.set(`${l.habitId}:${l.date}`, l);
    return m;
  }, [logs]);

  async function toggle(habitId: string, date: string) {
    const existing = logIndex.get(`${habitId}:${date}`);
    if (existing) await upsert("habitLogs", { id: String(existing.id), done: !existing.done });
    else await upsert("habitLogs", { id: uid(), habitId, date, done: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t("habit.add")}
        </Button>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={<Icons.Sparkles className="h-8 w-8" />}
          title={t("habit.empty")}
          description={t("empty.habits.desc")}
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t("habit.add")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {habits.map((h, i) => {
            const done = new Set(
              logs.filter((l) => l.habitId === h.id && l.done).map((l) => String(l.date)),
            );
            const streak = habitStreak(done);
            const color = HABIT_COLORS[String(h.color)] ?? HABIT_COLORS.emerald;
            return (
              <motion.div
                key={String(h.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl", color.soft, color.text)}>
                      <DynIcon name={String(h.icon)} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{String(h.name)}</p>
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {streak > 0 ? (
                          <>
                            <Flame className="h-3.5 w-3.5 text-gold-foreground" /> {streak}{" "}
                            {t("habit.streak")}
                          </>
                        ) : (
                          t("habit.thisWeek")
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => void remove("habits", String(h.id))}
                      className="text-muted-foreground/40 transition-colors hover:text-destructive"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-1.5">
                    {days.map((d) => {
                      const isDone = done.has(d);
                      const isToday = d === day;
                      return (
                        <button
                          key={d}
                          onClick={() => void toggle(String(h.id), d)}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {shortDay(d, lang)[0]}
                          </span>
                          <span
                            className={cn(
                              "flex h-9 w-full items-center justify-center rounded-lg border text-xs transition-all",
                              isDone
                                ? cn(color.dot, "border-transparent text-white")
                                : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
                              isToday && !isDone && "ring-2 ring-primary/30",
                            )}
                          >
                            {isDone && <Check className="h-4 w-4" />}
                          </span>
                        </button>
                      );
                    })}
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
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("habit.namePlaceholder")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("habit.color")}>
            <div className="flex flex-wrap gap-2">
              {Object.entries(HABIT_COLORS).map(([k, c]) => (
                <button
                  key={k}
                  onClick={() => setColor(k)}
                  className={cn("h-7 w-7 rounded-full", c.dot, color === k && "ring-2 ring-offset-2 ring-offset-card ring-primary")}
                />
              ))}
            </div>
          </Field>
          <Field label={t("habit.icon")}>
            <Select value={icon} onChange={(e) => setIcon(e.target.value)}>
              {["Sparkles", "BookOpen", "Sunrise", "HandHeart", "Droplets", "Dumbbell", "Moon", "Heart", "Users", "Library"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
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

/* ------------------------------- PRAYER ------------------------------- */
export function PrayerPanel() {
  const { t, lang } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const logs = useTable<Row>("prayerLogs");
  const day = todayHelper();
  const month = currentMonth();
  const [manage, setManage] = useState(false);

  const todayLog = logs.find((l) => l.date === day);
  const sunnahList: string[] = profile?.sunnahPrayers
    ? (JSON.parse(String(profile.sunnahPrayers)) as string[])
    : [];
  const sunnahState: Record<string, boolean> = todayLog?.sunnah
    ? (JSON.parse(String(todayLog.sunnah)) as Record<string, boolean>)
    : {};

  async function setPrayer(key: string, value: number) {
    const base = todayLog ?? { id: uid(), date: day };
    await upsert("prayerLogs", { ...base, id: String(base.id), [key]: value });
  }
  async function toggleSunnah(key: string) {
    const base = todayLog ?? { id: uid(), date: day };
    const next = { ...sunnahState, [key]: !sunnahState[key] };
    await upsert("prayerLogs", { ...base, id: String(base.id), sunnah: JSON.stringify(next) });
  }

  // month completion
  const monthLogs = logs.filter((l) => String(l.date).startsWith(month));
  const totalSlots = monthLogs.length * 5;
  const filled = monthLogs.reduce(
    (s, l) => s + PRAYERS.filter((k) => Number(l[k] ?? 0) > 0).length,
    0,
  );
  const donePct = totalSlots ? Math.round((filled / totalSlots) * 100) : 0;

  const doneToday = PRAYERS.filter((k) => Number(todayLog?.[k] ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{t("prayer.today")}</h3>
            <span className="text-sm text-muted-foreground">{doneToday}/5</span>
          </div>
          <div className="space-y-2.5">
            {PRAYERS.map((k) => {
              const val = Number(todayLog?.[k] ?? 0);
              return (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{t(`prayer.${k}` as never)}</span>
                  <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
                    {[
                      { v: 0, label: t("prayer.status.none") },
                      { v: 1, label: t("prayer.status.done"), icon: Check },
                      { v: 2, label: t("prayer.status.jamaah"), icon: Users },
                    ].map((o) => {
                      const OIcon = o.icon;
                      return (
                        <button
                          key={o.v}
                          onClick={() => void setPrayer(k, o.v)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                            val === o.v
                              ? o.v === 0
                                ? "bg-card text-muted-foreground shadow-sm"
                                : "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {OIcon && <OIcon className="h-3.5 w-3.5" />}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-2 p-5 sm:w-52">
          <p className="text-sm font-medium text-muted-foreground">{t("prayer.thisMonth")}</p>
          <ProgressRing value={donePct / 100} size={104} stroke={8}>
            <span className="font-display text-2xl font-semibold">{donePct}%</span>
          </ProgressRing>
          <p className="text-xs text-muted-foreground">{t("prayer.completion")}</p>
        </Card>
      </div>

      {/* Sunnah */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">{t("prayer.sunnah")}</h3>
            <p className="text-xs text-muted-foreground">{t("prayer.sunnah.hint")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setManage(true)}>
            {t("prayer.sunnah.manage")}
          </Button>
        </div>
        {sunnahList.length === 0 ? (
          <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("empty.sunnah.desc")}</p>
          </div>
        ) : (
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
        )}
      </Card>

      <ManageSunnahModal open={manage} onClose={() => setManage(false)} selected={sunnahList} />
    </div>
  );
}

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

/* ------------------------------- HIFDZ ------------------------------- */
export function HifdzPanel() {
  const { t } = useI18n();
  const settings = useSingleton<Row>("hifdzSettings");
  const logs = useTable<Row>("hifdzLogs", (r) =>
    [...r].sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)),
  );
  const reviews = useTable<Row>("murajaah", (r) =>
    [...r].sort((a, b) => (String(a.nextDue) < String(b.nextDue) ? -1 : 1)),
  );
  const day = todayHelper();
  const [logOpen, setLogOpen] = useState(false);
  const [murOpen, setMurOpen] = useState(false);

  const totalPages = logs
    .filter((l) => l.type === "new")
    .reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const todayPages = logs.filter((l) => l.date === day).reduce((s, l) => s + Number(l.pages ?? 0), 0);
  const daily = Number(settings?.dailyPages ?? 1);

  async function reviewNow(m: Row) {
    const interval = Number(m.intervalDays ?? 3);
    await upsert("murajaah", {
      id: String(m.id),
      lastReviewed: day,
      nextDue: addDays(day, interval),
      strength: Math.min(5, Number(m.strength ?? 1) + 1),
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("hifdz.todayProgress")}</p>
          <div className="mt-2 flex items-center gap-3">
            <ProgressRing value={daily ? todayPages / daily : 0} size={56}>
              <BookOpenText className="h-5 w-5 text-primary" />
            </ProgressRing>
            <p className="font-display text-2xl font-semibold">
              {todayPages}
              <span className="text-base text-muted-foreground">/{daily}</span>
            </p>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("hifdz.totalJuz")}</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {(totalPages / PAGES_PER_JUZ).toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            {totalPages} {t("hifdz.totalPages")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-sm text-muted-foreground">{t("hifdz.settings")}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs">{t("hifdz.dailyTarget")}</span>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={String(settings?.dailyPages ?? 1)}
                onChange={(e) => void setSingleton("hifdzSettings", { dailyPages: Number(e.target.value) })}
                className="h-8 w-20 text-right"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs">{t("hifdz.weeklyTarget")}</span>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={String(settings?.weeklyPages ?? 5)}
                onChange={(e) => void setSingleton("hifdzSettings", { weeklyPages: Number(e.target.value) })}
                className="h-8 w-20 text-right"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Murajaah */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
            <RotateCcw className="h-5 w-5" /> {t("hifdz.murajaah")}
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setMurOpen(true)}>
            <Plus className="h-4 w-4" /> {t("hifdz.murajaah.add")}
          </Button>
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("empty.murajaah.desc")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((m) => {
              const due = String(m.nextDue) <= day;
              return (
                <div
                  key={String(m.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3",
                    due ? "border-gold/50 bg-gold/10" : "border-border",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{String(m.label)}</p>
                    <p className="text-xs text-muted-foreground">
                      {due ? t("hifdz.murajaah.due") : `${t("hifdz.murajaah.next")}: ${String(m.nextDue)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant={due ? "gold" : "soft"} onClick={() => void reviewNow(m)}>
                      {t("hifdz.murajaah.reviewed")}
                    </Button>
                    <button
                      onClick={() => void remove("murajaah", String(m.id))}
                      className="text-muted-foreground/40 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent logs */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{t("hifdz.recent")}</h3>
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4" /> {t("hifdz.logNew")}
          </Button>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 12).map((l) => (
              <div key={String(l.id)} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {String(l.surah || "—")}
                    {l.ayahRange ? ` · ${String(l.ayahRange)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {String(l.date)} ·{" "}
                    {l.type === "murajaah" ? t("hifdz.type.murajaah") : t("hifdz.type.new")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {Number(l.pages)} {t("hifdz.pages")}
                  </span>
                  <button
                    onClick={() => void remove("hifdzLogs", String(l.id))}
                    className="text-muted-foreground/40 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <LogHifdzModal open={logOpen} onClose={() => setLogOpen(false)} />
      <AddMurajaahModal open={murOpen} onClose={() => setMurOpen(false)} />
    </div>
  );
}

function LogHifdzModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const day = todayHelper();
  const [type, setType] = useState<"new" | "murajaah">("new");
  const [pages, setPages] = useState("1");
  const [surah, setSurah] = useState("");
  const [ayah, setAyah] = useState("");
  const [note, setNote] = useState("");

  async function save() {
    await upsert("hifdzLogs", {
      id: uid(),
      date: day,
      type,
      pages: Number(pages),
      surah: surah || null,
      ayahRange: ayah || null,
      note: note || null,
    });
    setPages("1");
    setSurah("");
    setAyah("");
    setNote("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("hifdz.logNew")}>
      <div className="space-y-4">
        <Field label={t("hifdz.type")}>
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { value: "new", label: t("hifdz.type.new") },
              { value: "murajaah", label: t("hifdz.type.murajaah") },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("hifdz.pages")}>
            <Input type="number" step="0.5" min="0" value={pages} onChange={(e) => setPages(e.target.value)} />
          </Field>
          <Field label={t("hifdz.surah")}>
            <Input value={surah} onChange={(e) => setSurah(e.target.value)} placeholder="Al-Baqarah" />
          </Field>
        </div>
        <Field label={t("hifdz.ayahRange")}>
          <Input value={ayah} onChange={(e) => setAyah(e.target.value)} placeholder="1-10" />
        </Field>
        <Field label={t("hifdz.note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}

function AddMurajaahModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const day = todayHelper();
  const [label, setLabel] = useState("");
  const [interval, setInterval] = useState("3");

  async function save() {
    if (!label.trim()) return;
    await upsert("murajaah", {
      id: uid(),
      label: label.trim(),
      intervalDays: Number(interval),
      lastReviewed: day,
      nextDue: addDays(day, Number(interval)),
      strength: 1,
    });
    setLabel("");
    setInterval("3");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("hifdz.murajaah.add")}>
      <div className="space-y-4">
        <Field label={t("hifdz.murajaah.label")}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("hifdz.murajaah.labelPlaceholder")} />
        </Field>
        <Field label={t("hifdz.murajaah.interval")}>
          <Input type="number" min="1" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={save} disabled={!label.trim()}>
          {t("common.add")}
        </Button>
      </div>
    </Modal>
  );
}
