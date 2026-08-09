import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Heart, BookOpen, X, Copy, Check,
  Sunrise, Sparkles, Moon, UtensilsCrossed, Plane, Shield, RefreshCw, GraduationCap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTable } from "@/hooks/use-store";
import { upsert, remove, uid, type Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card, Input, EmptyState } from "@/components/ui/primitives";
import { DUA_CATEGORIES, DUAS } from "@/lib/content/duas";
import { cn } from "@/lib/utils";

// ── Indonesian category names ──
const CORE_CATEGORIES = [
  { id: "morning", name: "Dzikir Pagi", icon: Sunrise },
  { id: "evening", name: "Dzikir Petang", icon: Moon },
  { id: "before-sleep", name: "Dzikir Sebelum Tidur", icon: Moon },
  { id: "after-prayer", name: "Setelah Shalat", icon: Sparkles },
  { id: "eating", name: "Makan & Minum", icon: UtensilsCrossed },
  { id: "travel", name: "Perjalanan", icon: Plane },
  { id: "distress", name: "Kesulitan & Kecemasan", icon: Heart },
  { id: "forgiveness", name: "Memohon Ampunan", icon: RefreshCw },
  { id: "gratitude", name: "Syukur", icon: Sparkles },
  { id: "protection", name: "Perlindungan", icon: Shield },
  { id: "knowledge", name: "Ilmu & Kebijaksanaan", icon: GraduationCap },
];

// ── Indonesian dua titles, translations, and notes ──
const ID_DUA_COPY: Record<string, [string, string, string, string?]> = {
  d1: ["Dzikir Pagi", "Kita telah memasuki pagi dan pada waktu ini seluruh kerajaan milik Allah. Segala puji bagi Allah.", "Muslim 4/2088"],
  d2: ["Dzikir Petang", "Kita telah memasuki petang dan pada waktu ini seluruh kerajaan milik Allah. Segala puji bagi Allah.", "Muslim 4/2088"],
  d3: ["Sayyidul Istighfar", "Ya Allah, Engkau adalah Tuhanku. Tidak ada sesembahan yang berhak disembah selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu. Dan aku berada di atas perjanjian-Mu semampuku.", "Bukhari 7/150", "Siapa yang membacanya dengan keyakinan di pagi atau petang hari lalu meninggal hari itu, ia akan masuk surga."],
  d4: ["Tiga Surat Perlindungan", "Dengan nama Allah, yang dengan nama-Nya tidak ada sesuatu pun di bumi dan langit yang dapat membahayakan. Dia Maha Mendengar lagi Maha Mengetahui.", "Abu Dawud 4/323, Tirmidhi 5/465", "Bacakan tiga kali di pagi dan petang hari — tidak ada yang akan membahayakanmu."],
  d5: ["Setelah Shalat", "Ya Allah, tolonglah aku untuk mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu.", "Abu Dawud 2/86, An-Nasa'i 3/53"],
  d6: ["Memohon Surga", "Ya Allah, aku memohon surga kepada-Mu dan berlindung kepada-Mu dari neraka.", "Ibn Majah 2/1440"],
  d7: ["Sebelum Tidur", "Dengan nama-Mu ya Allah, aku mati dan aku hidup.", "Bukhari 11/113"],
  d8: ["Ampunan Sebelum Tidur", "Ya Allah, aku memohon ampunan-Mu dan bertobat kepada-Mu.", "Bukhari 11/101"],
  d9: ["Dzikir Sebelum Tidur", "Mahasuci Allah dan segala puji bagi-Nya.", "Bukhari 7/168", "Membaca ini 100 kali sebelum tidur menghapus dosa seperti buih di laut."],
  d10: ["Sebelum Makan", "Dengan nama Allah.", "Abu Dawud 3/347", "Jika lupa, ucapkan: Bismillaahi awwalahu wa aakhirahu (Dengan nama Allah, di awal dan di akhir)."],
  d11: ["Setelah Makan", "Segala puji bagi Allah yang memberiku makanan ini dan rezeki dengannya tanpa daya dan kekuatanku.", "Tirmidhi 5/506"],
  d12: ["Doa Berbuka", "Telah hilang dahaga, urat-urat telah basah, dan pahala telah ditetapkan, insyaAllah.", "Abu Dawud 2/306"],
  d13: ["Doa Bepergian", "Mahasuci Dia yang menundukkan kendaraan ini untuk kami, padahal kami tidak mampu menguasainya, dan kepada Tuhan kami akan kembali.", "Quran 43:13-14"],
  d14: ["Memasuki Kota", "Ya Allah, berkahilah kami di dalamnya.", "Mustadrak of Al-Hakim"],
  d15: ["Doa Saat Kesulitan", "Tidak ada sesembahan selain Engkau. Mahasuci Engkau, sungguh aku termasuk orang-orang yang zalim.", "Quran 21:87", "Doa Nabi Yunus AS — diterima oleh Allah, tidak pernah ditolak."],
  d16: ["Kecemasan dan Kesedihan", "Ya Allah, aku berlindung kepada-Mu dari kegelisahan dan kesedihan, kelemahan dan kemalasan.", "Bukhari 7/158"],
  d17: ["Saat Masa Sulit", "Cukuplah Allah bagi kami dan Dia sebaik-baik pelindung.", "Quran 3:173"],
  d18: ["Ampunan Menyeluruh", "Ya Allah, ampunilah seluruh dosaku, yang kecil dan besar, yang awal dan akhir, yang tampak dan tersembunyi.", "Muslim 4/2075"],
  d19: ["Memohon Ampunan", "Aku memohon ampun kepada Allah Yang Mahaagung, tiada sesembahan selain Dia, Yang Mahahidup dan terus mengurus makhluk-Nya.", "Abu Dawud 2/85"],
  d20: ["Saat Mendapat Nikmat", "Segala puji bagi Allah, dengan karunia-Nya kebaikan menjadi sempurna.", "Ibn Majah 2/1228"],
  d21: ["Bentuk Syukur Terbaik", "Segala puji bagi Allah, pujian yang banyak, baik, dan penuh berkah.", "Bukhari 6/328"],
  d22: ["Memohon Perlindungan", "Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan makhluk-Nya.", "Muslim 4/2081", "Siapa yang mengucapkan ini di petang hari, tidak akan dibahayakan sesuatu pun di malam itu."],
  d23: ["Perlindungan dari Keburukan", "Ya Allah, aku berlindung kepada-Mu dari keburukan pendengaranku, penglihatanku, lisanku, dan hatiku.", "Tirmidhi 5/489"],
  d24: ["Doa Nabi Musa", "Tuhanku, lapangkanlah dadaku, mudahkanlah urusanku.", "Quran 20:25-26"],
  d25: ["Memohon Ilmu yang Bermanfaat", "Ya Allah, aku memohon ilmu yang bermanfaat, rezeki yang baik, dan amal yang diterima.", "Ibn Majah 1/264"],
};

