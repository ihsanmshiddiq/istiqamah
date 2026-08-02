import { cn } from "@/lib/utils";

/** Crescent + 8-point star mark, drawn inline so it inherits theme colors. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="istq-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="var(--primary)" opacity="0.1" />
      <path
        d="M30 12a12 12 0 1 0 0 24 9.5 9.5 0 1 1 0-24z"
        fill="url(#istq-g)"
      />
      <path
        d="M35.5 20l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6z"
        fill="var(--gold)"
      />
    </svg>
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
