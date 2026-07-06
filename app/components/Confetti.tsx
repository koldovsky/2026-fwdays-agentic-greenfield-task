"use client";

// Fixed-position confetti burst for the winner moment. Mounted only after a
// decisive result and only when motion is allowed, so it never SSRs (no
// hydration mismatch) and never mounts under reduced motion (FR-BATTLE-07).
//
// Positions come from a pure, index-seeded pseudo-random function rather than
// Math.random — deterministic per index and side-effect free (render stays pure).
const PALETTE = [
  "var(--accent-primary)",
  "var(--accent-secondary)",
  "#3178c6",
  "#f1e05a",
  "#e06a6a",
];

/** Deterministic 0..1 value from a seed (pure: Math.sin has no side effects). */
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function Confetti({ count = 90 }: { count?: number }) {
  const bits = Array.from({ length: count }, (_, i) => ({
    left: seeded(i + 1) * 100,
    delay: seeded(i + 101) * 0.6,
    dur: 1.8 + seeded(i + 201) * 1.6,
    w: 6 + seeded(i + 301) * 7,
    color: PALETTE[i % PALETTE.length],
    rot: seeded(i + 401) * 360,
  }));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bits.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: -20,
            left: `${b.left}%`,
            width: b.w,
            height: b.w * 0.6,
            background: b.color,
            borderRadius: 2,
            transform: `rotate(${b.rot}deg)`,
            animation: `ds-confetti-fall ${b.dur}s linear ${b.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
