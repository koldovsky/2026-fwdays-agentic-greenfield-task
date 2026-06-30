import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * trendTone — the single source of truth for movement semantics.
 * A move within ±`flatBand`% reads as flat. Strengthen (positive) is
 * "up" (green); weaken (negative) is "down" (clay).
 */
export function trendTone(deltaPct, flatBand = 0.05) {
  if (deltaPct > flatBand) return 'up';
  if (deltaPct < -flatBand) return 'down';
  return 'flat';
}

const ICONS = { up: 'arrow-up-right', down: 'arrow-down-right', flat: 'minus' };

/**
 * TrendBadge — the product's signature movement read. Shows a direction
 * arrow and the signed delta in tabular mono, in the honest semantic
 * colour. Strengthen = green, weaken = clay, flat = warm grey. `solid`
 * fills; default is the soft tint.
 */
export function TrendBadge({ delta, unit = '%', size = 'md', solid = false, flatBand = 0.05, showSign = true, style = {} }) {
  const tone = trendTone(delta, flatBand);
  const dims = {
    sm: { h: 20, px: '0 7px', fs: 'var(--text-2xs)', icon: 12, gap: 3 },
    md: { h: 24, px: '0 9px', fs: 'var(--text-xs)', icon: 14, gap: 4 },
    lg: { h: 30, px: '0 12px', fs: 'var(--text-sm)', icon: 16, gap: 5 },
  };
  const c = dims[size] || dims.md;
  const mag = Math.abs(delta);
  const sign = tone === 'flat' ? '' : (tone === 'up' ? '+' : '−');
  const text = `${showSign ? sign : ''}${mag.toLocaleString('uk-UA', { minimumFractionDigits: mag < 10 ? 2 : 0, maximumFractionDigits: 2 })}${unit}`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: c.gap,
        height: c.h,
        padding: c.px,
        borderRadius: 'var(--radius-pill)',
        background: solid ? `var(--trend-${tone}-solid)` : `var(--trend-${tone}-bg)`,
        color: solid ? '#fff' : `var(--trend-${tone}-fg)`,
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: c.fs,
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <Icon name={ICONS[tone]} size={c.icon} stroke={2} />
      {text}
    </span>
  );
}
