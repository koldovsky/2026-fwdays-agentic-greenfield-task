import React from 'react';
import { Card } from './Card.jsx';
import { Badge } from './Badge.jsx';

/**
 * DeviceCard — one row in the TV list: a neumorphic raised tile icon,
 * name + model/IP metadata, and a status Badge. The whole row is a Card
 * with a hover lift, tappable to open the remote for that TV.
 */
export function DeviceCard({ name, model, ip, status = 'online', onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <Card
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-5)',
        cursor: 'pointer',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: hover ? 'var(--nm-raised-lg)' : 'var(--nm-raised-md)',
      }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ display: 'contents' }}
      >
        <span
          style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-md)',
            background: 'var(--base-100)',
            boxShadow: 'var(--nm-inset-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 26, color: status === 'online' ? 'var(--accent)' : 'var(--fg-3)' }}>
            tv
          </span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-body-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--fg-1)' }}>
            {name}
          </div>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)', marginTop: 2 }}>
            {model} · {ip}
          </div>
        </div>
        <Badge status={status} />
        <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--fg-3)' }}>chevron_right</span>
      </div>
    </Card>
  );
}
