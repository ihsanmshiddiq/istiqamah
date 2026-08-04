import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, Heart, BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card, Input, EmptyState } from "@/components/ui/primitives";
import { DUA_CATEGORIES, DUAS } from "@/lib/content/duas";
import { cn } from "@/lib/utils";

export default function Duas() {
  const { t } = useI18n();
  const favRows = useTable<Row>("duaFavorites");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  const favSet = useMemo(
    () => new Set(favRows.map((r) => String((r as Row).duaId))),
    [favRows]
  );

  function toggleFav(duaId: string) {
    const existing = favRows.find((r) => String((r as Row).duaId) === duaId);
    if (existing) remove("duaFavorites", existing.id);
    else upsert("duaFavorites", { id: uid(), duaId });
  }

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DUAS.filter((d) => {
      if (cat === "fav" && !favSet.has(d.id)) return false;
      if (cat !== "all" && cat !== "fav" && d.category !== cat) return false;
      if (!query) return true;
      return (
        d.title.toLowerCase().includes(query) ||
        d.translation.toLowerCase().includes(query) ||
        d.translit.toLowerCase().includes(query)
      );
    });
  }, [cat, q, favSet]);

  const chips = [
    { id: "all", name: t("duas.all") },
    { id: "fav", name: t("duas.favorites") },
    ...DUA_CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <div>
      <PageHeader title={t("duas.title")} subtitle={t("duas.subtitle")} />

      <div className="mb-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("duas.search")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              cat === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {c.id === "fav" ? (
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" /> {c.name}
              </span>
            ) : (
              c.name
            )}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={cat === "fav" ? t("duas.noFav") : t("duas.empty")}
          description={cat === "fav" ? t("empty.duasFav.desc") : t("empty.duas.desc")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((d, i) => {
            const isFav = favSet.has(d.id);
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-semibold leading-snug">
                      {d.title}
                    </h3>
                    <button
                      onClick={() => toggleFav(d.id)}
                      aria-label="favorite"
                      className={cn(
                        "shrink-0 rounded-full p-1.5 transition",
                        isFav
                          ? "text-rose-500"
                          : "text-muted-foreground hover:text-rose-400"
                      )}
                    >
                      <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
                    </button>
                  </div>

                  <p
                    dir="rtl"
                    className="font-arabic text-2xl leading-loose text-foreground"
                  >
                    {d.arabic}
                  </p>

                  <p className="text-sm italic text-muted-foreground">{d.translit}</p>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {d.translation}
                  </p>

                  {d.note && (
                    <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      {d.note}
                    </p>
                  )}

                  <div className="mt-auto border-t border-border pt-3 text-xs text-muted-foreground">
                    {t("duas.reference")}: {d.reference}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
