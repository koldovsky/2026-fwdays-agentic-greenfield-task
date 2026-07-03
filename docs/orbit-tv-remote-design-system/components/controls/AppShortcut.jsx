import React from 'react';

/**
 * AppShortcut — a square icon tile for the smart-TV app shortcuts row
 * (Netflix, YouTube, etc. — represented generically here since no brand
 * app icons were supplied). Raised tile, subtle press-to-inset feedback.
 */
export function AppShortcut({ icon, label, onClick, color }) {
  const [pressed, setPressed] = React.useState(false);
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: 72,
      }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--base-100)',
          boxShadow: pressed ? 'var(--nm-inset-sm)' : 'var(--nm-raised-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'box-shadow 0.12s ease',
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 26, color: color || 'var(--fg-2)' }}>
          {icon}
        </span>
      </span>
      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-2)', fontWeight: 'var(--weight-medium)' }}>
        {label}
      </span>
    </button>
  );
}
