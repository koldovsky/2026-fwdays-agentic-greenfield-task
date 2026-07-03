import React from 'react';

/**
 * Priority tag shown on each checklist requirement row.
 * "must" renders in brand blue; "nice" in muted grey.
 */
export function Badge({ priority = 'must' }) {
  const styles = {
    must: {
      color: 'var(--color-brand)',
      background: 'var(--color-brand-wash)',
    },
    nice: {
      color: 'var(--color-ink-muted)',
      background: '#f0f1f3',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 'var(--radius-xs)',
        fontFamily: 'var(--font-body)',
        lineHeight: 1.6,
        ...(styles[priority] || styles.must),
      }}
    >
      {priority}
    </span>
  );
}
