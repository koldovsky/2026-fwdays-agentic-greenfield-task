import React from 'react';

/** Hashtag-style pill for book tags / shelves. Optional remove button. */
export function Tag({ children, color, active = false, onRemove, onClick, size = 'md', style, ...rest }) {
  const pad = size === 'sm' ? '2px 8px' : '4px 11px';
  const fs = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';
  return (
    <span
      onClick={onClick}
      className={onClick ? 'bs-tag' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-meta)', fontSize: fs, fontWeight: 'var(--weight-medium)',
        color: active ? 'var(--accent-on)' : 'var(--text-secondary)',
        background: active ? 'var(--accent)' : 'var(--surface-sunken)',
        border: '1px solid ' + (active ? 'transparent' : 'var(--border-default)'),
        borderRadius: 'var(--radius-full)', padding: pad,
        cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
        transition: 'background var(--dur-fast) var(--ease-out)', ...style,
      }}
      {...rest}
    >
      {color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />}
      {children}
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ display: 'inline-flex', cursor: 'pointer', opacity: 0.5, fontSize: 13, lineHeight: 1 }}
        >×</span>
      )}
    </span>
  );
}
