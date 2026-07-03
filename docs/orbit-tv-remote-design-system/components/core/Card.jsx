import React from 'react';

/**
 * Card — the base neumorphic surface. `raised` (default) extrudes from
 * the background; `inset` recedes into it (used for wells like search
 * fields or the now-playing strip). This is the primitive every other
 * container in the kit is built from.
 */
export function Card({ children, variant = 'raised', padding = 'var(--space-6)', radius = 'var(--radius-lg)', style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--base-100)',
        borderRadius: radius,
        padding,
        boxShadow: variant === 'inset' ? 'var(--nm-inset-md)' : 'var(--nm-raised-md)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
