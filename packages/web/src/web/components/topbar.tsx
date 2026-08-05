import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Bell,
  Clock,
  Sparkles,
  Keyboard,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/hooks/use-now";
import { useSingleton } from "@/hooks/use-store";
import { authClient } from "@/lib/auth";
import { usePersona } from "@/lib/persona";
import {
  computePrayerTimes,
  getNextPrayer,
  formatCountdown,
  formatTimeInZone,
  getGregorianDate,
  getHijriDate,
  getLocationTimezoneHours,
  CALC_METHODS,
} from "@/lib/content/islamic";
import type { Row } from "@/lib/store";
import { ThemeToggle, LangToggle, SyncBadge } from "./switches";
import { CommandPalette } from "./command-palette";
import { cn } from "@/lib/utils";

type CalcMethodKey = keyof typeof CALC_METHODS;

export function Topbar({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  const { t } = useI18n();
  const now = useNow(1000);
  const profile = useSingleton<Row>("userProfile");
  const { data: session } = authClient.useSession();

  // Location settings
  const lat = profile?.latitude ?? -6.2088;
  const lng = profile?.longitude ?? 106.8456;
  const method = (profile?.calcMethod as CalcMethodKey | undefined) ?? "Kemenag";
  const tz = getLocationTimezoneHours(lng);

  // Prayer times
  const times = useMemo(() => {
    if (!now) return null;
    return computePrayerTimes({
      date: now,
      lat,
      lng,
      timezone: tz,
      method,
    });
  }, [now, lat, lng, tz, method]);

  // Next prayer
  const next = useMemo(() => {
    if (!times || !now) return null;
    const base = getNextPrayer(times, now);
    if (base.isToday) return base;
    // If no more prayers today, calculate tomorrow's Fajr
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tt = computePrayerTimes({
      date: tomorrow,
      lat,
      lng,
      timezone: tz,
      method,
    });
    return {
      name: "Fajr" as const,
      time: tt.Fajr,
      isToday: false,
      msRemaining: tt.Fajr.getTime() - now.getTime(),
    };
  }, [times, now, lat, lng, tz, method]);

  // Hijri & Gregorian dates
  const locNow = now ? new Date(now.getTime() + tz * 3600000) : null;
  const hijri = locNow ? getHijriDate(locNow) : null;
  const greg = locNow ? getGregorianDate(locNow) : "";

  // User info
  const name = profile?.displayName || session?.user?.name || "";
  const userImage = session?.user?.image || "";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Notifications (placeholder)
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        {/* Sidebar toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeft className="h-[18px] w-[18px]" />
          )}
        </button>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <CommandPalette />
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Sync pill — NizamOS style */}
          <div className="hidden lg:flex items-center">
            <SyncBadge />
          </div>

          {/* Language/Theme */}
          <div className="hidden sm:flex items-center gap-0.5">
            <LangToggle />
            <ThemeToggle />
          </div>

          {/* Date */}
          <div className="hidden md:flex flex-col items-end leading-tight px-3 border-l border-border/60">
            <span className="text-[11px] text-muted-foreground">{hijri?.formatted}</span>
            <span className="text-xs font-medium truncate max-w-[180px]">{greg}</span>
          </div>

          {/* Prayer countdown */}
          {next && now ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="hidden sm:flex items-center gap-2.5 h-9 rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm hover:bg-primary/10 transition-colors group"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-muted-foreground">Berikutnya: {next.name}</span>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {formatCountdown(next.msRemaining)}
                </span>
              </div>
            </motion.button>
          ) : (
            <div className="hidden sm:flex h-9 w-32 items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Memuat…</span>
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-white/[0.07] hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotifOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-80 z-40 rounded-2xl border border-border bg-card p-2 shadow-lg"
                  >
                    <p className="px-3 py-2 text-sm font-semibold">{t("notif.title")}</p>
                    <div className="space-y-1">
                      <NotifItem
                        title="Shalat berikutnya mendekat"
                        desc={next && now ? `${next.name} dalam ${formatCountdown(next.msRemaining)} · ${formatTimeInZone(next.time, tz)}` : "—"}
                      />
                      <NotifItem title="Baca Al-Quran" desc="Target tilawah hari ini" />
                      <NotifItem title="Jurnal harian" desc="Kamu belum menulis hari ini" />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <button
            type="button"
            onClick={() => window.location.href = "/app/settings"}
            className="rounded-full ring-2 ring-transparent hover:ring-border transition-all"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-primary/10 text-xs font-semibold text-primary">
              {userImage ? (
                <img src={userImage} alt={name || "Pengguna"} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                initials || "U"
              )}
            </div>
          </button>

          {/* Keyboard shortcuts */}
          <button
            type="button"
            onClick={() => {
              // Placeholder - full implementation later
              alert("Pintasan keyboard akan segera hadir!");
            }}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Pintasan keyboard (?)"
          >
            <Keyboard className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NotifItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>
      </div>
    </div>
  );
}
