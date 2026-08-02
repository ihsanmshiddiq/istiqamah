import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
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
import { Button, Card, Field, Input, Modal, Select, Textarea, EmptyState } from "@/components/ui/primitives";
import {
  getHijriDate,
  ISLAMIC_EVENTS,
  getUpcomingIslamicEvents,
  getIslamicEventDescription,
} from "@/lib/content/islamic";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: typeof Bell; dot: string; soft: string; text: string }> = {
  reminder: { icon: Bell, dot: "bg-sky-500", soft: "bg-sky-500/12", text: "text-sky-600 dark:text-sky-300" },
  fasting: { icon: Utensils, dot: "bg-amber-500", soft: "bg-amber-500/12", text: "text-amber-600 dark:text-amber-300" },
  islamic: { icon: Moon, dot: "bg-emerald-500", soft: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-300" },
  goal: { icon: TargetIcon, dot: "bg-violet-500", soft: "bg-violet-500/12", text: "text-violet-600 dark:text-violet-300" },
  salah: { icon: HandHeart, dot: "bg-rose-500", soft: "bg-rose-500/12", text: "text-rose-600 dark:text-rose-300" },
};

export default function Calendar() {
  const { t, lang } = useI18n();
  const events = useTable<Row>("calendarEvents");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(() => ymd(new Date()));
  const [open, setOpen] = useState(false);

  const todayStr = ymd(new Date());
  const locale = lang === "id" ? "id-ID" : "en-US";

  // Build grid days (leading blanks + month days)
  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const e of events) {
      const k = String(e.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return m;
  }, [events]);

  // Islamic events falling in the visible month (match via each day's hijri date)
  const islamicByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const cell of grid) {
      if (!cell) continue;
      const h = getHijriDate(cell);
      const hit = ISLAMIC_EVENTS.find((ev) => ev.month === h.month && ev.day === h.day);
      if (hit) m.set(ymd(cell), hit.name);
    }
    return m;
  }, [grid]);

  const selHijri = getHijriDate(parseYmd(selected));
  const selEvents = eventsByDate.get(selected) ?? [];
  const selIslamic = islamicByDate.get(selected);
  const upcoming = useMemo(() => getUpcomingIslamicEvents(5), []);

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 7); // a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "short" });
    });
  }, [locale]);

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const monthTitle = new Date(cursor.y, cursor.m, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

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

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Calendar grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">{monthTitle}</h2>
                <p className="mt-0.5 text-xs text-gold-foreground">
                  {getHijriDate(new Date(cursor.y, cursor.m, 15)).monthName}{" "}
                  {getHijriDate(new Date(cursor.y, cursor.m, 15)).year} H
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => shift(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    setCursor({ y: d.getFullYear(), m: d.getMonth() });
                    setSelected(ymd(d));
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  {t("cal.today")}
                </button>
                <button onClick={() => shift(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdays.map((w) => (
                <div key={w} className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  {w}
                </div>
              ))}
              {grid.map((cell, i) => {
                if (!cell) return <div key={i} />;
                const ds = ymd(cell);
                const isToday = ds === todayStr;
                const isSel = ds === selected;
                const dayEvents = eventsByDate.get(ds) ?? [];
                const isl = islamicByDate.get(ds);
                const h = getHijriDate(cell);
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(ds)}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                      isSel
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/70",
                    )}
                  >
                    <span className={cn("font-medium leading-none", isSel && "font-semibold")}>{cell.getDate()}</span>
                    <span className={cn("mt-0.5 text-[9px] leading-none", isSel ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                      {h.day}
                    </span>
                    <span className="absolute bottom-1 flex items-center gap-0.5">
                      {isl && <span className={cn("h-1 w-1 rounded-full", isSel ? "bg-primary-foreground" : "bg-gold")} />}
                      {dayEvents.slice(0, 3).map((e, k) => (
                        <span
                          key={k}
                          className={cn(
                            "h-1 w-1 rounded-full",
                            isSel ? "bg-primary-foreground" : TYPE_META[String(e.type)]?.dot ?? "bg-sky-500",
                          )}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected day detail */}
          <Card className="mt-4 p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <p className="font-display text-lg font-semibold">
                  {parseYmd(selected).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-gold-foreground">
                  {selHijri.day} {selHijri.monthName} {selHijri.year} H
                </p>
              </div>
              <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selIslamic && (
              <div className="mb-3 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-3">
                <Moon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <div>
                  <p className="text-sm font-medium">{selIslamic}</p>
                  <p className="text-xs text-muted-foreground">{getIslamicEventDescription(selIslamic)}</p>
                </div>
              </div>
            )}

            {selEvents.length === 0 && !selIslamic ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("cal.noEvents")}</p>
            ) : (
              <div className="space-y-2">
                {selEvents.map((e) => {
                  const meta = TYPE_META[String(e.type)] ?? TYPE_META.reminder;
                  const Icon = meta.icon;
                  return (
                    <div key={String(e.id)} className="group flex items-center gap-3 rounded-xl border border-border p-3">
                      <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", meta.soft, meta.text)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{String(e.title)}</p>
                        {(e.time || e.note) && (
                          <p className="truncate text-xs text-muted-foreground">
                            {e.time ? String(e.time) : ""}
                            {e.time && e.note ? " · " : ""}
                            {e.note ? String(e.note) : ""}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => remove("calendarEvents", String(e.id))}
                        className="text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Upcoming Islamic events */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Star className="h-4 w-4 text-gold" /> {t("cal.islamicEvents")}
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState title={t("common.empty")} />
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <div key={ev.name} className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <span className="text-sm font-bold leading-none">{ev.hijriDay}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{ev.name}</p>
                      <p className="text-xs text-muted-foreground">{getIslamicEventDescription(ev.name)}</p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs font-medium text-gold-foreground">
                      ~{ev.daysUntil}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <EventModal open={open} onClose={() => setOpen(false)} date={selected} />
    </div>
  );
}

function EventModal({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
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

  return (
    <Modal open={open} onClose={onClose} title={t("cal.addEvent")}>
      <div className="space-y-4">
        <Field label={t("cal.eventTitle")}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="…" autoFocus />
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
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label={t("cal.eventNote")}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
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
