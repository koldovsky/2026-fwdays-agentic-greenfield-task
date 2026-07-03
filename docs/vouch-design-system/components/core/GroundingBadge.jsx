import React from 'react';

/**
 * Inline pill shown under each tailored bullet indicating its grounding status.
 * FR-BULLETS-01, FR-BULLETS-02, FR-EDIT-02
 */
export function GroundingBadge({ status = 'met', label }) {
  const configs = {
    met: {
      bg: 'var(--color-met-bg)',
      color: 'var(--color-met)',
      dot: 'var(--color-met)',
      defaultLabel: 'Grounded',
    },
    partial: {
      bg: 'var(--color-partial-bg)',
      color: 'var(--color-partial-text)',
      dot: 'var(--color-partial)',
      defaultLabel: 'Partial match',
    },
    overclaim: {
      bg: 'var(--color-overclaim-bg)',
      color: 'var(--color-overclaim-text)',
      dot: 'var(--color-overclaim)',
      defaultLabel: 'No evidence found · excluded from export',
    },
    manual: {
      bg: '#f4f5f7',
      color: 'var(--color-ink-soft)',
      dot: 'var(--color-ink-muted)',
      defaultLabel: 'відредаговано вручну',
    },
  };

  const c = configs[status] || configs.met;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        background: c.bg,
        color: c.color,
        fontWeight: 600,
        fontSize: '12.5px',
        padding: '6px 11px',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-body)',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: c.dot,
          flexShrink: 0,
        }}
      />
      {label !== undefined ? label : c.defaultLabel}
    </span>
  );
}
