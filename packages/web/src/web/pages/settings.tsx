import { useState } from "react";
import { useLocation } from "wouter";
import { Check, LogOut, RefreshCw, User, SlidersHorizontal, ToggleRight, Database } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import { setSingleton, fullSync, type Row } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { PageHeader } from "@/components/app-shell";
import { Button, Card, Input, SegmentedControl, Switch } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 inline-flex items-center gap-2 font-display text-lg font-semibold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Row2({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [, navigate] = useLocation();
  const profile = useSingleton<Row>("userProfile");
  const [name, setName] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayName = name ?? (profile?.displayName ? String(profile.displayName) : "");
  const gender = String(profile?.gender ?? "unset");
  const hifdzEnabled = profile?.hifdzEnabled ?? true;
  const cycleEnabled = profile?.cycleEnabled ?? false;

  async function saveName() {
    await setSingleton("userProfile", { displayName });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }
  async function doSync() {
    setSyncing(true);
    await fullSync();
    setSyncing(false);
  }
  async function signOut() {
    await authClient.signOut();
    navigate("/");
  }

  return (
    <div>
      <PageHeader title={t("settings.title")} />
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Section icon={User} title={t("settings.profile")}>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("settings.displayName")}</p>
            <div className="flex gap-2">
              <Input value={displayName} onChange={(e) => setName(e.target.value)} />
              <Button variant="soft" onClick={saveName}>
                {saved ? <Check className="h-4 w-4" /> : t("common.save")}
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("settings.gender")}</p>
            <p className="mb-2 text-xs text-muted-foreground">{t("settings.gender.hint")}</p>
            <SegmentedControl
              className="w-full"
              value={gender}
              onChange={(v) => void setSingleton("userProfile", { gender: v, ...(v !== "female" ? { cycleEnabled: false } : {}) })}
              options={[
                { value: "male", label: t("settings.gender.male") },
                { value: "female", label: t("settings.gender.female") },
                { value: "unset", label: t("settings.gender.unset") },
              ]}
            />
          </div>
        </Section>

        {/* Preferences */}
        <Section icon={SlidersHorizontal} title={t("settings.preferences")}>
          <Row2 label={t("settings.language")}>
            <SegmentedControl
              value={lang}
              onChange={(v) => {
                setLang(v);
                void setSingleton("userProfile", { language: v });
              }}
              options={[
                { value: "id", label: "ID" },
                { value: "en", label: "EN" },
              ]}
            />
          </Row2>
          <Row2 label={t("settings.theme")}>
            <SegmentedControl
              value={theme}
              onChange={(v) => {
                setTheme(v);
                void setSingleton("userProfile", { theme: v });
              }}
              options={[
                { value: "light", label: t("settings.theme.light") },
                { value: "dark", label: t("settings.theme.dark") },
              ]}
            />
          </Row2>
        </Section>

        {/* Features */}
        <Section icon={ToggleRight} title={t("settings.features")}>
          <Row2 label={t("settings.hifdzEnabled")} hint={t("settings.hifdzEnabled.hint")}>
            <Switch checked={!!hifdzEnabled} onChange={(v) => void setSingleton("userProfile", { hifdzEnabled: v })} />
          </Row2>
          <Row2 label={t("settings.cycleEnabled")} hint={t("settings.cycleEnabled.hint")}>
            <Switch
              checked={!!cycleEnabled}
              disabled={gender !== "female"}
              onChange={(v) => void setSingleton("userProfile", { cycleEnabled: v })}
            />
          </Row2>
        </Section>

        {/* Data */}
        <Section icon={Database} title={t("settings.data")}>
          <p className="text-xs text-muted-foreground">{t("settings.data.hint")}</p>
          <Button variant="outline" className="w-full" onClick={doSync} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /> {t("settings.syncNow")}
          </Button>
        </Section>
      </div>

      {/* Account */}
      <div className="mt-4">
        <Section icon={LogOut} title={t("settings.account")}>
          <Button variant="danger" className="w-full sm:w-auto" onClick={signOut}>
            <LogOut className="h-4 w-4" /> {t("settings.signout")}
          </Button>
        </Section>
      </div>
    </div>
  );
}
