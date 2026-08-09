import { useState } from "react";
import { useLocation } from "wouter";
import { Check, LogOut, RefreshCw, User, SlidersHorizontal, ToggleRight, Database, Monitor, Sun, Moon, Bell, BellOff, Download, Upload, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import { setSingleton, fullSync, type Row } from "@/lib/store";
import { getNotificationConfig, setNotificationConfig, requestNotificationPermission, isNotificationSupported } from "@/lib/notifications";
import { exportToFile, exportToPDF, exportAllData, parseImportFile, importSummary } from "@/lib/export";
import { useTheme, type Theme } from "@/lib/theme";
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
  const [notifConfig, setNotifConfig] = useState(getNotificationConfig);
  const [notifSupported] = useState(isNotificationSupported);
  const [importing, setImporting] = useState(false);
  const [importInfo, setImportInfo] = useState<string | null>(null);

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
              onChange={(v: Theme) => {
                setTheme(v);
                void setSingleton("userProfile", { theme: v });
              }}
              options={[
                { value: "light", label: t("settings.theme.light") },
                { value: "dark", label: t("settings.theme.dark") },
                { value: "system", label: t("settings.theme.system") },
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

        {/* Notifications */}
        {notifSupported && (
          <Section icon={Bell} title={t("settings.notifications")}>
            <Row2 label={t("settings.notif.enable")} hint={t("settings.notif.enable.hint")}>
              <Switch
                checked={notifConfig.enabled}
                onChange={async (v) => {
                  if (v) {
                    const granted = await requestNotificationPermission();
                    if (!granted) return;
                  }
                  const newConfig = { ...notifConfig, enabled: v };
                  setNotifConfig(newConfig);
                  setNotificationConfig(newConfig);
                }}
              />
            </Row2>
            {notifConfig.enabled && (
              <>
                <Row2 label={t("settings.notif.prayer")}>
                  <Switch
                    checked={notifConfig.prayerReminders}
                    onChange={(v) => {
                      const newConfig = { ...notifConfig, prayerReminders: v };
                      setNotifConfig(newConfig);
                      setNotificationConfig(newConfig);
                    }}
                  />
                </Row2>
                <Row2 label={t("settings.notif.habits")}>
                  <Switch
                    checked={notifConfig.habitReminders}
                    onChange={(v) => {
                      const newConfig = { ...notifConfig, habitReminders: v };
                      setNotifConfig(newConfig);
                      setNotificationConfig(newConfig);
                    }}
                  />
                </Row2>
                <Row2 label={t("settings.notif.murajaah")}>
                  <Switch
                    checked={notifConfig.murajaahReminders}
                    onChange={(v) => {
                      const newConfig = { ...notifConfig, murajaahReminders: v };
                      setNotifConfig(newConfig);
                      setNotificationConfig(newConfig);
                    }}
                  />
                </Row2>
              </>
            )}
          </Section>
        )}

        {/* Data */}
        <Section icon={Database} title={t("settings.data")}>
          <p className="text-xs text-muted-foreground">{t("settings.data.hint")}</p>
          <Button variant="outline" className="w-full" onClick={doSync} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /> {t("settings.syncNow")}
          </Button>
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="outline" className="w-full" onClick={exportToFile}>
              <Download className="h-4 w-4" /> {t("settings.export.json")}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => exportToPDF(exportAllData())}>
              <FileText className="h-4 w-4" /> {t("settings.export.pdf")}
            </Button>
          </div>
          <div className="mt-2">
            <label className="block">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImporting(true);
                  try {
                    const data = await parseImportFile(file);
                    const summary = importSummary(data);
                    const count = summary.collections.reduce((s, c) => s + c.count, 0);
                    setImportInfo(`${t("settings.import.ready")}: ${count} ${t("settings.import.items")}`);
                    // Note: Actual import would require store integration
                  } catch (err) {
                    setImportInfo(t("settings.import.error"));
                  } finally {
                    setImporting(false);
                  }
                }}
              />
              <Button variant="outline" className="w-full" disabled={importing} asChild>
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> {t("settings.import.json")}</span>
              </Button>
            </label>
            {importInfo && <p className="text-xs text-muted-foreground mt-1">{importInfo}</p>}
          </div>
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
