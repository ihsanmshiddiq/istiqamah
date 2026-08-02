import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "./app-shell";
import { Card } from "./ui/primitives";

export function ComingSoon({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
}) {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="relative overflow-hidden p-10 text-center sm:p-16">
          <div className="geo-texture pointer-events-none absolute inset-0 opacity-[0.05]" />
          <div className="relative mx-auto flex max-w-sm flex-col items-center gap-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-semibold">{t("soon.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("soon.body")}</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
