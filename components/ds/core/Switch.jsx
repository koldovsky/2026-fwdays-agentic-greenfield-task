'use client';
import React from 'react';

/** On/off toggle. Controlled via `checked` + `onChange`, or uncontrolled. */
export function Switch({ checked, defaultChecked, onChange, disabled = false, label, size = 'md', style, ...rest }) {
  const isControlled = checked !== undefined;
  const [on, setOn] = React.useState(defaultChecked || false);
  const value = isControlled ? checked : on;
  const w = size === 'sm' ? 34 : 42;
  const h = size === 'sm' ? 20 : 24;
  const knob = h - 6;

  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setOn(!value);
    onChange && onChange(!value);
  };

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span
        role="switch"
        aria-checked={value}
        onClick={toggle}
        style={{
          position: 'relative', width: w, height: h, flexShrink: 0,
          background: value ? 'var(--accent)' : 'var(--ink-5)',
          borderRadius: 'var(--radius-full)',
          transition: 'background var(--dur-base) var(--ease-out)',
        }}
        {...rest}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? w - knob - 3 : 3,
          width: knob, height: knob, background: '#fff', borderRadius: '50%',
          boxShadow: 'var(--shadow-sm)',
          transition: 'left var(--dur-base) var(--ease-spring)',
        }} />
      </span>
      {label && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}