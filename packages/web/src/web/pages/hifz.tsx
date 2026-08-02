import { useI18n } from "@/lib/i18n";
import { useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/primitives";
import { BookOpenText } from "lucide-react";
import { HifdzPanel } from "./ibadah";

export default function Hifz() {
  const { t } = useI18n();
  const profile = useSingleton<Row>("userProfile");
  const hifdzOn = profile?.hifdzEnabled ?? true;
  return (
    <div>
      <PageHeader title={t("hifdz.title")} subtitle={t("hifz.subtitle")} />
      {hifdzOn ? (
        <HifdzPanel />
      ) : (
        <EmptyState icon={<BookOpenText className="h-8 w-8" />} title={t("hifdz.disabled")} />
      )}
    </div>
  );
}
