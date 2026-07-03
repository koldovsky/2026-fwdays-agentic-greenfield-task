import React from 'react';

/**
 * Toggle — neumorphic on/off switch. Track is inset; thumb is a small
 * raised circle that slides and picks up the accent color when on.
 * Used for the light/dark theme switch and other binary settings.
 */
export function Toggle({ checked = false, onChange, disabled = false, label }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 52,
          height: 30,
          borderRadius: 'var(--radius-full)',
          background: 'var(--base-100)',
          boxShadow: 'var(--nm-inset-sm)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 25 : 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: checked
              ? 'linear-gradient(145deg, var(--accent), var(--accent-strong))'
              : 'var(--base-100)',
            boxShadow: 'var(--nm-raised-sm)',
            transition: 'left 0.18s ease, background 0.18s ease',
          }}
        />
      </span>
      {label && <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)' }}>{label}</span>}
    </label>
  );
}
