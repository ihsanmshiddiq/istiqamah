import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Plus, Minus, Trash2, Bookmark, Flame, Layers, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card, Button, Input, Select, Field, Modal, Textarea } from "@/components/ui/primitives";
import { QURAN_SURAHS } from "@/lib/content/islamic";
import { last7Days, shortDay, addDays, ymd } from "@/lib/domain";
import { cn } from "@/lib/utils";

const TOTAL_PAGES = 604;

export default function Quran() {
  const { t, lang } = useI18n();
  const day = todayHelper();
  const logs = useTable<Row>("quranLogs");
  const bookmarks = useTable<Row>("quranBookmarks", (r) =>
    [...r].sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0)),
  );
  const todayLog = logs.find((l) => l.date === day);

  const [bmOpen, setBmOpen] = useState(false);

  const totalPages = useMemo(() => logs.reduce((s, l) => s + Number(l.pagesRead ?? 0), 0), [logs]);
  const totalMin = useMemo(() => logs.reduce((s, l) => s + Number(l.minutesSpent ?? 0), 0), [logs]);
  const streak = useMemo(() => {
    const days = new Set(logs.filter((l) => Number(l.pagesRead ?? 0) > 0).map((l) => String(l.date)));
    let cur = 0, d = ymd(new Date());
    if (!days.has(d)) d = addDays(d, -1); // allow today not-yet-logged
    for (let i = 0; i < 400; i++) {
      if (days.has(d)) { cur++; d = addDays(d, -1); } else break;
    }
    return cur;
  }, [logs]);

  const week = useMemo(() => {
    const days = last7Days();
    const map = new Map(logs.map((l) => [String(l.date), Number(l.pagesRead ?? 0)]));
    return days.map((d) => ({ date: d, pages: map.get(d) ?? 0 }));
  }, [logs]);
  const maxWeek = Math.max(1, ...week.map((w) => w.pages));

  async function patchToday(patch: Partial<Row>) {
    await upsert("quranLogs", { id: todayLog ? String(todayLog.id) : uid(), date: day, ...patch });
  }
  function stepPages(delta: number) {
    const next = Math.max(0, Number(todayLog?.pagesRead ?? 0) + delta);
    void patchToday({ pagesRead: next });
  }

  const overallPct = Math.min(100, Math.round((totalPages / TOTAL_PAGES) * 100));

  return (
    <div>
      <PageHeader
        title={t("quran.title")}
        subtitle={t("quran.subtitle")}
        action={<Button size="sm" variant="outline" onClick={() => setBmOpen(true)}><Bookmark className="h-4 w-4" /> {t("quran.addBookmark")}</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Layers} label={t("quran.totalPages")} value={totalPages} accent="text-primary" />
        <Stat icon={Flame} label={t("quran.streak")} value={`${streak} ${t("quran.days")}`} accent="text-amber-500" />
        <Stat icon={BookOpen} label={t("quran.pagesToday")} value={Number(todayLog?.pagesRead ?? 0)} accent="text-emerald-500" />
        <Stat icon={Clock} label={t("quran.minutesTotal")} value={totalMin} accent="text-sky-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Today's log */}
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">{t("quran.logToday")}</h3>

          <div className="mb-5 flex items-center justify-between rounded-2xl bg-muted/50 p-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("quran.pagesRead")}</p>
              <p className="font-display text-3xl font-bold tabular-nums">{Number(todayLog?.pagesRead ?? 0)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => stepPages(-1)}><Minus className="h-4 w-4" /></Button>
              <Button size="icon" onClick={() => stepPages(1)}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("quran.ayahsRead")}>
              <Input type="number" min={0} value={Number(todayLog?.ayahsRead ?? 0)} onChange={(e) => void patchToday({ ayahsRead: Math.max(0, Number(e.target.value)) })} />
            </Field>
            <Field label={t("quran.minutes")}>
              <Input type="number" min={0} value={Number(todayLog?.minutesSpent ?? 0)} onChange={(e) => void patchToday({ minutesSpent: Math.max(0, Number(e.target.value)) })} />
            </Field>
            <Field label={t("quran.lastSurah")}>
              <Select value={String(todayLog?.lastSurah ?? "")} onChange={(e) => void patchToday({ lastSurah: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {QURAN_SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
              </Select>
            </Field>
            <Field label={t("quran.lastAyah")}>
              <Input type="number" min={0} value={Number(todayLog?.lastAyah ?? 0)} onChange={(e) => void patchToday({ lastAyah: Math.max(0, Number(e.target.value)) })} />
            </Field>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Overall progress */}
          <Card className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{t("quran.overall")}</h3>
              <span className="text-sm text-muted-foreground">{totalPages} / {TOTAL_PAGES}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${overallPct}%` }} transition={{ duration: 0.7 }} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{overallPct}% {t("quran.ofMushaf")}</p>
          </Card>

          {/* 7-day chart */}
          <Card className="p-6">
            <h3 className="mb-4 font-display text-lg font-semibold">{t("quran.last7days")}</h3>
            <div className="flex h-32 items-end justify-between gap-2">
              {week.map((w) => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <motion.div
                      className={cn("w-full rounded-t-md", w.pages > 0 ? "bg-primary" : "bg-muted")}
                      initial={{ height: 0 }}
                      animate={{ height: `${(w.pages / maxWeek) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ minHeight: 4 }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{shortDay(w.date, lang)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Bookmarks */}
      <div className="mt-6">
        <h3 className="mb-3 font-display text-lg font-semibold">{t("quran.bookmarks")}</h3>
        {bookmarks.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">{t("quran.noBookmarks")}</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarks.map((b) => {
              const s = QURAN_SURAHS.find((x) => x.number === Number(b.surah));
              return (
                <Card key={String(b.id)} className="group flex items-start justify-between gap-2 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{String(b.surah)}</span>
                    <div>
                      <p className="font-medium">{s?.name ?? `Surah ${b.surah}`} : {String(b.ayah)}</p>
                      {b.note ? <p className="mt-0.5 text-sm text-muted-foreground">{String(b.note)}</p> : null}
                    </div>
                  </div>
                  <button onClick={() => void remove("quranBookmarks", String(b.id))} className="text-muted-foreground/40 opacity-0 transition group-hover:opacity-100 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BookmarkModal open={bmOpen} onClose={() => setBmOpen(false)} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof BookOpen; label: string; value: number | string; accent: string }) {
  return (
    <Card className="p-4">
      <Icon className={cn("mb-2 h-5 w-5", accent)} />
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function BookmarkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => { if (open) { setSurah(1); setAyah(1); setNote(""); } }, [open]);

  async function save() {
    await upsert("quranBookmarks", { id: uid(), surah, ayah, note: note || null, createdAt: Date.now() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("quran.addBookmark")}>
      <div className="space-y-4">
        <Field label={t("quran.surah")}>
          <Select value={surah} onChange={(e) => setSurah(Number(e.target.value))}>
            {QURAN_SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
          </Select>
        </Field>
        <Field label={t("quran.ayah")}>
          <Input type="number" min={1} value={ayah} onChange={(e) => setAyah(Math.max(1, Number(e.target.value)))} />
        </Field>
        <Field label={t("quran.note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("quran.notePlaceholder")} />
        </Field>
        <Button className="w-full" onClick={save}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}
