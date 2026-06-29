'use client';
import React from 'react';

const SIZES = { sm: 28, md: 34, lg: 40 };

/**
 * Square icon-only button. Pass a Lucide icon node as children.
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  label,
  active = false,
  disabled = false,
  style,
  children,
  ...rest
}) {
  const d = SIZES[size] || SIZES.md;

  const variants = {
    ghost: { background: active ? 'var(--surface-sunken)' : 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
    solid: { background: 'var(--accent)', color: 'var(--accent-on)', border: '1px solid transparent' },
    outline: { background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' },
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="bs-iconbtn"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: d, height: d, padding: 0, borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
        ...variants[variant], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}