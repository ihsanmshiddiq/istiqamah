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
    idle: { icon: Cloud, label: t("sync.idle"), cls: "text-muted-foreground" },
    syncing: { icon: RefreshCw, label: t("sync.syncing"), cls: "text-primary" },
    offline: { icon: CloudOff, label: t("sync.offline"), cls: "text-amber-500" },
    error: { icon: TriangleAlert, label: t("sync.error"), cls: "text-destructive" },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", s.cls, className)}>
      <Icon className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")} />
      <span className="hidden sm:inline">
        {pending > 0 && status !== "syncing" ? t("sync.pending", { n: pending }) : s.label}
      </span>
    </span>
  );
}
