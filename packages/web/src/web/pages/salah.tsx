import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app-shell";
import { PrayerPanel } from "./ibadah";

export default function Salah() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("prayer.title")} subtitle={t("salah.subtitle")} />
      <PrayerPanel />
    </div>
  );
}
