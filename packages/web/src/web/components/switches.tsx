import { Moon, Sun, Languages, Cloud, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useSyncStatus } from "@/hooks/use-store";
import { setSingleton } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={() => {
        toggle();
        void setSingleton("userProfile", { theme: theme === "dark" ? "light" : "dark" });
      }}
      aria-label="Toggle theme"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const next = lang === "id" ? "en" : "id";
  return (
    <button
      type="button"
      onClick={() => {
        setLang(next);
        void setSingleton("userProfile", { language: next });
      }}
      aria-label="Switch language"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Languages className="h-[18px] w-[18px]" />
      <span className="uppercase">{lang}</span>
    </button>
  );
}

export function SyncBadge({ className }: { className?: string }) {
  const { status, pending } = useSyncStatus();
  const { t } = useI18n();
  const map = {
    idle: {
      icon: Cloud,
      label: t("sync.idle"),
      iconCls: "text-emerald-400",
      borderCls: "border-emerald-500/20",
    },
    syncing: {
      icon: RefreshCw,
      label: t("sync.syncing"),
      iconCls: "text-primary",
      borderCls: "border-primary/20",
    },
    offline: {
      icon: CloudOff,
      label: t("sync.offline"),
      iconCls: "text-amber-400",
      borderCls: "border-amber-500/20",
    },
    error: {
      icon: TriangleAlert,
      label: t("sync.error"),
      iconCls: "text-destructive",
      borderCls: "border-destructive/20",
    },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
        s.borderCls,
        "bg-white/[0.03] dark:bg-white/[0.04]",
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", s.iconCls, status === "syncing" && "animate-spin")} />
      <span className="hidden lg:inline">
        {pending > 0 && status !== "syncing" ? t("sync.pending", { n: pending }) : s.label}
      </span>
    </span>
  );
}
