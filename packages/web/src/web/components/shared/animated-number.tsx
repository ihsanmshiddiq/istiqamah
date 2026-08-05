"use client";
import * as React from "react";

/**
 * Smoothly counts from 0 (or previous value) to `value` using requestAnimationFrame.
 * Premium count-up micro-interaction for numeric stats.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  className,
  format = true,
  decimals = 0,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: boolean | ((v: number) => string);
  decimals?: number;
}) {
  const [display, setDisplay] = React.useState(0);
  const fromRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const v = from + (to - from) * ease(t);
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  const formatted =
    typeof format === "function"
      ? format(display)
      : format
        ? display.toLocaleString("id-ID", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : display.toFixed(decimals);

  return <span className={className}>{formatted}</span>;
}
