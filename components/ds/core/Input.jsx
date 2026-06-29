'use client';
import React from 'react';

/**
 * Text input on paper, with optional leading icon and label/hint.
 */
export function Input({
  label,
  hint,
  error,
  iconLeft,
  size = 'md',
  id,
  style,
  ...rest
}) {
  const autoId = id || (label ? 'in-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const pad = size === 'sm' ? '7px 10px' : '10px 12px';
  const fs = size === 'sm' ? 'var(--text-sm)' : 'var(--text-base)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={autoId} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {iconLeft && (
          <span style={{ position: 'absolute', left: 11, display: 'inline-flex', color: 'var(--text-faint)', pointerEvents: 'none' }}>{iconLeft}</span>
        )}
        <input
          id={autoId}
          className="bs-input"
          style={{
            width: '100%', fontFamily: 'var(--font-body)', fontSize: fs,
            color: 'var(--text-primary)', background: 'var(--surface-card)',
            border: '1px solid ' + (error ? 'var(--danger)' : 'var(--border-strong)'),
            borderRadius: 'var(--radius-sm)', padding: pad,
            paddingLeft: iconLeft ? 34 : undefined,
            outline: 'none',
            transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
            ...style,
          }}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: error ? 'var(--danger)' : 'var(--text-muted)' }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}