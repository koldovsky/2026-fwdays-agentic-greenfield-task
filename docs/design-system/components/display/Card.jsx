import React from 'react';

const PAD = { sm: 14, md: 18, lg: 24 };

/** Paper card surface. The base container for books, notes, panels. */
export function Card({ as = 'div', padding = 'md', interactive = false, ruled = false, accent, style, children, ...rest }) {
  const Comp = as;
  const p = typeof padding === 'number' ? padding : PAD[padding];
  return (
    <Comp
      className={interactive ? 'bs-card-int' : undefined}
      style={{
        position: 'relative',
        background: ruled ? 'var(--surface-card) var(--texture-rule)' : 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: p,
        cursor: interactive ? 'pointer' : undefined,
        transition: interactive
          ? 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)'
          : undefined,
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {accent && (
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }} />
      )}
      {children}
    </Comp>
  );
}
