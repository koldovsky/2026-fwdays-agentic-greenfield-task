import { Button } from '@ds/components/core/Button.jsx';
import { Card } from '@ds/components/core/Card.jsx';
import { DeviceCard } from '@ds/components/core/DeviceCard.jsx';
import { WsHealthChip } from '../ui/WsHealthChip.tsx';
import type { Device } from '../data/types.ts';

interface DeviceListScreenProps {
  devices: Device[];
  onOpenDevice: (device: Device) => void;
}

export function DeviceListScreen({ devices, onOpenDevice }: DeviceListScreenProps) {
  return (
    <div style={{ minHeight: '100%', padding: '40px 48px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div
              style={{
                fontSize: 'var(--text-caption)',
                letterSpacing: 'var(--tracking-overline)',
                textTransform: 'uppercase',
                color: 'var(--fg-3)',
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Local network
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 'var(--text-h1)',
                fontWeight: 800,
                color: 'var(--fg-1)',
              }}
            >
              Your TVs
            </h1>
          </div>
          <WsHealthChip />
        </div>

        {devices.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              marginBottom: 28,
            }}
          >
            {devices.map((d) => (
              <DeviceCard
                key={d.udn}
                name={d.name}
                {...(d.model ? { model: d.model } : {})}
                ip={d.ip}
                status={d.status}
                onClick={() => onOpenDevice(d)}
              />
            ))}
          </div>
        )}

        {/*
          "Add a TV" is the single primary CTA on this screen. Disabled
          until a manual-add-by-IP FR lands (docs/capabilities.md gap).
          Keeps the "one accent per screen" rule satisfied and reserves
          the slot so the manual-add change is a drop-in.
        */}
        <Button variant="primary" icon="add" disabled>
          Add a TV
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card
      variant="inset"
      padding="var(--space-8) var(--space-6)"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
        textAlign: 'center',
        marginBottom: 28,
      }}
    >
      <span
        className="material-symbols-rounded"
        style={{ fontSize: 48, color: 'var(--fg-3)' }}
        aria-hidden="true"
      >
        tv_off
      </span>
      <div style={{ color: 'var(--fg-1)', fontWeight: 600 }}>
        No TVs found. Make sure your TV is on the same Wi-Fi network.
      </div>
    </Card>
  );
}
