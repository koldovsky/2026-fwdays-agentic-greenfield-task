'use client';
import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * Select — a calm native dropdown wrapped to match the brand. Sunken
 * field surface, leading icon optional, chevron affordance. Use for the
 * focused-currency picker and short option lists.
 */
export function Select({
  value,
  onChange,
  options = [],
  icon,
  size = 'md',
  disabled = false,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const heights = { md: 'var(--control-h)', lg: 'var(--control-h-lg)' };
  const fs = { md: 'var(--text-sm)', lg: 'var(--text-md)' };
  const iconSize = size === 'lg' ? 20 : 18;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        height: heights[size] || heights.md,
        padding: '0 12px 0 14px',
        background: 'var(--surface-sunken)',
        border: `1px solid ${focus ? 'var(--brand)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focus ? 'var(--focus-ring)' : 'var(--shadow-inset)',
        transition: 'var(--transition-control)',
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={iconSize} style={{ color: focus ? 'var(--brand)' : 'var(--text-muted)' }} />}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          appearance: 'none',
          WebkitAppearance: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--font-sans)',
          fontSize: fs[size] || fs.md,
          fontWeight: 'var(--weight-medium)',
          color: 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        {...rest}
      >
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
      <Icon name="chevrons-up-down" size={16} style={{ color: 'var(--text-faint)', flex: 'none' }} />
    </div>
  );
}