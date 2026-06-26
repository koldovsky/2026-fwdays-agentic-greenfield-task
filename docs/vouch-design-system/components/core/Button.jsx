import React from 'react';

/**
 * Primary interaction control. Supports four visual variants and three sizes.
 * All styling uses CSS custom properties from tokens/colors.css and tokens/spacing.css.
 */
export function Button({
  label,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'opacity 0.12s, transform 0.08s',
    WebkitFontSmoothing: 'antialiased',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  const variants = {
    primary: {
      background: 'var(--color-brand)',
      color: '#fff',
      boxShadow: 'var(--shadow-brand)',
    },
    secondary: {
      background: 'var(--color-surface-card)',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-hairline)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-brand)',
    },
    dark: {
      background: 'var(--color-ink)',
      color: '#fff',
    },
  };

  const sizes = {
    sm: { fontSize: 'var(--text-sm)', padding: '8px 16px', borderRadius: 'var(--radius-sm)' },
    md: { fontSize: 'var(--text-base)', padding: '12px 22px', borderRadius: 'var(--radius-md)' },
    lg: { fontSize: 'var(--text-md)', padding: '14px 28px', borderRadius: '12px' },
  };

  const disabledStyle = disabled
    ? { background: '#eef0f3', color: '#aab2bf', boxShadow: 'none', border: 'none' }
    : {};

  const [pressed, setPressed] = React.useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        ...base,
        ...variants[variant],
        ...sizes[size],
        ...disabledStyle,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
      }}
    >
      {label || children}
    </button>
  );
}
