import { useState, useCallback, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
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
  MoreHorizontal,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Home,
  Activity,
  FileText,
  ScrollText,
  PanelLeftClose,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";
import { Wordmark } from "./logo";
import { ThemeToggle, LangToggle, SyncBadge } from "./switches";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { usePersona } from "@/lib/persona";
import { FloatingLove } from "./floating-love";
import { Topbar } from "./topbar";

/* ─── nav types ─── */
interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  femaleOnly?: boolean;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ─── nav structure (restructured: Ruang utama, Ibadah, Ritme harian) ─── */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ruang utama",
    items: [
      { to: "/app", icon: Home, label: "Beranda" },
      { to: "/app/calendar", icon: CalendarDays, label: "Kalender" },
    ],
  },
  {
    label: "Ibadah",
    items: [
      { to: "/app/hifz", icon: Brain, label: "Hafalan" },
      { to: "/app/salah", icon: HandHeart, label: "Sholat" },
      { to: "/app/quran", icon: BookOpen, label: "Al-Qur'an" },
      { to: "/app/duas", icon: ScrollText, label: "Doa" },
    ],
  },
  {
    label: "Ritme harian",
    items: [
      { to: "/app/habits", icon: Activity, label: "Kebiasaan" },
      { to: "/app/notes", icon: FileText, label: "Catatan" },
      { to: "/app/goals", icon: Target, label: "Target" },
      { to: "/app/focus", icon: Timer, label: "Fokus" },
      { to: "/app/finance", icon: Wallet, label: "Keuangan" },
      { to: "/app/cycle", icon: HeartPulse, label: "Siklus", femaleOnly: true },
    ],
  },
];

// mobile bottom-bar primary tabs
const BOTTOM: NavItem[] = [
  { to: "/app", icon: Home, label: "Beranda" },
  { to: "/app/salah", icon: HandHeart, label: "Sholat" },
  { to: "/app/quran", icon: BookOpen, label: "Al-Qur'an" },
  { to: "/app/habits", icon: Activity, label: "Habit" },
];

function useVisibleGroups() {
  const profile = useSingleton<Row>("userProfile");
  const cycleOn = profile?.cycleEnabled && profile?.gender === "female";
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => !it.femaleOnly || cycleOn),
  })).filter((g) => g.items.length > 0);
}

function isActivePath(loc: string, to: string) {
  return to === "/app" ? loc === "/app" : loc.startsWith(to);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [loc] = useLocation();
  const groups = useVisibleGroups();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const persona = usePersona();
  const isTantri = persona === "tantri";
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <div className="min-h-dvh bg-background">
      <FloatingLove active={isTantri} />

      {/* ── Desktop sidebar (fixed, no collapse) ── */}
      <aside
        aria-hidden={!sidebarOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:flex",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Branding */}
        <div className="px-6 pt-6 pb-2">
          <Link to="/app">
            <Wordmark showByline />
          </Link>
        </div>
        <div className="mx-6">
          <hr className="border-border/40" />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 no-scrollbar">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                {g.label}
              </p>
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const Icon = n.icon;
                  const active = isActivePath(loc, n.to);
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/40" />
                      )}
                      <Icon className="h-[18px] w-[18px]" />
                      {n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings — standalone at bottom */}
        <div className="px-3 pb-1">
          <Link
            to="/app/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isActivePath(loc, "/app/settings")
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Settings className="h-[18px] w-[18px]" />
            Pengaturan
          </Link>
        </div>

        <ProfileSection />
      </aside>

      {/* ── Desktop Topbar ── */}
      <div className={cn("sticky top-0 z-20 hidden lg:block", sidebarOpen ? "lg:pl-72" : "lg:pl-0")}>
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
      </div>

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link to="/app">
          <Wordmark showByline />
        </Link>
        <div className="flex items-center gap-1">
          <CommandPalette />
          <SyncBadge />
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* ── Content ── */}
      <main className={cn("relative transition-all duration-300 ease-in-out", sidebarOpen ? "lg:pl-72" : "lg:pl-0")}>
        <div className={cn("paper-grain pointer-events-none fixed inset-0 opacity-[0.4] transition-all duration-300 ease-in-out", sidebarOpen ? "lg:left-72" : "lg:left-0")} />
        <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav — floating pill ── */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
        <div className="flex h-16 items-center justify-between rounded-2xl border border-border/60 bg-background/95 px-2 py-2 shadow-lg backdrop-blur-xl">
          {BOTTOM.map((n) => {
            const Icon = n.icon;
            const active = isActivePath(loc, n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            Lainnya
          </button>
        </div>
      </nav>

      {/* ── Footer ── */}
      <footer className="hidden border-t border-border/40 bg-background/50 py-6 text-center text-xs text-muted-foreground/50 lg:block">
        <p>
          Istiqamah &middot; By Ihsan &middot; {new Date().getFullYear()}
        </p>
      </footer>

      {/* ── Mobile "More" sheet ── */}
      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 pb-8 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Menu</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {g.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {g.items.map((n) => {
                        const Icon = n.icon;
                        const active = isActivePath(loc, n.to);
                        return (
                          <Link
                            key={n.to}
                            to={n.to}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition-colors",
                              active
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-background/50 text-foreground/80 hover:bg-muted/60",
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            {n.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Settings in more sheet */}
                <div>
                  <Link
                    to="/app/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/60"
                  >
                    <Settings className="h-5 w-5" />
                    Pengaturan
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Standard page header used across feature pages. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Profile section at bottom of sidebar — rich dropdown with shortcuts */
function ProfileSection() {
  const { t } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const name = profile?.displayName || session?.user?.name || "";
  const email = session?.user?.email || "";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function signOut() {
    await authClient.signOut();
    setLocation("/");
  }

  return (
    <div className="relative border-t border-sidebar-border px-3 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {initials || <User className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {name || "—"}
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/50">
            {email}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-sidebar-foreground/40 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          >
            {/* Header: name + email */}
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">{name || "—"}</p>
              <p className="text-[11px] text-muted-foreground">{email}</p>
            </div>

            {/* Shortcuts */}
            <Link
              to="/app/achievements"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              Pencapaian
            </Link>
            <Link
              to="/app/analytics"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              Analitik
            </Link>
            <Link
              to="/app/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Pengaturan
            </Link>

            {/* Separator + Sign out */}
            <div className="border-t border-border" />
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
