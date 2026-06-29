'use client';
import React from 'react';

const SIZES = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-sm)', height: 30, radius: 'var(--radius-sm)', gap: 6 },
  md: { padding: '9px 16px', fontSize: 'var(--text-base)', height: 38, radius: 'var(--radius-md)', gap: 8 },
  lg: { padding: '12px 22px', fontSize: 'var(--text-md)', height: 46, radius: 'var(--radius-md)', gap: 9 },
};

/**
 * Bookshelf primary control. Ballpoint-blue solid is the single
 * strong action per view; everything else is quieter.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  block = false,
  disabled = false,
  type = 'button',
  style,
  children,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;

  const variants = {
    primary: {
      background: 'var(--accent)', color: 'var(--accent-on)',
      border: '1px solid transparent', boxShadow: 'var(--shadow-sm)',
    },
    secondary: {
      background: 'var(--surface-card)', color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-xs)',
    },
    ghost: {
      background: 'transparent', color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
    soft: {
      background: 'var(--accent-soft)', color: 'var(--accent-hover)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'var(--danger)', color: '#fff',
      border: '1px solid transparent', boxShadow: 'var(--shadow-sm)',
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      data-variant={variant}
      className="bs-button"
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : undefined,
        alignItems: 'center', justifyContent: 'center', gap: s.gap,
        fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-semibold)',
        fontSize: s.fontSize, lineHeight: 1, letterSpacing: 'var(--tracking-snug)',
        minHeight: s.height, padding: s.padding, borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        whiteSpace: 'nowrap', userSelect: 'none', ...variants[variant], ...style,
      }}
      {...rest}
    >
      {iconLeft && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{iconRight}</span>}
    </button>
  );
}