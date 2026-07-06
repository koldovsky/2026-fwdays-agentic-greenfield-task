import React from 'react';

/* Fixed-position confetti burst. Mount when a winner is decided; unmount (or
   toggle 'active') after ~3s. Uses the --ds-confetti-fall keyframe from tokens. */
export function Confetti({ count = 90, active = true, colors }) {
  const palette = colors || ['var(--accent-primary)', 'var(--accent-secondary)', '#3178c6', '#f1e05a', '#e06a6a'];
  const bits = React.useMemo(() => Array.from({ length: count }).map((_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 1.8 + Math.random() * 1.6,
    w: 6 + Math.random() * 7, color: palette[i % palette.length], rot: Math.random() * 360,
  })), [count]);
  if (!active) return null;
  return React.createElement('div', { style: { position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 } },
    bits.map((b, i) => React.createElement('div', { key: i, style: { position: 'absolute', top: -20, left: b.left + '%', width: b.w, height: b.w * 0.6, background: b.color, borderRadius: 2, transform: 'rotate(' + b.rot + 'deg)', animation: 'ds-confetti-fall ' + b.dur + 's linear ' + b.delay + 's forwards' } }))
  );
}
