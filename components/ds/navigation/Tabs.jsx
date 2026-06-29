'use client';
import React from 'react';

/**
 * Underline tabs. The active tab gets an ink-blue rule beneath it.
 * Controlled via `value` + `onChange`, or uncontrolled with `defaultValue`.
 */
export function Tabs({ items = [], value, defaultValue, onChange, style }) {
  const isControlled = value !== undefined;
  const first = items[0] && (typeof items[0] === 'string' ? items[0] : items[0].value);
  const [internal, setInternal] = React.useState(defaultValue ?? first);
  const active = isControlled ? value : internal;

  const select = (v) => {
    if (!isControlled) setInternal(v);
    onChange && onChange(v);
  };

  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-default)', ...style }}>
      {items.map((it) => {
        const val = typeof it === 'string' ? it : it.value;
        const lbl = typeof it === 'string' ? it : it.label;
        const count = typeof it === 'object' ? it.count : undefined;
        const on = val === active;
        return (
          <button
            key={val}
            type="button"
            onClick={() => select(val)}
            className="bs-tab"
            style={{
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
              fontWeight: on ? 'var(--weight-semibold)' : 'var(--weight-medium)',
              color: on ? 'var(--text-primary)' : 'var(--text-muted)',
              padding: '10px 12px', marginBottom: -1,
              borderBottom: '2px solid ' + (on ? 'var(--accent)' : 'transparent'),
              transition: 'color var(--dur-fast) var(--ease-out)',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}
          >
            {lbl}
            {count !== undefined && (
              <span style={{
                fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)',
                color: on ? 'var(--accent-hover)' : 'var(--text-faint)',
                background: on ? 'var(--accent-soft)' : 'var(--surface-sunken)',
                borderRadius: 'var(--radius-full)', padding: '1px 7px',
              }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}