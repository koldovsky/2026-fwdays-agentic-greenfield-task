import { useWsHealth, type WsHealth } from '../data/useWsHealth.ts';

interface Style {
  color: string;
  label: string;
}

const STYLE: Record<WsHealth, Style> = {
  connected: { color: 'var(--online)', label: 'Live' },
  reconnecting: { color: 'var(--connecting)', label: 'Reconnecting…' },
  offline: { color: 'var(--offline)', label: 'Offline' },
};

/**
 * Sub-modal, sub-toast chip that mirrors `/ws` connection health. Rendered
 * in the header of both `DeviceListScreen` and `RemoteScreen`. Visual is
 * a small dot + label — same idiom the DS `Badge` uses for TV status,
 * scoped down to just the pill without the wash background so it reads
 * as ambient rather than a callout.
 */
export function WsHealthChip() {
  const health = useWsHealth();
  const style = STYLE[health];
  return (
    <span
      role="status"
      aria-label={`WebSocket ${health}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 'var(--text-caption)',
        fontWeight: 'var(--weight-semibold)',
        color: style.color,
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: style.color,
          flexShrink: 0,
        }}
      />
      {style.label}
    </span>
  );
}
