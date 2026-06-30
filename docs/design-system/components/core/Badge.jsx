import React from 'react';

/**
 * Badge — a small status pill. Tones map to brand + trend semantics
 * (up / down / flat) plus neutral. `solid` fills with the tone colour;
 * default is the soft tint. Numbers inside render in mono automatically
 * when `mono` is set.
 */
const TONES = {
  brand:   { bg: 'var(--brand-soft)', fg: 'var(--brand)', solidBg: 'var(--brand)', solidFg: 'var(--text-on-brand)' },
  up:      { bg: 'var(--trend-up-bg)', fg: 'var(--trend-up-fg)', solidBg: 'var(--trend-up-solid)', solidFg: '#fff' },
  down:    { bg: 'var(--trend-down-bg)', fg: 'var(--trend-down-fg)', solidBg: 'var(--trend-down-solid)', solidFg: '#fff' },
  flat:    { bg: 'var(--trend-flat-bg)', fg: 'var(--trend-flat-fg)', solidBg: 'var(--trend-flat-solid)', solidFg: '#fff' },
  accent:  { bg: 'var(--accent-soft)', fg: 'var(--brass-600)', solidBg: 'var(--accent)', solidFg: 'var(--accent-on)' },
  neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)', solidBg: 'var(--text-secondary)', solidFg: 'var(--surface)' },
};

export function Badge({ children, tone = 'neutral', solid = false, mono = false, style = {} }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 9px',
        borderRadius: 'var(--radius-pill)',
        background: solid ? t.solidBg : t.bg,
        color: solid ? t.solidFg : t.fg,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
