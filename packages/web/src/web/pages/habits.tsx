import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app-shell";
import { HabitsPanel } from "./ibadah";

export default function Habits() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("habit.title")} subtitle={t("habits.subtitle")} />
      <HabitsPanel />
    </div>
  );
}
