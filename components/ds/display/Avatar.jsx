'use client';
import React from 'react';

const SIZES = { sm: 28, md: 36, lg: 48 };
const PALETTE = ['var(--hl-coral)', 'var(--hl-blue)', 'var(--hl-purple)', 'var(--hl-teal)', 'var(--hl-amber)', 'var(--hl-pink)'];

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** Round avatar — shows an image, or colored initials fallback. */
export function Avatar({ name = '', src, size = 'md', style, ...rest }) {
  const d = SIZES[size] || SIZES.md;
  const bg = PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: d, height: d, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: src ? 'var(--surface-sunken)' : bg, color: 'var(--ink-0)',
        fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-bold)',
        fontSize: d * 0.38, userSelect: 'none',
        boxShadow: 'inset 0 0 0 1px var(--border-subtle)', ...style,
      }}
      {...rest}
    >
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name)}
    </span>
  );
}