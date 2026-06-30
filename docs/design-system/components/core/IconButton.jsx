import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * IconButton — a square, icon-only control. Requires `label` for a11y.
 * Variants: outline (bordered surface), soft (green tint), ghost.
 */
export function IconButton({
  icon,
  label,
  variant = 'outline',
  size = 'md',
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const sizes = {
    sm: { d: 'var(--control-h-sm)', icon: 16 },
    md: { d: 'var(--control-h)', icon: 18 },
    lg: { d: 'var(--control-h-lg)', icon: 20 },
  };
  const s = sizes[size] || sizes.md;

  const palette = {
    outline: {
      bg: hover ? 'var(--surface-hover)' : 'var(--surface)',
      fg: 'var(--text-secondary)',
      border: 'var(--border-strong)',
    },
    soft: {
      bg: hover ? 'var(--brand-soft-hover)' : 'var(--brand-soft)',
      fg: 'var(--brand)',
      border: 'var(--brand-border)',
    },
    ghost: {
      bg: hover ? 'var(--surface-hover)' : 'transparent',
      fg: 'var(--text-secondary)',
      border: 'transparent',
    },
  };
  const p = palette[variant] || palette.outline;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s.d,
        height: s.d,
        flex: 'none',
        color: p.fg,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: active && !disabled ? 'scale(0.94)' : 'none',
        transition: 'var(--transition-control)',
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={s.icon} />
    </button>
  );
}
