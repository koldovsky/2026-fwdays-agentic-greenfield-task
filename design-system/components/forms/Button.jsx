import React from 'react';

export function Button({ variant = 'primary', children, onClick, disabled = false, type = 'button', style = {} }) {
  const base = { border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '15px', padding: '13px 26px', borderRadius: 'var(--radius-md)', transition: 'opacity var(--dur-fast), background var(--dur-fast)', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' };
  const variants = {
    primary:   { background: 'var(--text)', color: 'var(--bg)' },
    accent:    { background: 'var(--accent-primary)', color: '#fff' },
    secondary: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' },
    ghost:     { background: 'transparent', color: 'var(--text-muted)' },
  };
  return React.createElement('button', { type, onClick, disabled, style: { ...base, ...variants[variant], ...style } }, children);
}
