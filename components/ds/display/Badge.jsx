'use client';
import React from 'react';

const TONES = {
  neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)' },
  brand:   { bg: 'var(--accent-soft)', fg: 'var(--accent-hover)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  danger:  { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
};

/** Small status label. e.g. "Reading", "Finished", "Draft". */
export function Badge({ children, tone = 'neutral', dot = false, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-snug)',
        color: t.fg, background: t.bg,
        borderRadius: 'var(--radius-full)', padding: '2px 9px',
        whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}