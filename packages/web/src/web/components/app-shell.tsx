import { useState, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
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
  LogOut,
  User,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";
import { Wordmark } from "./logo";
import { ThemeToggle, LangToggle, SyncBadge } from "./switches";
import type { DictKey } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";

interface NavItem {
  to: string;
  icon: LucideIcon;
  key: DictKey;
  femaleOnly?: boolean;
}
interface NavGroup {
  label: DictKey;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "nav.group.overview",
    items: [
      { to: "/app", icon: LayoutDashboard, key: "nav.dashboard" },
      { to: "/app/calendar", icon: CalendarDays, key: "nav.calendar" },
      { to: "/app/journal", icon: NotebookPen, key: "nav.journal" },
      { to: "/app/habits", icon: ListChecks, key: "nav.habits" },
    ],
  },
  {
    label: "nav.group.worship",
    items: [
      { to: "/app/quran", icon: BookOpen, key: "nav.quran" },
      { to: "/app/khatma", icon: BookMarked, key: "nav.khatma" },
      { to: "/app/hifz", icon: Brain, key: "nav.hifz" },
      { to: "/app/salah", icon: HandHeart, key: "nav.salah" },
      { to: "/app/duas", icon: Sparkles, key: "nav.duas" },
    ],
  },
  {
    label: "nav.group.system",
    items: [
      { to: "/app/notes", icon: StickyNote, key: "nav.notes" },
      { to: "/app/goals", icon: Target, key: "nav.goals" },
      { to: "/app/focus", icon: Timer, key: "nav.focus" },
      { to: "/app/achievements", icon: Trophy, key: "nav.achievements" },
      { to: "/app/analytics", icon: BarChart3, key: "nav.analytics" },
      { to: "/app/settings", icon: Settings, key: "nav.settings" },
    ],
  },
  {
    label: "nav.group.more",
    items: [
      { to: "/app/finance", icon: Wallet, key: "nav.finance" },
      { to: "/app/cycle", icon: HeartPulse, key: "nav.cycle", femaleOnly: true },
    ],
  },
];

// mobile bottom-bar primary tabs
const BOTTOM: NavItem[] = [
  { to: "/app", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/app/quran", icon: BookOpen, key: "nav.quran" },
  { to: "/app/salah", icon: HandHeart, key: "nav.salah" },
  { to: "/app/habits", icon: ListChecks, key: "nav.habits" },
];

function useVisibleGroups() {
  const profile = useSingleton<Row>("userProfile");
  const cycleOn = profile?.cycleEnabled && profile?.gender === "female";
  return GROUPS.map((g) => ({
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

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="px-6 py-6">
          <Link to="/app">
            <Wordmark />
          </Link>
        </div>
        <div className="px-3 pb-3">
          <CommandPalette />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 no-scrollbar">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {t(g.label)}
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
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/12 text-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                        />
                      )}
                      <Icon className="h-[18px] w-[18px]" />
                      {t(n.key)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <ProfileSection />
      </aside>

      {/* Mobile top bar */}
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

      {/* Content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
          {BOTTOM.map((n) => {
            const Icon = n.icon;
            const active = isActivePath(loc, n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {t(n.key)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            {t("nav.more")}
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
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
                <h3 className="text-lg font-semibold">{t("nav.more")}</h3>
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
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {t(g.label)}
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
                            {t(n.key)}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
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

/** Profile section at bottom of sidebar */
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
            <Link
              to="/app/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              {t("dash.profile")}
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.signout")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
