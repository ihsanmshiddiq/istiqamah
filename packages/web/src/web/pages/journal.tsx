import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Trash2, Check, Search, Filter, X } from "lucide-react";
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
  SegmentedControl,
} from "@/components/ui/primitives";
import { ConsistencyHeatmap } from "@/components/shared/consistency-heatmap";
import { MOODS, niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

function MoodIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

type Tab = "write" | "history";

export default function Journal() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("journal.title")} subtitle={t("journal.subtitle")} />
      <JournalPanel />
    </div>
  );
}

/* ------------------------------ JOURNAL ------------------------------ */
function JournalPanel() {
  const { t, lang } = useI18n();
  const day = todayHelper();
  const entries = useTable<Row>("journalEntries", (r) =>
    [...r].sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)),
  );

  // Tab: write vs history
  const [tab, setTab] = useState<Tab>("write");

  // Heatmap data: count entries per day
  const heatmapData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      const d = String(e.date);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([date, value]) => ({ date, value }));
  }, [entries]);

  return (
    <div className="space-y-5">
      {/* Heatmap */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">{t("journal.consistency")}</h3>
            <span className="text-xs text-muted-foreground">
              {entries.length} {t("journal.totalEntries")}
            </span>
          </div>
          <ConsistencyHeatmap
            data={heatmapData}
            color="primary"
            weeks={12}
          />
        </Card>
      </motion.div>

      {/* Tabs */}
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "write", label: t("journal.tab.write") },
          { value: "history", label: t("journal.tab.history") },
        ]}
      />

      {tab === "write" && <WriteTab entries={entries} />}
      {tab === "history" && <HistoryTab entries={entries} />}
    </div>
  );
}

/* ============================== WRITE TAB ============================== */
function WriteTab({ entries }: { entries: Row[] }) {
  const { t, lang } = useI18n();
  const day = todayHelper();
  const todayEntry = entries.find((e) => e.date === day);

  const [mood, setMood] = useState<string>("");
  const [gratitude, setGratitude] = useState("");
  const [reflection, setReflection] = useState("");
  const [achievement, setAchievement] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMood(todayEntry?.mood ? String(todayEntry.mood) : "");
    setGratitude(todayEntry?.gratitude ? String(todayEntry.gratitude) : "");
    setReflection(todayEntry?.body ? String(todayEntry.body) : "");
    setAchievement(todayEntry?.pencapaian ? String(todayEntry.pencapaian) : "");
  }, [todayEntry?.id]);

  async function save() {
    await upsert("journalEntries", {
      id: todayEntry ? String(todayEntry.id) : uid(),
      date: day,
      mood: mood || null,
      gratitude: gratitude || null,
      body: reflection || null,
      pencapaian: achievement || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{t("journal.today")}</h3>
          <span className="text-sm text-muted-foreground">{niceDate(day, lang)}</span>
        </div>

        {/* Mood selector */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-foreground/80">{t("journal.mood")}</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMood(mood === m.key ? "" : m.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                  mood === m.key ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <MoodIcon name={m.icon} className="h-4 w-4" />
                {lang === "id" ? m.id : m.en}
              </button>
            ))}
          </div>
        </div>

        {/* Structured sections */}
        <div className="space-y-5">
          {/* Syukur */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-600">1</span>
              <label className="text-sm font-medium text-foreground/80">{t("journal.gratitude")}</label>
            </div>
            <Textarea
              rows={2}
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder={t("journal.gratitudePlaceholder")}
            />
          </div>

          {/* Refleksi */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
              <label className="text-sm font-medium text-foreground/80">{t("journal.body")}</label>
            </div>
            <Textarea
              rows={4}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={t("journal.bodyPlaceholder")}
            />
          </div>

          {/* Pencapaian */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">3</span>
              <label className="text-sm font-medium text-foreground/80">{t("journal.achievement")}</label>
            </div>
            <Textarea
              rows={2}
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              placeholder={t("journal.achievementPlaceholder")}
            />
          </div>
        </div>

        {/* Save */}
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={save}>{t("common.save")}</Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-primary">
              <Check className="h-4 w-4" /> {t("journal.saved")}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/* ============================== HISTORY TAB ============================== */
function HistoryTab({ entries }: { entries: Row[] }) {
  const { t, lang } = useI18n();
  const day = todayHelper();

  const [search, setSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("");

  const past = entries.filter((e) => e.date !== day);

  // Filter by search + mood
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return past.filter((e) => {
      // Mood filter
      if (moodFilter && e.mood !== moodFilter) return false;
      // Search filter
      if (q) {
        const text = [
          e.gratitude,
          e.body,
          e.pencapaian,
          e.mood,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [past, search, moodFilter]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("journal.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMoodFilter("")}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              moodFilter === "" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {t("common.all")}
          </button>
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMoodFilter(moodFilter === m.key ? "" : m.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                moodFilter === m.key ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              <MoodIcon name={m.icon} className="h-3.5 w-3.5" />
              {lang === "id" ? m.id : m.en}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {search || moodFilter ? t("journal.noResults") : t("journal.empty")}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const m = MOODS.find((x) => x.key === e.mood);
            return (
              <Card key={String(e.id)} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {m && <MoodIcon name={m.icon} className="h-4 w-4 text-primary" />}
                    <span className="text-sm font-medium">{niceDate(String(e.date), lang)}</span>
                  </div>
                  <button onClick={() => void remove("journalEntries", String(e.id))} className="text-muted-foreground/40 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Structured content */}
                <div className="mt-3 space-y-2">
                  {e.gratitude ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">{t("journal.gratitude")}</p>
                      <p className="mt-0.5 text-sm italic text-muted-foreground">"{String(e.gratitude)}"</p>
                    </div>
                  ) : null}
                  {e.body ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t("journal.body")}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/85">{String(e.body)}</p>
                    </div>
                  ) : null}
                  {e.pencapaian ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">{t("journal.achievement")}</p>
                      <p className="mt-0.5 text-sm text-foreground/85">{String(e.pencapaian)}</p>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
