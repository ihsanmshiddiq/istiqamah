import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trash2, Check } from "lucide-react";
import * as Icons from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, today as todayHelper, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  Field,
  Textarea,
} from "@/components/ui/primitives";
import { MOODS, niceDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

function MoodIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

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
  const todayEntry = entries.find((e) => e.date === day);

  const [mood, setMood] = useState<string>("");
  const [gratitude, setGratitude] = useState("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMood(todayEntry?.mood ? String(todayEntry.mood) : "");
    setGratitude(todayEntry?.gratitude ? String(todayEntry.gratitude) : "");
    setBody(todayEntry?.body ? String(todayEntry.body) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayEntry?.id]);

  async function save() {
    await upsert("journalEntries", {
      id: todayEntry ? String(todayEntry.id) : uid(),
      date: day,
      mood: mood || null,
      gratitude: gratitude || null,
      body,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  const past = entries.filter((e) => e.date !== day);

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold">{t("journal.today")}</h3>
            <span className="text-sm text-muted-foreground">{niceDate(day, lang)}</span>
          </div>

          <div className="mb-5">
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

          <div className="space-y-4">
            <Field label={t("journal.gratitude")}>
              <Textarea rows={2} value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder={t("journal.gratitudePlaceholder")} />
            </Field>
            <Field label={t("journal.body")}>
              <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("journal.bodyPlaceholder")} />
            </Field>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save}>{t("common.save")}</Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-primary">
                <Check className="h-4 w-4" /> {t("journal.saved")}
              </span>
            )}
          </div>
        </Card>
      </motion.div>

      {past.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold">{t("journal.past")}</h3>
          <div className="space-y-3">
            {past.map((e) => {
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
                  {e.gratitude ? (
                    <p className="mt-2 text-sm italic text-muted-foreground">“{String(e.gratitude)}”</p>
                  ) : null}
                  {e.body ? <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/85">{String(e.body)}</p> : null}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
