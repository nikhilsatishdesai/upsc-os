import { cn } from "@/lib/utils";

/** Circular progress indicator with a centred percentage label. */
export function ProgressRing({
  percent,
  size = 76,
  strokeWidth = 7,
  label,
  className,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Accessible description, e.g. "45% of today's plan done". */
  label: string;
  className?: string;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className={cn("shrink-0 -rotate-90", className)}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-secondary"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="stroke-primary transition-[stroke-dashoffset] duration-700"
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        transform={`rotate(90 ${center} ${center})`}
        className="fill-foreground text-sm font-semibold tabular-nums"
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}
