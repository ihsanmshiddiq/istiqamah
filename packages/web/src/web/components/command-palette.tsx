import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Search,
  LayoutDashboard,
  CalendarDays,
  NotebookPen,
  ListChecks,
  BookOpen,
  BookMarked,
  Brain,
  HandHeart,
  Sparkles,
  StickyNote,
  Target,
  Timer,
  Trophy,
  BarChart3,
  Settings,
  Wallet,
  HeartPulse,
  ArrowRight,
  Command,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { QURAN_SURAHS } from "@/lib/content/islamic";
import type { DictKey } from "@/lib/translations";

/* ─── page items ─── */
interface PageItem {
  to: string;
  icon: LucideIcon;
  labelKey: DictKey;
}

const PAGES: PageItem[] = [
  { to: "/app", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/app/calendar", icon: CalendarDays, labelKey: "nav.calendar" },
  { to: "/app/journal", icon: NotebookPen, labelKey: "nav.journal" },
  { to: "/app/habits", icon: ListChecks, labelKey: "nav.habits" },
  { to: "/app/quran", icon: BookOpen, labelKey: "nav.quran" },
  { to: "/app/quran?tab=khatam", icon: BookMarked, labelKey: "nav.khatma" },
  { to: "/app/hifz", icon: Brain, labelKey: "nav.hifz" },
  { to: "/app/salah", icon: HandHeart, labelKey: "nav.salah" },
  { to: "/app/duas", icon: Sparkles, labelKey: "nav.duas" },
  { to: "/app/notes", icon: StickyNote, labelKey: "nav.notes" },
  { to: "/app/goals", icon: Target, labelKey: "nav.goals" },
  { to: "/app/focus", icon: Timer, labelKey: "nav.focus" },
  { to: "/app/achievements", icon: Trophy, labelKey: "nav.achievements" },
  { to: "/app/analytics", icon: BarChart3, labelKey: "nav.analytics" },
  { to: "/app/settings", icon: Settings, labelKey: "nav.settings" },
  { to: "/app/finance", icon: Wallet, labelKey: "nav.finance" },
  { to: "/app/cycle", icon: HeartPulse, labelKey: "nav.cycle" },
];

/* ─── command result type ─── */
type ResultItem =
  | { type: "page"; page: PageItem; label: string }
  | { type: "surah"; number: number; name: string; arabic: string; ayahs: number };

export function CommandPalette() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ─── keyboard shortcut (⌘K / Ctrl+K) + ESC to close ─── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* ─── reset on open ─── */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* ─── search results ─── */
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const out: ResultItem[] = [];

    // Pages
    for (const page of PAGES) {
      const label = t(page.labelKey);
      if (!q || label.toLowerCase().includes(q) || page.to.includes(q)) {
        out.push({ type: "page", page, label });
      }
    }

    // Surahs
    for (const s of QURAN_SURAHS) {
      if (
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.arabic.includes(q) ||
        String(s.number) === q
      ) {
        out.push({
          type: "surah",
          number: s.number,
          name: s.name,
          arabic: s.arabic,
          ayahs: s.ayahs,
        });
      }
    }

    return out.slice(0, 20);
  }, [query, t]);

  /* ─── navigation ─── */
  function selectItem(item: ResultItem) {
    setOpen(false);
    if (item.type === "page") {
      setLocation(item.page.to);
    } else {
      setLocation("/app/quran");
    }
  }

  /* ─── keyboard nav ─── */
  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      selectItem(results[selectedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  /* ─── scroll selected into view ─── */
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  /* ─── separate pages from surahs for grouped display ─── */
  const pageResults = results.filter((r) => r.type === "page");
  const surahResults = results.filter((r) => r.type === "surah");

  return (
    <>
      {/* ─── Trigger button (topbar search) ─── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t("cmd.title")}</span>
        <kbd className="ml-2 hidden items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* ─── Modal ─── */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIdx(0);
                  }}
                  onKeyDown={onInputKey}
                  placeholder={t("cmd.title")}
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                {/* ESC hint on desktop, X button on mobile */}
                <kbd className="hidden sm:flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  esc
                </kbd>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="sm:hidden flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2">
                {results.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("cmd.noResults")}
                  </p>
                )}

                {/* Pages section */}
                {pageResults.length > 0 && (
                  <div className="mb-1">
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {t("cmd.pages")}
                    </p>
                    {pageResults.map((item, i) => {
                      const globalIdx = results.indexOf(item);
                      const Icon = item.page.icon;
                      return (
                        <button
                          key={item.page.to}
                          type="button"
                          onClick={() => selectItem(item)}
                          onMouseEnter={() => setSelectedIdx(globalIdx)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                            globalIdx === selectedIdx
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-60" />
                          <span className="flex-1 font-medium">{item.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 opacity-30" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Surahs section */}
                {surahResults.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {t("nav.quran")}
                    </p>
                    {surahResults.map((item, i) => {
                      const globalIdx = results.indexOf(item);
                      return (
                        <button
                          key={item.number}
                          type="button"
                          onClick={() => selectItem(item)}
                          onMouseEnter={() => setSelectedIdx(globalIdx)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                            globalIdx === selectedIdx
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                            {item.number}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{item.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {item.arabic}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/50">
                            {item.ayahs} ayat
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
