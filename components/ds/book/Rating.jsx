'use client';
import React from 'react';

/** Score scale color ramp — red → amber → green as the score climbs. */
function rampColor(v) {
  if (v <= 3) return 'var(--hl-coral)';
  if (v <= 5) return 'var(--hl-amber)';
  if (v <= 7) return 'var(--hl-yellow)';
  if (v <= 8) return 'var(--hl-green)';
  return 'var(--hl-teal)';
}

/**
 * Bookshelf 1–10 rating. Ten pips fill up to the score; an optional
 * mono number sits alongside. Interactive when `onChange` is given.
 */
export function Rating({ value = 0, onChange, readOnly = false, showNumber = true, size = 'md', style }) {
  const [hover, setHover] = React.useState(null);
  const interactive = !readOnly && typeof onChange === 'function';
  const shown = hover ?? value;
  const pipH = size === 'sm' ? 14 : size === 'lg' ? 26 : 18;
  const pipW = size === 'sm' ? 5 : size === 'lg' ? 8 : 6;
  const color = rampColor(shown);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'lg' ? 12 : 9, ...style }}>
      <div
        style={{ display: 'inline-flex', gap: 3, alignItems: 'flex-end' }}
        onMouseLeave={() => interactive && setHover(null)}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const filled = n <= shown;
          return (
            <span
              key={n}
              onClick={() => interactive && onChange(n)}
              onMouseEnter={() => interactive && setHover(n)}
              style={{
                width: pipW, height: pipH, borderRadius: 'var(--radius-full)',
                background: filled ? color : 'var(--ink-6)',
                cursor: interactive ? 'pointer' : 'default',
                transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
                transform: interactive && hover === n ? 'scaleY(1.12)' : 'none',
              }}
            />
          );
        })}
      </div>
      {showNumber && (
        <span style={{ fontFamily: 'var(--font-meta)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', fontSize: size === 'lg' ? 'var(--text-xl)' : 'var(--text-base)' }}>
          {shown ? shown.toFixed ? (Number.isInteger(shown) ? shown : shown.toFixed(1)) : shown : '–'}
          <span style={{ color: 'var(--text-faint)', fontSize: '0.7em' }}>/10</span>
        </span>
      )}
    </div>
  );
}