'use client';
import React from 'react';

/** Multi-line text area for notes and summaries. Optional ruled-line paper. */
export function Textarea({ label, hint, ruled = false, rows = 4, id, style, ...rest }) {
  const autoId = id || (label ? 'ta-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={autoId} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <textarea
        id={autoId}
        rows={rows}
        className="bs-input"
        style={{
          width: '100%', resize: 'vertical',
          fontFamily: ruled ? 'var(--font-display)' : 'var(--font-body)',
          fontSize: ruled ? 'var(--text-md)' : 'var(--text-base)',
          lineHeight: ruled ? '32px' : 'var(--leading-normal)',
          color: 'var(--text-primary)',
          background: ruled ? 'var(--surface-card) var(--texture-rule)' : 'var(--surface-card)',
          border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
          padding: ruled ? '6px 14px' : '10px 12px', outline: 'none',
          transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
          ...style,
        }}
        {...rest}
      />
      {hint && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}