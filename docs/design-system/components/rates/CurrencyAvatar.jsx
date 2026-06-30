import React from 'react';

/**
 * CurrencyAvatar — a calm roundel identifying a currency. Shows the ISO
 * code (mono) by default; pass `flag` (an emoji) to show it instead, the
 * single sanctioned emoji in the system. Sizes sm / md / lg.
 */
export function CurrencyAvatar({ code = '', flag, size = 'md', style = {} }) {
  const dims = {
    sm: { d: 28, fs: 'var(--text-2xs)', flagFs: 16 },
    md: { d: 38, fs: 'var(--text-xs)', flagFs: 22 },
    lg: { d: 48, fs: 'var(--text-sm)', flagFs: 28 },
  };
  const c = dims[size] || dims.md;

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: c.d,
        height: c.d,
        flex: 'none',
        borderRadius: '50%',
        background: flag ? 'var(--surface-sunken)' : 'var(--brand-soft)',
        border: '1px solid var(--border)',
        color: 'var(--brand)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 'var(--weight-semibold)',
        fontSize: flag ? c.flagFs : c.fs,
        letterSpacing: flag ? 0 : '0.02em',
        lineHeight: 1,
        overflow: 'hidden',
        ...style,
      }}
    >
      {flag || code.slice(0, 3)}
    </span>
  );
}
