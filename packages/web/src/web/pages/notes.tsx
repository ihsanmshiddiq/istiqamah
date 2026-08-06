import { useEffect, useState } from "react";
import { Plus, Trash2, Pin, PinOff, NotebookPen, BookOpen } from "lucide-react";
import Journal from "@/pages/journal";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import {
  Button,
  Card,
  Input,
  Modal,
  Textarea,
  EmptyState,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const NOTE_COLORS: Record<string, string> = {
  paper: "bg-card",
  emerald: "bg-emerald-500/10",
  gold: "bg-amber-400/12",
  rose: "bg-rose-400/10",
  sky: "bg-sky-400/10",
};

type NotesTab = "notes" | "journal";

export default function Notes() {
  const { t } = useI18n();
  const [tab, setTab] = useState<NotesTab>("notes");

  return (
    <div>
      <PageHeader title={t("notes.title")} subtitle={t("notes.subtitle")} />

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        <button
          onClick={() => setTab("notes")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            tab === "notes"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <NotebookPen className="h-4 w-4" /> {t("notes.tab.notes")}
        </button>
        <button
          onClick={() => setTab("journal")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            tab === "journal"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen className="h-4 w-4" /> {t("notes.tab.journal")}
        </button>
      </div>

      {tab === "notes" && <NotesPanel />}
      {tab === "journal" && <Journal />}
    </div>
  );
}

/* ── Notes Panel (original notes list) ── */
function NotesPanel() {
  const { t } = useI18n();
  const notes = useTable<Row>("notes", (r) =>
    [...r].sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)),
  );
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  async function togglePin(n: Row) {
    await upsert("notes", { id: String(n.id), pinned: !n.pinned });
  }

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(n: Row) {
    setEditing(n);
    setOpen(true);
  }

  const NoteCard = ({ n }: { n: Row }) => (
    <Card className={cn("group flex flex-col p-4", NOTE_COLORS[String(n.color)] ?? NOTE_COLORS.paper)}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => openEdit(n)} className="min-w-0 flex-1 text-left">
          {n.title ? <p className="truncate font-medium">{String(n.title)}</p> : null}
          <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-sm text-foreground/80">{String(n.body)}</p>
        </button>
        <button onClick={() => void togglePin(n)} className="shrink-0 text-muted-foreground/50 hover:text-gold-foreground">
          {n.pinned ? <Pin className="h-4 w-4 fill-current text-gold-foreground" /> : <PinOff className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => void remove("notes", String(n.id))} className="text-muted-foreground/40 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {notes.length === 0 ? (
        <EmptyState icon={<NotebookPen className="h-8 w-8" />} title={t("notes.empty")} description={t("empty.notes.desc")} action={<Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> {t("notes.add")}</Button>} />
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> {t("notes.add")}
            </Button>
          </div>
          {pinned.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("notes.pinned")}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((n) => <NoteCard key={String(n.id)} n={n} />)}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((n) => <NoteCard key={String(n.id)} n={n} />)}
          </div>
        </>
      )}

      <NoteModal open={open} onClose={() => setOpen(false)} note={editing} />
    </div>
  );
}

function NoteModal({ open, onClose, note }: { open: boolean; onClose: () => void; note: Row | null }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState("paper");

  useEffect(() => {
    setTitle(note?.title ? String(note.title) : "");
    setBody(note?.body ? String(note.body) : "");
    setColor(note?.color ? String(note.color) : "paper");
  }, [note, open]);

  async function save() {
    if (!body.trim() && !title.trim()) {
      onClose();
      return;
    }
    await upsert("notes", {
      id: note ? String(note.id) : uid(),
      title: title || null,
      body,
      color,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={save} title={note ? t("common.edit") : t("notes.add")}>
      <div className="space-y-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("notes.titlePlaceholder")} className="font-medium" />
        <Textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("notes.bodyPlaceholder")} />
        <div className="flex items-center gap-2">
          {Object.entries(NOTE_COLORS).map(([k, c]) => (
            <button
              key={k}
              onClick={() => setColor(k)}
              className={cn("h-7 w-7 rounded-full border border-border", c, color === k && "ring-2 ring-offset-2 ring-offset-card ring-primary")}
            />
          ))}
        </div>
        <Button className="w-full" onClick={save}>{t("common.save")}</Button>
      </div>
    </Modal>
  );
}
