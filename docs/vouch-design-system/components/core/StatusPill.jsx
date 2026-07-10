import React from 'react';

/**
 * Job processing status pill — used in the tailoring pipeline status bar.
 * FR-TAILOR-01
 */
export function StatusPill({ status = 'queued' }) {
  const configs = {
    queued: {
      background: '#f4f5f7',
      color: 'var(--color-ink-soft)',
      dot: 'var(--color-ink-muted)',
    },
    processing: {
      background: 'var(--color-brand-wash)',
      color: 'var(--color-brand)',
      dot: 'var(--color-brand)',
    },
    done: {
      background: 'var(--color-met-bg)',
      color: 'var(--color-met)',
      dot: 'var(--color-met)',
    },
    failed: {
      background: 'var(--color-gap-bg)',
      color: 'var(--color-gap-text)',
      dot: 'var(--color-gap)',
    },
  };

  const c = configs[status] || configs.queued;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        background: c.background,
        color: c.color,
        fontWeight: 600,
        fontSize: 'var(--text-sm)',
        padding: '7px 13px',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-body)',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: c.dot,
          flexShrink: 0,
        }}
      />
      {status}
    </span>
  );
}
