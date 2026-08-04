import { motion } from "motion/react";

interface SparklineChartProps {
  /** Array of numeric values to plot */
  data: number[];
  /** SVG stroke color */
  color?: string;
  /** Chart height in pixels */
  height?: number;
  /** Whether values are percentages (0-1) */
  percent?: boolean;
  /** Additional class names */
  className?: string;
}

export function SparklineChart({
  data,
  color = "var(--color-primary, #7c6f5b)",
  height = 48,
  percent = false,
  className,
}: SparklineChartProps) {
  if (data.length === 0) return null;

  const w = 200;
  const h = height;
  const pad = 4;
  const max = percent ? 1 : Math.max(1, ...data);
  const n = data.length;

  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(1, n - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");

  const area = `${line} L${pts[n - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className ?? "h-12 w-full"}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill="url(#spark-grad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
      />
    </svg>
  );
}
