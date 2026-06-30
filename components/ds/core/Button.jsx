'use client';
import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * Button — the brand's primary action control. Composed, lightly rounded,
 * with a gentle press. Variants: primary (treasury green), secondary
 * (green tint), outline, ghost. Sizes: sm / md / lg.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const sizes = {
    sm: { h: 'var(--control-h-sm)', px: '12px', fs: 'var(--text-sm)', icon: 16, gap: '6px' },
    md: { h: 'var(--control-h)', px: '18px', fs: 'var(--text-sm)', icon: 18, gap: '8px' },
    lg: { h: 'var(--control-h-lg)', px: '24px', fs: 'var(--text-md)', icon: 20, gap: '10px' },
  };
  const s = sizes[size] || sizes.md;

  const palette = {
    primary: {
      bg: hover ? 'var(--brand-hover)' : 'var(--brand)',
      fg: 'var(--text-on-brand)',
      border: 'transparent',
      shadow: hover ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
    },
    secondary: {
      bg: hover ? 'var(--brand-soft-hover)' : 'var(--brand-soft)',
      fg: 'var(--brand)',
      border: 'var(--brand-border)',
      shadow: 'none',
    },
    outline: {
      bg: hover ? 'var(--surface-hover)' : 'var(--surface)',
      fg: 'var(--text)',
      border: 'var(--border-strong)',
      shadow: 'none',
    },
    ghost: {
      bg: hover ? 'var(--surface-hover)' : 'transparent',
      fg: 'var(--text-secondary)',
      border: 'transparent',
      shadow: 'none',
    },
  };
  const p = palette[variant] || palette.primary;

  return (
    <button
      type={type}
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
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}`,
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-sans)',
        fontSize: s.fs,
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 1,
        color: p.fg,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: p.shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: active && !disabled ? 'translateY(0.5px) scale(0.99)' : 'none',
        transition: 'var(--transition-control)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {iconLeft && <Icon name={iconLeft} size={s.icon} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}