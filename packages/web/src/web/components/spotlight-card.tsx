import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card wrapper with a subtle cursor-follow spotlight glow.
 * Radial gradient in primary color at ~15% opacity — very calm, editorial feel.
 */
export function SpotlightCard({
  children,
  className,
  as: Tag = "div",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);

  function onMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <Tag
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={cn("relative overflow-hidden", className)}
      {...(props as any)}
    >
      {/* Spotlight glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(circle 250px at ${pos.x}% ${pos.y}%, oklch(0.42 0.085 165 / 0.12), transparent)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}
