import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Sparkles,
  BookOpen,
  Check,
  Calendar as CalIcon,
  Lightbulb,
  Shuffle,
} from "lucide-react";
import * as Icons from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  Field,
  Input,
  Textarea,
} from "@/components/ui/primitives";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { MOODS, niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

/* ── Helpers ── */
function MoodIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

/** Simple debounce hook */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ── Reflection prompts ── */
const DAILY_PROMPTS = {
  gratitude: [
    "Apa tiga hal terbaik yang terjadi hari ini?",
    "Siapa orang yang paling kamu syukuri hari ini?",
    "Nikmat kecil apa yang sering kamu lupakan untuk disyukuri?",
    "Hal sederhana mana yang membuat harimu lebih baik?",
  ],
  reflection: [
    "Bagaimana perasaanmu hari ini secara keseluruhan?",
    "Apa tantangan terbesarmu hari ini dan bagaimana kamu menghadapinya?",
    "Hal apa yang membuatmu tersenyum hari ini?",
    "Bagaimana kamu bisa lebih baik besok?",
  ],
  lessons: [
    "Apa pelajaran paling berharga dari hari ini?",
    "Kesalahan apa yang tidak akan kamu ulangi besok?",
    "Hal baru apa yang kamu pelajari hari ini?",
    "Bagaimana pengalaman hari ini mengubah perspektifmu?",
  ],
  dua: [
    "Apa yang paling ingin kamu panjatkan kepada Allah malam ini?",
    "Untuk siapa kamu mendoakan hari ini?",
    "Apa harapan terbesarmu untuk besok?",
    "Hal apa yang kamu serahkan kepada Allah hari ini?",
  ],
};

type PromptCategory = keyof typeof DAILY_PROMPTS;

const PROMPT_ICONS: Record<PromptCategory, React.ReactNode> = {
  gratitude: <Heart className="h-3.5 w-3.5 text-rose-500" />,
  reflection: <Sparkles className="h-3.5 w-3.5 text-amber-500" />,
  lessons: <BookOpen className="h-3.5 w-3.5 text-emerald-500" />,
  dua: <Sparkles className="h-3.5 w-3.5 text-sky-500" />,
};

const PROMPT_LABELS: Record<PromptCategory, string> = {
  gratitude: "Rasa Syukur",
  reflection: "Renungan",
  lessons: "Pelajaran",
  dua: "Doa",
};

/* ── Mood to numeric mapping for chart ── */
const MOOD_NUMERIC: Record<string, number> = {
  grateful: 5,
  happy: 4,
  calm: 3,
  tired: 2,
  anxious: 2,
  sad: 1,
};

function getMoodNumeric(mood: string | null): number {
  if (!mood) return 0;
  return MOOD_NUMERIC[mood] ?? 0;
}

/* ═══════════════════════════════════════════ */
/* MAIN JOURNAL COMPONENT                      */
/* ═══════════════════════════════════════════ */
export default function Journal() {
  const { t, lang } = useI18n();
  return (
    <div>
      <PageHeader title={t("journal.title")} subtitle={t("journal.subtitle")} />
      <JournalPanel />
    </div>
  );
}

/* ── Journal Panel ── */
function JournalPanel() {
  const { t, lang } = useI18n();
  const entries = useTable<Row>("journalEntries", (r) =>
    [...r].sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)),
  );

  const [selectedDate, setSelectedDate] = useState(todayHelper());

  const selectedEntry = entries.find((e) => e.date === selectedDate);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      const d = String(e.date);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([date, value]) => ({ date, value }));
  }, [entries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Left column: Editor + Prompts */}
      <div className="space-y-6">
        {/* Reflection prompts */}
        <ReflectionPrompts selectedDate={selectedDate} />

        {/* Editor */}
        <WriteTab
          entries={entries}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedEntry={selectedEntry}
        />
      </div>

      {/* Right column: History + Mood trend */}
      <div className="space-y-6">
        {/* Mood trend mini-chart */}
        <MoodTrendChart entries={entries} />

        {/* Consistency heatmap */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("journal.consistency")}
            </h3>
            <span className="text-xs text-muted-foreground">
              {entries.length} {t("journal.totalEntries")}
            </span>
          </div>
          <ConsistencyHeatmap data={heatmapData} color="primary" weeks={12} />
        </Card>

        {/* Recent entries list */}
        <RecentEntries
          entries={entries}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </div>
    </div>
  );
}

