import React from 'react';

/** Native select styled as a Bookshelf control. */
export function Select({ label, hint, options = [], size = 'md', id, style, children, ...rest }) {
  const autoId = id || (label ? 'sel-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const pad = size === 'sm' ? '7px 30px 7px 10px' : '9px 32px 9px 12px';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={autoId} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <select
          id={autoId}
          className="bs-input"
          style={{
            width: '100%', appearance: 'none', WebkitAppearance: 'none',
            fontFamily: 'var(--font-body)', fontSize: size === 'sm' ? 'var(--text-sm)' : 'var(--text-base)',
            color: 'var(--text-primary)', background: 'var(--surface-card)',
            border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            padding: pad, outline: 'none', cursor: 'pointer',
            transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
            ...style,
          }}
          {...rest}
        >
          {children || options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
        <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-faint)', fontSize: 11 }}>▾</span>
      </div>
      {hint && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}
