import React from 'react';

/* Shimmering placeholder block. Compose these to mirror a loaded layout's
   footprint so data arrival causes no layout shift (FR-STATS-05). */
export function Skeleton({ width = '100%', height = 16, radius = 'var(--radius-sm)', style = {} }) {
  return React.createElement('div', { style: {
    width, height, borderRadius: radius,
    background: 'linear-gradient(90deg, var(--surface-track) 25%, var(--border) 37%, var(--surface-track) 63%)',
    backgroundSize: '200% 100%', animation: 'ds-shimmer 1.4s ease-in-out infinite', ...style,
  } });
}
