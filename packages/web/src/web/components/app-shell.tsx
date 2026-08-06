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

/* ─── nav structure ─── */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ruang utama",
    items: [
      { to: "/app", icon: Home, label: "Beranda" },
      { to: "/app/calendar", icon: CalendarDays, label: "Kalender" },
    ],
  },
  {
    label: "Ritme harian",
    items: [
      { to: "/app/habits", icon: Activity, label: "Kebiasaan" },
      { to: "/app/hifz", icon: Brain, label: "Hafalan" },
      { to: "/app/salah", icon: HandHeart, label: "Sholat" },
      { to: "/app/notes", icon: FileText, label: "Catatan" },
      { to: "/app/journal", icon: NotebookPen, label: "Jurnal" },
      { to: "/app/quran", icon: BookOpen, label: "Al-Qur'an" },
      { to: "/app/duas", icon: ScrollText, label: "Doa" },
      { to: "/app/goals", icon: Target, label: "Target" },
      { to: "/app/focus", icon: Timer, label: "Fokus" },
    ],
  },
  {
    label: "Kehidupan",
    items: [
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const persona = usePersona();
  const isTantri = persona === "tantri";
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);

  return (
    <div className="min-h-dvh bg-background">
      <FloatingLove active={isTantri} />

      {/* ── Desktop sidebar (hayat-os style) ── */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 280 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30",
          "border-r border-border/60 bg-sidebar/80 backdrop-blur-xl",
        )}
      >
        {/* Brand */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border/70">
          <Link to="/app" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-arabic, serif)" }}>ح</span>
          </Link>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                className="min-w-0"
              >
                <p className="text-[15px] font-semibold leading-tight tracking-tight">Istiqamah</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Sistem Operasi Islami</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto scroll-slim px-3 py-4">
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.label}>
                {!sidebarCollapsed && (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                )}
                {sidebarCollapsed && (
                  <div className="mx-3 mb-2 mt-1 border-t border-border/50" />
                )}
                <ul className="space-y-0.5">
                  {group.items.map((n) => {
                    const Icon = n.icon;
                    const active = isActivePath(loc, n.to);
                    const inner = (
                      <Link
                        key={n.to}
                        to={n.to}
                        title={sidebarCollapsed ? n.label : undefined}
                        className={cn(
                          "group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                          "hover:bg-sidebar-accent",
                          active && "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary"
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          />
                        )}
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        {!sidebarCollapsed && (
                          <span className="truncate font-medium flex-1 text-left">{n.label}</span>
                        )}
                      </Link>
                    );
                    return <li key={n.to}>{inner}</li>;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer: collapse + profile */}
        <div className="border-t border-border/70 p-3 space-y-1">
          {/* Toggle sidebar */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Buka sidebar" : "Rapatkan sidebar"}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
            {!sidebarCollapsed && <span className="font-medium">Rapatkan</span>}
          </button>

          {/* Profile */}
          <ProfileSection collapsed={sidebarCollapsed} />
        </div>
      </motion.aside>

      {/* ── Desktop Topbar ── */}
      <div className={cn("hidden lg:block transition-all duration-300 ease-in-out")}>
        <Topbar sidebarCollapsed={sidebarCollapsed} />
      </div>

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link to="/app">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <CommandPalette />
          <SyncBadge />
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* ── Content ── */}
      <main className={cn("relative lg:transition-all lg:duration-300 lg:ease-in-out")}>
        <div className="paper-grain pointer-events-none fixed inset-0 opacity-[0.4]" />
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

/** Profile section at bottom of sidebar — hayat-os style */
function ProfileSection({ collapsed }: { collapsed: boolean }) {
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
    <div className="relative pt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={collapsed ? name || undefined : undefined}
        className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-primary/10 text-xs font-semibold text-primary">
          {initials || <User className="h-4 w-4" />}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{name || "—"}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/50">{email}</p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-sidebar-foreground/40 transition-transform",
                open && "rotate-180",
              )}
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && !collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Link
              to="/app/settings"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors mt-1"
            >
              <Settings className="h-4 w-4" /> Pengaturan
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
