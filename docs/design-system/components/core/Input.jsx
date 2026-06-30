import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * Input — single-line text field. Optional leading icon and a "loading"
 * affordance. Sunken field surface, calm focus ring. `mono` switches the
 * value to tabular mono for amount entry.
 */
export function Input({
  value,
  onChange,
  placeholder,
  icon,
  size = 'md',
  loading = false,
  disabled = false,
  mono = false,
  type = 'text',
  align = 'left',
  suffix,
  style = {},
  inputStyle = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const heights = { md: 'var(--control-h)', lg: 'var(--control-h-lg)' };
  const fs = { md: 'var(--text-sm)', lg: 'var(--text-md)' };
  const iconSize = size === 'lg' ? 20 : 18;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        height: heights[size] || heights.md,
        padding: '0 14px',
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
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
          fontSize: fs[size] || fs.md,
          textAlign: align,
          color: 'var(--text)',
          ...inputStyle,
        }}
        {...rest}
      />
      {suffix && (
        <span style={{ flex: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {suffix}
        </span>
      )}
      {loading && (
        <span
          aria-hidden="true"
          style={{
            width: 14, height: 14, flex: 'none',
            border: '2px solid var(--border-strong)',
            borderTopColor: 'var(--brand)',
            borderRadius: '50%',
            animation: 'hryv-spin 0.7s linear infinite',
          }}
        />
      )}
      <style>{'@keyframes hryv-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
