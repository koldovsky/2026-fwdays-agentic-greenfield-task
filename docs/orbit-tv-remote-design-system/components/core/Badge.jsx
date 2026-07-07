import React from 'react';

const map = {
  online: { color: 'var(--online)', wash: 'var(--online-wash)', label: 'Online', dot: true },
  offline: { color: 'var(--fg-3)', wash: 'transparent', label: 'Offline', dot: true },
  connecting: { color: 'var(--connecting)', wash: 'transparent', label: 'Connecting…', dot: true },
};

/**
 * Badge — small status pill, primarily used to show a TV's connection
 * state in the device list. Dot + label, no border, tinted wash background.
 */
export function Badge({ status = 'online', children, style }) {
  const cfg = map[status] || map.online;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 8px',
        borderRadius: 'var(--radius-full)',
        background: cfg.wash,
        color: cfg.color,
        fontSize: 'var(--text-caption)',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {children || cfg.label}
    </span>
  );
}
