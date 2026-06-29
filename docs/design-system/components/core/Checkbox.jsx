import React from 'react';

/** Checkbox with label. Box fills ballpoint-blue when checked. */
export function Checkbox({ checked, defaultChecked, onChange, disabled = false, label, style, ...rest }) {
  const isControlled = checked !== undefined;
  const [on, setOn] = React.useState(defaultChecked || false);
  const value = isControlled ? checked : on;
  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setOn(!value);
    onChange && onChange(!value);
  };
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span
        role="checkbox"
        aria-checked={value}
        onClick={toggle}
        style={{
          width: 19, height: 19, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: value ? 'var(--accent)' : 'var(--surface-card)',
          border: '1.5px solid ' + (value ? 'var(--accent)' : 'var(--border-strong)'),
          borderRadius: 'var(--radius-xs)', color: '#fff', fontSize: 12,
          transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        }}
        {...rest}
      >
        {value && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        )}
      </span>
      {label && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
