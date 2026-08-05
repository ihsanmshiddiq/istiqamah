"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IslamicGeometricPattern — a subtle SVG tessellation backdrop.
 * Renders an 8-pointed star (Khatam) grid using currentColor strokes.
 * Designed to be used as a decorative opacity layer behind hero sections.
 */
export function IslamicGeometricPattern({
  className,
  opacity = 0.06,
  size = 64,
  strokeWidth = 1,
}: {
  className?: string;
  opacity?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const patternId = React.useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={`igp-${patternId}`}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(0)"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <rect
              x={size * 0.25}
              y={size * 0.25}
              width={size * 0.5}
              height={size * 0.5}
              transform={`rotate(45 ${size / 2} ${size / 2})`}
            />
            <rect
              x={size * 0.25}
              y={size * 0.25}
              width={size * 0.5}
              height={size * 0.5}
            />
            <circle cx={size / 2} cy={size / 2} r={size * 0.06} />
            <circle cx={0} cy={0} r={size * 0.04} />
            <circle cx={size} cy={0} r={size * 0.04} />
            <circle cx={0} cy={size} r={size * 0.04} />
            <circle cx={size} cy={size} r={size * 0.04} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#igp-${patternId})`} />
    </svg>
  );
}

/**
 * IslamicPatternHexagram — six-pointed star (Najmat Dawud) tessellation.
 */
export function IslamicPatternHexagram({
  className,
  opacity = 0.05,
  size = 56,
  strokeWidth = 1,
}: {
  className?: string;
  opacity?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const patternId = React.useId().replace(/[:]/g, "");
  const c = size / 2;
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={`ihp-${patternId}`}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <polygon points={`${c},2 ${size - 2},${size - 2} 2,${size - 2}`} />
            <polygon points={`${c},${size - 2} 2,2 ${size - 2},2`} />
            <circle cx={c} cy={c} r={size * 0.08} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#ihp-${patternId})`} />
    </svg>
  );
}

/**
 * IslamicPatternArabesque — flowing vine/leaf pattern.
 */
export function IslamicPatternArabesque({
  className,
  opacity = 0.04,
  size = 80,
  strokeWidth = 1.2,
}: {
  className?: string;
  opacity?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const patternId = React.useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={`iar-${patternId}`}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
            <path d={`M 0 ${size / 2} C ${size * 0.2} ${size * 0.2}, ${size * 0.4} ${size * 0.8}, ${size / 2} ${size / 2}`} />
            <path d={`M ${size / 2} ${size / 2} C ${size * 0.6} ${size * 0.2}, ${size * 0.8} ${size * 0.8}, ${size} ${size / 2}`} />
            <ellipse cx={size * 0.25} cy={size * 0.35} rx={size * 0.08} ry={size * 0.04} transform={`rotate(-30 ${size * 0.25} ${size * 0.35})`} />
            <ellipse cx={size * 0.75} cy={size * 0.35} rx={size * 0.08} ry={size * 0.04} transform={`rotate(30 ${size * 0.75} ${size * 0.35})`} />
            <ellipse cx={size * 0.5} cy={size * 0.7} rx={size * 0.08} ry={size * 0.04} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#iar-${patternId})`} />
    </svg>
  );
}

/**
 * IslamicPatternMoroccan — 8-fold rosette star pattern.
 */
export function IslamicPatternMoroccan({
  className,
  opacity = 0.05,
  size = 60,
  strokeWidth = 1,
}: {
  className?: string;
  opacity?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const patternId = React.useId().replace(/[:]/g, "");
  const c = size / 2;
  const starPoints = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? size * 0.42 : size * 0.2;
    return `${c + r * Math.cos(angle)},${c + r * Math.sin(angle)}`;
  }).join(" ");
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={`imr-${patternId}`}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
            <polygon points={starPoints} />
            <circle cx={c} cy={c} r={size * 0.08} />
            <circle cx={0} cy={0} r={size * 0.05} />
            <circle cx={size} cy={0} r={size * 0.05} />
            <circle cx={0} cy={size} r={size * 0.05} />
            <circle cx={size} cy={size} r={size * 0.05} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#imr-${patternId})`} />
    </svg>
  );
}
