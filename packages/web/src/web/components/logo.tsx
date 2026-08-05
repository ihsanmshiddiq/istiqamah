import { cn } from "@/lib/utils";

/** Logo mark — uses the PNG logo from public/images/logo.png. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/images/logo.png"
      alt="Istiqamah"
      className={cn("h-10 w-10 object-contain", className)}
      draggable={false}
    />
  );
}

export function Wordmark({ className, showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark && <LogoMark />}
      <span className="font-display text-xl font-semibold tracking-tight">Istiqamah</span>
    </span>
  );
}
