import { arcOffset } from "@/lib/ring/ring";

export type RingState = "idle" | "due" | "disabled";

interface BreathingRingProps {
  /** Elapsed fraction of the current interval, `[0, 1]`. */
  fraction: number;
  state: RingState;
  /** Large centered countdown label. */
  label: string;
  /** Small caption under the label. */
  caption?: string;
}

const SIZE = 280;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STROKE_BY_STATE: Record<RingState, string> = {
  idle: "var(--color-accent)",
  due: "var(--color-signal)",
  disabled: "var(--color-muted)",
};

/**
 * The signature breathing ring (DESIGN.md): an SVG progress arc with a centered
 * countdown. Idle uses `accent`, the due state fills with `signal` (the one warm
 * moment), disabled is `muted`. The breathing pulse is disabled under
 * `prefers-reduced-motion` (NFR-MOTION-01).
 */
export function BreathingRing({ fraction, state, label, caption }: BreathingRingProps) {
  const stroke = STROKE_BY_STATE[state];
  const breathing =
    state === "disabled" ? "" : "animate-breathe motion-reduce:animate-none";

  return (
    <div
      className={`relative ${breathing}`}
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-muted)"
          strokeOpacity={0.15}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={arcOffset(fraction, CIRCUMFERENCE)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-5xl tabular-nums text-ink">{label}</div>
          {caption ? <p className="mt-2 text-sm text-muted">{caption}</p> : null}
        </div>
      </div>
    </div>
  );
}