/* ── Reflection Prompts ── */
function ReflectionPrompts({ selectedDate }: { selectedDate: string }) {
  const [shuffleIdx, setShuffleIdx] = useState(0);

  const promptPool = useMemo(() => {
    const sel = new Date(selectedDate);
    const dayIdx = Math.floor(
      (sel.getTime() - new Date(sel.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const allPrompts: { category: PromptCategory; text: string; order: number }[] = [];
    for (const [cat, prompts] of Object.entries(DAILY_PROMPTS)) {
      for (const text of prompts) {
        allPrompts.push({
          category: cat as PromptCategory,
          text,
          order: (allPrompts.length + dayIdx) % (Object.keys(DAILY_PROMPTS).length * 4),
        });
      }
    }
    return allPrompts.sort((a, b) => a.order - b.order);
  }, [selectedDate]);

  const extraPrompt = promptPool[shuffleIdx % promptPool.length];

  // Daily prompt per category (one from each)
  const dailyPerCategory = useMemo(() => {
    const sel = new Date(selectedDate);
    const dayIdx = Math.floor(
      (sel.getTime() - new Date(sel.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const result: Record<PromptCategory, string> = {} as any;
    for (const [cat, prompts] of Object.entries(DAILY_PROMPTS)) {
      result[cat as PromptCategory] = prompts[dayIdx % prompts.length];
    }
    return result;
  }, [selectedDate]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-medium">Pertanyaan Renungan</h3>
            <p className="text-[11px] text-muted-foreground">
              Ketuk untuk menambahkan ke jurnal
            </p>
          </div>
        </div>
        <button
          onClick={() => setShuffleIdx((i) => i + 1)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted transition-colors"
          title="Acak pertanyaan"
        >
          <Shuffle className="h-3 w-3" /> Acak
        </button>
      </div>
      <div className="p-3 space-y-2">
        {(["gratitude", "reflection", "lessons", "dua"] as const).map((cat) => (
          <button
            key={cat}
            className="group w-full text-left rounded-xl border border-border/60 bg-background/40 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">{PROMPT_ICONS[cat]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  {PROMPT_LABELS[cat]}
                </p>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {dailyPerCategory[cat]}
                </p>
              </div>
              <span className="opacity-0 group-hover:opacity-100 text-primary text-xs transition-opacity">
                +
              </span>
            </div>
          </button>
        ))}
        {/* Extra shuffled prompt */}
        <motion.button
          key={extraPrompt.text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="group w-full text-left rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 hover:bg-primary/10 transition-all"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">{PROMPT_ICONS[extraPrompt.category]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                Bonus · {PROMPT_LABELS[extraPrompt.category]}
              </p>
              <p className="text-xs text-foreground/90 leading-relaxed">
                {extraPrompt.text}
              </p>
            </div>
          </div>
        </motion.button>
      </div>
    </Card>
  );
}

/* ── Write Tab (Editor) ── */
function WriteTab({
  entries,
  selectedDate,
  setSelectedDate,
  selectedEntry,
}: {
  entries: Row[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedEntry: Row | undefined;
}) {
  const { t, lang } = useI18n();

  const [mood, setMood] = useState<string>("");
  const [gratitude, setGratitude] = useState("");
  const [reflection, setReflection] = useState("");
  const [achievement, setAchievement] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMood(selectedEntry?.mood ? String(selectedEntry.mood) : "");
    setGratitude(selectedEntry?.gratitude ? String(selectedEntry.gratitude) : "");
    setReflection(selectedEntry?.body ? String(selectedEntry.body) : "");
    setAchievement(selectedEntry?.pencapaian ? String(selectedEntry.pencapaian) : "");
  }, [selectedEntry?.id, selectedDate]);

  const doSave = useCallback(
    (patch: Record<string, unknown>) => {
      upsert("journalEntries", {
        id: selectedEntry ? String(selectedEntry.id) : uid(),
        date: selectedDate,
        ...patch,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [selectedEntry, selectedDate],
  );

  // Auto-save with debounce
  const debouncedGratitude = useDebounce(gratitude, 800);
  const debouncedReflection = useDebounce(reflection, 800);
  const debouncedAchievement = useDebounce(achievement, 800);

  useEffect(() => {
    if ((selectedEntry?.gratitude ?? "") !== debouncedGratitude) {
      doSave({ gratitude: debouncedGratitude });
    }
  }, [debouncedGratitude]);
  useEffect(() => {
    if ((selectedEntry?.body ?? "") !== debouncedReflection) {
      doSave({ body: debouncedReflection });
    }
  }, [debouncedReflection]);
  useEffect(() => {
    if ((selectedEntry?.pencapaian ?? "") !== debouncedAchievement) {
      doSave({ pencapaian: debouncedAchievement });
    }
  }, [debouncedAchievement]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5 sm:p-6">
        {/* Header with date picker */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-medium bg-transparent border-0 outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 text-[11px] transition-opacity",
                saved ? "opacity-100 text-emerald-500" : "opacity-0",
              )}
            >
              <Check className="h-3 w-3" /> Tersimpan
            </span>
          </div>
        </div>

        {/* Mood selector */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs text-muted-foreground mr-1">{t("journal.mood")}:</span>
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                const newMood = mood === m.key ? "" : m.key;
                setMood(newMood);
                doSave({ mood: newMood || null });
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all",
                mood === m.key
                  ? "bg-primary/15 ring-2 ring-primary/30 scale-110"
                  : "hover:bg-muted",
              )}
              title={lang === "id" ? m.id : m.en}
            >
              <MoodIcon name={m.icon} className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Journal fields */}
        <div className="space-y-4">
          <JournalField
            icon={<Heart className="h-3.5 w-3.5 text-rose-500" />}
            label={t("journal.gratitude")}
            value={gratitude}
            onChange={setGratitude}
            placeholder={t("journal.gratitudePlaceholder")}
          />
          <JournalField
            icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
            label={t("journal.body")}
            value={reflection}
            onChange={setReflection}
            placeholder={t("journal.bodyPlaceholder")}
            multiline
          />
          <JournalField
            icon={<BookOpen className="h-3.5 w-3.5 text-emerald-500" />}
            label={t("journal.achievement")}
            value={achievement}
            onChange={setAchievement}
            placeholder={t("journal.achievementPlaceholder")}
            multiline
          />
        </div>

        {/* Save button */}
        <div className="mt-5 flex items-center gap-3">
          <Button
            onClick={() =>
              doSave({
                mood: mood || null,
                gratitude,
                body: reflection,
                pencapaian: achievement,
              })
            }
          >
            {t("common.save")}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

/* ── Journal Field Component ── */
function JournalField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        {icon} {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:bg-background focus:border-primary/40 outline-none transition-colors leading-relaxed"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:bg-background focus:border-primary/40 outline-none transition-colors"
        />
      )}
    </div>
  );
}

/* ── Mood Trend Mini-Chart ── */
function MoodTrendChart({ entries }: { entries: Row[] }) {
  const recent = entries.slice(0, 14).filter((e) => e.mood);
  if (recent.length === 0) return null;

  const avg =
    recent.reduce((a, e) => a + getMoodNumeric(String(e.mood)), 0) / recent.length;
  const avgMood = MOODS.find(
    (m) => MOOD_NUMERIC[m.key] === Math.round(avg),
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-sm font-medium">Tren suasana hati</h3>
          <p className="text-[11px] text-muted-foreground">14 entri terakhir</p>
        </div>
        {avgMood ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Avg</span>
            <MoodIcon name={avgMood.icon} className="h-4 w-4" />
            <span className="font-medium tabular-nums">{avg.toFixed(1)}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-1 h-16">
        {entries.slice(0, 14).reverse().map((e, i) => {
          const m = getMoodNumeric(String(e.mood));
          const pct = m ? (m / 5) * 100 : 0;
          const isToday = e.date === todayHelper();
          const moodObj = MOODS.find((x) => x.key === e.mood);

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full h-full flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: m ? `${pct}%` : "8%" }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                  className={cn(
                    "w-full rounded-sm transition-colors",
                    m === 0
                      ? "bg-muted"
                      : m <= 2
                        ? "bg-rose-400/70"
                        : m === 3
                          ? "bg-amber-400/70"
                          : "bg-emerald-500/80",
                    isToday && "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
                  )}
                  title={`${niceDate(String(e.date), "id")}: ${moodObj?.id ?? "Tanpa mood"}`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground/70">
                {new Date(e.date + "T00:00:00").toLocaleDateString("id-ID", {
                  day: "numeric",
                })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-rose-400/70" /> Low
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-400/70" /> Okay
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500/80" /> Good
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {recent.length}/{entries.length} dinilai
        </span>
      </div>
    </Card>
  );
}

/* ── Recent Entries Sidebar ── */
function RecentEntries({
  entries,
  selectedDate,
  onSelect,
}: {
  entries: Row[];
  selectedDate: string;
  onSelect: (d: string) => void;
}) {
  const { t, lang } = useI18n();
  const day = todayHelper();

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border/60">
        <h3 className="font-display text-base font-medium">Entri terbaru</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entries.length} dalam 30 hari terakhir
        </p>
      </div>
      <div className="max-h-[460px] overflow-y-auto p-2" style={{ scrollbarWidth: "thin" }}>
        <AnimatePresence>
          {entries.map((e) => {
            const d = String(e.date);
            const selected = selectedDate === d;
            const moodObj = MOODS.find((m) => m.key === e.mood);

            return (
              <motion.button
                key={String(e.id)}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => onSelect(d)}
                className={cn(
                  "w-full text-left rounded-xl p-3 transition-colors",
                  selected ? "bg-primary/8" : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">
                    {niceDate(d, lang)}
                  </span>
                  {moodObj ? (
                    <MoodIcon name={moodObj.icon} className="h-4 w-4" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {String(e.body || e.gratitude || "Entri kosong")}
                </p>
              </motion.button>
            );
          })}
        </AnimatePresence>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {t("journal.empty")}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
