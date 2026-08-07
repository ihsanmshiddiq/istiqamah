import { cn } from "@/lib/utils";

/** Logo mark — uses the PNG logo from public/images/logo.png. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/icons/logo.svg"
      alt="Istiqamah"
      className={cn("h-10 w-10 object-contain", className)}
      draggable={false}
    />
  );
}

export function Wordmark({ className, showMark = true, showByline = false }: { className?: string; showMark?: boolean; showByline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark && <LogoMark />}
      <span className="inline-flex flex-col">
        <span className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">Istiqamah</span>
        {showByline && (
          <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/50">
            By Ihsan
          </span>
        )}
      </span>
    </span>
  );
}