function localizeDua(d: typeof DUAS[0]): typeof DUAS[0] {
  const copy = ID_DUA_COPY[d.id];
  return copy ? { ...d, title: copy[0], translation: copy[1], reference: copy[2], note: copy[3] ?? d.note } : d;
}

function categoryOf(d: typeof DUAS[0]): string {
  if (["distress", "forgiveness"].includes(d.category)) return "distress";
  if (["gratitude", "protection", "eating", "travel", "knowledge", "morning", "evening", "before-sleep", "after-prayer"].includes(d.category)) return d.category;
  return d.category;
}

export default function Duas() {
  const { t } = useI18n();
  const favRows = useTable<Row>("duaFavorites");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<typeof DUAS[0] | null>(null);
  const [copied, setCopied] = useState(false);

  const favSet = useMemo(
    () => new Set(favRows.map((r) => String((r as Row).duaId))),
    [favRows]
  );

  function toggleFav(duaId: string) {
    const existing = favRows.find((r) => String((r as Row).duaId) === duaId);
    if (existing) remove("duaFavorites", existing.id);
    else upsert("duaFavorites", { id: uid(), duaId });
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DUAS.map(localizeDua).filter((d) => {
      if (activeCategory === "all") {
        if (!favSet.has(d.id)) return true; // show all
      } else if (activeCategory === "fav") {
        if (!favSet.has(d.id)) return false;
      } else {
        if (categoryOf(d) !== activeCategory) return false;
      }
      if (!query) return true;
      return (
        d.title.toLowerCase().includes(query) ||
        d.arabic.includes(query) ||
        d.translation.toLowerCase().includes(query) ||
        d.translit.toLowerCase().includes(query)
      );
    });
  }, [activeCategory, q, favSet]);

  const copyDua = (d: typeof DUAS[0]) => {
    const text = `${d.arabic}\n\n${d.translit}\n\n${d.translation}\n\n— ${d.reference}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader title={t("duas.title")} subtitle={t("duas.subtitle")} icon={<BookOpen className="h-5 w-5" />} />

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("duas.search")}
          className="pl-9"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
            activeCategory === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-muted"
          )}
        >
          {t("duas.all")} ({DUAS.length})
        </button>
        {CORE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = DUAS.filter((d) => categoryOf(d) === cat.id).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                activeCategory === cat.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.name}
              <span className={cn("text-[10px]", activeCategory === cat.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dua cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((d, i) => {
            const cat = CORE_CATEGORIES.find((c) => c.id === categoryOf(d));
            const Icon = cat?.icon ?? BookOpen;
            return (
              <motion.button
                key={d.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => setSelected(d)}
                className="group text-left rounded-2xl border border-border/70 bg-card shadow-soft p-5 transition-all hover:shadow-premium hover:-translate-y-0.5 hover:border-border"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{cat?.name}</span>
                </div>
                <p className="text-arabic text-xl text-primary text-right leading-loose mb-3 line-clamp-2 break-words" dir="rtl" style={{ overflowWrap: 'anywhere' }}>
                  {d.arabic}
                </p>
                <p className="text-sm font-medium mb-1">{d.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 break-words">{d.translation}</p>
                <p className="text-[11px] text-muted-foreground mt-2 italic">— {d.reference}</p>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-display text-lg font-medium">{t("duas.empty")}</p>
          <p className="text-sm text-muted-foreground mt-1">Coba pencarian atau kategori lain.</p>
        </div>
      ) : null}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-premium max-h-[85vh] overflow-y-auto scroll-slim"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-display text-lg font-medium">{selected.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {CORE_CATEGORIES.find((c) => c.id === categoryOf(selected))?.name}
                  </p>
                </div>
              </div>
              {/* Arabic */}
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 mb-4">
                <p className="text-arabic text-2xl sm:text-3xl text-primary text-right leading-loose">
                  {selected.arabic}
                </p>
              </div>
              {/* Transliterasi */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Transliterasi</p>
                <p className="text-sm italic text-foreground/90 leading-relaxed">{selected.translit}</p>
              </div>
              {/* Terjemahan */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Terjemahan</p>
                <p className="text-sm leading-relaxed">{selected.translation}</p>
              </div>
              {/* Reference + Copy */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t border-border/60">
                <span className="text-xs text-muted-foreground italic">— {selected.reference}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyDua(selected)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
              </div>
              {/* Note */}
              {selected.note ? (
                <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    <span className="font-semibold">Keutamaan: </span>{selected.note}
                  </p>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
