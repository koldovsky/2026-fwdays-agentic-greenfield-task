import React from 'react';

/**
 * One row in the compliance checklist — requirement title, priority badge,
 * one-sentence rationale, and a right-aligned status label.
 * FR-CHECKLIST-02
 */
export function ChecklistRow({
  requirement,
  priority = 'must',
  status = 'met',
  rationale,
  last = false,
}) {
  const statusConfigs = {
    met: {
      dot: 'var(--color-met)',
      label: 'met',
      labelColor: 'var(--color-met)',
    },
    partial: {
      dot: 'var(--color-partial)',
      label: 'partial',
      labelColor: 'var(--color-partial-text)',
    },
    gap: {
      dot: 'var(--color-gap)',
      label: 'gap',
      labelColor: 'var(--color-gap-text)',
    },
    overclaim: {
      dot: 'var(--color-overclaim)',
      label: 'overclaim-risk',
      labelColor: 'var(--color-overclaim-text)',
    },
  };

  const s = statusConfigs[status] || statusConfigs.met;

  const priorityStyle =
    priority === 'must'
      ? { color: 'var(--color-brand)', background: 'var(--color-brand-wash)' }
      : { color: 'var(--color-ink-muted)', background: '#f0f1f3' };

  return (
    <div
      style={{
        display: 'flex',
        gap: '14px',
        padding: '16px 0',
        borderBottom: last ? 'none' : '1px solid #f5f6f7',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span
        style={{
          width: '11px',
          height: '11px',
          borderRadius: '50%',
          background: s.dot,
          marginTop: '5px',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: rationale ? '3px' : 0,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 'var(--text-base)',
              color: 'var(--color-ink)',
            }}
          >
            {requirement}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 'var(--radius-xs)',
              ...priorityStyle,
            }}
          >
            {priority}
          </span>
        </div>
        {rationale && (
          <div
            style={{
              fontSize: '13.5px',
              color: 'var(--color-ink-soft)',
              lineHeight: 1.45,
            }}
          >
            {rationale}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: s.labelColor,
          alignSelf: 'center',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {s.label}
      </span>
    </div>
  );
}
