import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  MoonStar,
  Clock,
  BookOpen,
  Star,
  Moon,
  Bell,
  Utensils,
  Target as TargetIcon,
  HandHeart,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, type Row } from "@/lib/store";
import { ymd, parseYmd } from "@/lib/domain";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  getHijriDate,
  ISLAMIC_EVENTS,
  getUpcomingIslamicEvents,
  getIslamicEventDescription,
} from "@/lib/content/islamic";
import { cn } from "@/lib/utils";

/* ── Constants ── */
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const TYPE_STYLES: Record<string, string> = {
  reminder: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20",
  fasting: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20",
  islamic: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
  goal: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20",
  salah: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20",
};

const TYPE_DOT: Record<string, string> = {
  reminder: "bg-sky-500",
  fasting: "bg-amber-500",
  islamic: "bg-emerald-500",
  goal: "bg-rose-500",
  salah: "bg-violet-500",
};

const TYPE_META: Record<string, { icon: typeof Bell; soft: string; text: string }> = {
  reminder: { icon: Bell, soft: "bg-sky-500/12", text: "text-sky-600 dark:text-sky-300" },
  fasting: { icon: Utensils, soft: "bg-amber-500/12", text: "text-amber-600 dark:text-amber-300" },
  islamic: { icon: Moon, soft: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-300" },
  goal: { icon: TargetIcon, soft: "bg-violet-500/12", text: "text-violet-600 dark:text-violet-300" },
  salah: { icon: HandHeart, soft: "bg-rose-500/12", text: "text-rose-600 dark:text-rose-300" },
};

/* ═══════════════════════════════════════════ */
/* MAIN CALENDAR COMPONENT                     */
/* ═══════════════════════════════════════════ */
export default function Calendar() {
  const { t, lang } = useI18n();
  const events = useTable<Row>("calendarEvents");
  const today = new Date();
  const todayStr = ymd(today);
  const locale = lang === "id" ? "id-ID" : "en-US";

  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [open, setOpen] = useState(false);

  /* ── Calendar grid ── */
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstDay = new Date(cursor.year, cursor.month, 1).getDay();

  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const hijriMonth = getHijriDate(new Date(cursor.year, cursor.month, 1));

  /* ── Events grouped by day number ── */
  const eventsByDay = useMemo(() => {
    const map = new Map<
      number,
      { id?: string; title: string; type: string; time?: string | null; note?: string | null }[]
    >();
    for (const e of events) {
      const d = new Date(String(e.date)).getDate();
      if (d < 1 || d > daysInMonth) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push({
        id: String(e.id),
        title: String(e.title),
        type: String(e.type) || "reminder",
        time: e.time as string | null | undefined,
        note: e.note as string | null | undefined,
      });
    }
    return map;
  }, [events, daysInMonth]);

  /* ── Islamic events for this month ── */
  const islamicByDay = useMemo(() => {
    const m = new Map<number, string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.year, cursor.month, d);
      const h = getHijriDate(date);
      const hit = ISLAMIC_EVENTS.find((ev) => ev.month === h.month && ev.day === h.day);
      if (hit) m.set(d, hit.name);
    }
    return m;
  }, [cursor, daysInMonth]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    const userEvents = eventsByDay.get(selectedDay) ?? [];
    const islamicName = islamicByDay.get(selectedDay);
    const result: {
      id?: string;
      title: string;
      type: string;
      time?: string | null;
      note?: string | null;
      isIslamic?: boolean;
    }[] = [...userEvents];
    if (islamicName) {
      result.unshift({ title: islamicName, type: "islamic", isIslamic: true });
    }
    return result;
  }, [selectedDay, eventsByDay, islamicByDay]);

  const selHijri = selectedDay
    ? getHijriDate(new Date(cursor.year, cursor.month, selectedDay))
    : null;

  const isToday = (d: number) =>
    d === today.getDate() &&
    cursor.month === today.getMonth() &&
    cursor.year === today.getFullYear();

  const selectedDateStr =
    selectedDay ? ymd(new Date(cursor.year, cursor.month, selectedDay)) : todayStr;

  /* ── Navigation ── */
  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  /* ── Upcoming Islamic events ── */
  const upcoming = useMemo(() => getUpcomingIslamicEvents(5), []);

  return (
    <div>
      <PageHeader
        title={t("cal.title")}
        subtitle={t("cal.subtitle")}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("cal.addEvent")}
          </Button>
        }
      />

      {/* ── Compact upcoming Islamic events strip ── */}
      <IslamicEventsStrip events={upcoming} />

      {/* ── Main grid: calendar + day detail ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Calendar grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-4 sm:p-5">
            {/* Month header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-semibold">{monthName}</h2>
                <p className="mt-0.5 text-xs text-gold-foreground">
                  {hijriMonth.monthName} {hijriMonth.year} H
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shift(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setCursor({ year: today.getFullYear(), month: today.getMonth() });
                    setSelectedDay(today.getDate());
                  }}
                  className="px-3 h-8 rounded-lg text-xs font-medium hover:bg-muted"
                >
                  {t("cal.today")}
                </button>
                <button
                  onClick={() => shift(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-medium text-muted-foreground uppercase py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`b-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const events = eventsByDay.get(day) ?? [];
                const islamic = islamicByDay.get(day);
                const selected = selectedDay === day;
                const today_ = isToday(day);

                return (
                  <motion.button
                    key={day}
                    whileHover={{ y: -1 }}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative aspect-square flex flex-col items-center justify-center rounded-xl border text-sm transition-all p-1 min-h-[56px]",
                      selected
                        ? "border-primary bg-primary/8"
                        : today_
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "font-medium",
                        today_ && !selected && "text-primary",
                      )}
                    >
                      {day}
                    </span>
                    <span
                      className={cn(
                        "text-[8px] leading-none mt-0.5",
                        selected ? "text-primary/60" : "text-muted-foreground/50",
                      )}
                    >
                      {getHijriDate(new Date(cursor.year, cursor.month, day)).day}
                    </span>
                    {/* Event dots */}
                    {events.length > 0 || islamic ? (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {islamic && (
                          <span className="h-1 w-1 rounded-full bg-gold" />
                        )}
                        {events.slice(0, 3).map((e, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "h-1 w-1 rounded-full",
                              selected
                                ? "bg-primary-foreground"
                                : TYPE_DOT[e.type] ?? "bg-foreground/40",
                            )}
                          />
                        ))}
                      </div>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border/60">
              {Object.entries(TYPE_DOT).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", v)} />
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {t(`cal.type.${k}`) || k}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gold" />
                <span className="text-[11px] text-muted-foreground">
                  {t("cal.hijri")}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Day detail panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <Card className="p-5 flex flex-col">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold">
                  {selectedDay
                    ? `${monthName} ${selectedDay}`
                    : t("cal.today")}
                </h3>
                {selectedDay && isToday(selectedDay) ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                    {t("cal.today")}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {selHijri
                  ? `${selHijri.day} ${selHijri.monthName} ${selHijri.year} H`
                  : "Klik tanggal apa saja"}
              </p>
            </div>

            {/* Islamic event highlight */}
            {selectedDay && islamicByDay.get(selectedDay) ? (
              <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MoonStar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                    Peristiwa Islami
                  </span>
                </div>
                <p className="text-sm font-medium">{islamicByDay.get(selectedDay)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getIslamicEventDescription(islamicByDay.get(selectedDay)!)}
                </p>
              </div>
            ) : null}

            {/* Events list */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Acara
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {selectedEvents.filter((e) => !e.isIslamic).length}
                </span>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {selectedEvents
                    .filter((e) => !e.isIslamic)
                    .map((e, i) => (
                      <motion.div
                        key={`${e.id ?? e.title}-${i}`}
                        layout
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className={cn(
                          "rounded-xl border p-3",
                          TYPE_STYLES[e.type] ?? "border-border",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{e.title}</p>
                            {e.time ? (
                              <p className="text-[11px] mt-0.5 flex items-center gap-1 opacity-80">
                                <Clock className="h-3 w-3" /> {String(e.time)}
                              </p>
                            ) : null}
                            {e.note ? (
                              <p className="text-[11px] mt-1 opacity-70">
                                {String(e.note)}
                              </p>
                            ) : null}
                            <span className="text-[10px] uppercase tracking-wide opacity-60 mt-1 inline-block">
                              {t(`cal.type.${e.type}`) || e.type}
                            </span>
                          </div>
                          <button
                            onClick={() => remove("calendarEvents", e.id!)}
                            className="text-muted-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>

                {selectedEvents.filter((e) => !e.isIslamic).length === 0 && !islamicByDay.get(selectedDay ?? 0) ? (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("cal.noEvents")}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── Add event modal ── */}
      <EventModal open={open} onClose={() => setOpen(false)} date={selectedDateStr} />
    </div>
  );
}

/* ── Compact Upcoming Islamic Events Strip ── */
function IslamicEventsStrip({
  events,
}: {
  events: ReturnType<typeof getUpcomingIslamicEvents>;
}) {
  const { t } = useI18n();
  if (events.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm mb-5"
    >
      <div className="relative p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MoonStar className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="font-display text-sm font-medium leading-tight">
                Hari Islami Mendatang
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Tanggal penting dalam kalender Hijriah
              </p>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
            {events.length} mendatang
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
          {events.map((ev, idx) => (
            <motion.div
              key={ev.name}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * idx, duration: 0.32 }}
              className="group shrink-0 w-[200px] rounded-xl border border-border/60 bg-background/70 p-3 transition-all hover:border-primary/40 hover:bg-background/90 hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                    ev.type === "fasting"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                  )}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {ev.type === "fasting" ? "Puasa" : "Hari"}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                  {ev.daysUntil === 0
                    ? "Hari ini"
                    : ev.daysUntil === 1
                      ? "1d"
                      : `${ev.daysUntil}d`}
                </span>
              </div>
              <p className="font-display text-[13px] font-semibold leading-tight mb-0.5">
                {ev.name}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                {getIslamicEventDescription(ev.name)}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[9px] text-muted-foreground/70">
                <span className="h-1 w-1 rounded-full bg-primary/60" />
                {ev.hijriDay} {ev.hijriMonth}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ── Event Modal ── */
function EventModal({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("reminder");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  async function save() {
    if (!title.trim()) return;
    await upsert("calendarEvents", {
      id: uid(),
      title: title.trim(),
      date,
      type,
      time: time || null,
      note: note || null,
      createdAt: Date.now(),
    });
    setTitle("");
    setTime("");
    setNote("");
    setType("reminder");
    onClose();
  }

  const dateLabel = (() => {
    try {
      const d = parseYmd(date);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return date;
    }
  })();

  return (
    <Modal open={open} onClose={onClose} title={`${t("cal.addEvent")} · ${dateLabel}`}>
      <div className="space-y-4">
        <Field label={t("cal.eventTitle")}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Halaqah Quran"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("cal.eventType")}>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="reminder">{t("cal.type.reminder")}</option>
              <option value="fasting">{t("cal.type.fasting")}</option>
              <option value="goal">{t("cal.type.goal")}</option>
              <option value="salah">{t("cal.type.salah")}</option>
            </Select>
          </Field>
          <Field label={t("cal.eventTime")}>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("cal.eventNote")}>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t("common.optional")}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={!title.trim()}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
