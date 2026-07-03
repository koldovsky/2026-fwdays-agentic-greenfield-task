import { useState } from 'react'
import { Button } from '@ds/components/core/Button.jsx'
import { DeviceCard } from '@ds/components/core/DeviceCard.jsx'
import { IconButton } from '@ds/components/core/IconButton.jsx'
import { Badge } from '@ds/components/core/Badge.jsx'
import { Input } from '@ds/components/forms/Input.jsx'
import { Slider } from '@ds/components/forms/Slider.jsx'
import { DPad } from '@ds/components/controls/DPad.jsx'
import { AppShortcut } from '@ds/components/controls/AppShortcut.jsx'
import { Modal } from '@ds/components/feedback/Modal.jsx'

type Status = 'online' | 'offline' | 'connecting'
type Device = { id: string; name: string; model: string; ip: string; status: Status }

const SAMPLE_DEVICES: Device[] = [
  { id: '1', name: 'Living Room', model: 'Samsung QN90A', ip: '192.168.1.42', status: 'online' },
  { id: '2', name: 'Bedroom', model: 'Samsung Q60B', ip: '192.168.1.58', status: 'online' },
  { id: '3', name: 'Kitchen', model: 'Samsung The Frame', ip: '192.168.1.61', status: 'connecting' },
  { id: '4', name: 'Guest Room', model: 'Samsung Crystal UHD', ip: '192.168.1.77', status: 'offline' },
]

function DeviceListScreen({ onOpenDevice }: { onOpenDevice: (d: Device) => void }) {
  const [devices, setDevices] = useState<Device[]>(SAMPLE_DEVICES)
  const [modalOpen, setModalOpen] = useState(false)
  const [ip, setIp] = useState('')

  function addDevice() {
    const value = ip.trim()
    if (!value) return
    setDevices((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: 'New TV', model: 'Unknown model', ip: value, status: 'connecting' },
    ])
    setIp('')
    setModalOpen(false)
  }

  return (
    <div style={{ minHeight: '100%', padding: '40px 48px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
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
          <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', fontWeight: 800, color: 'var(--fg-1)' }}>Your TVs</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              name={d.name}
              model={d.model}
              ip={d.ip}
              status={d.status}
              onClick={() => onOpenDevice(d)}
            />
          ))}
        </div>

        <Button variant="primary" icon="add" onClick={() => setModalOpen(true)}>
          Add a TV
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add a TV by IP"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addDevice}>
              Connect
            </Button>
          </>
        }
      >
        <Input
          value={ip}
          onChange={setIp}
          placeholder="192.168.1.100"
          icon="lan"
          label="IP address"
        />
      </Modal>
    </div>
  )
}

function RemoteScreen({ device, onBack }: { device: Device; onBack: () => void }) {
  const [volume, setVolume] = useState(38)
  const [muted, setMuted] = useState(false)

  return (
    <div style={{ minHeight: '100%', padding: '32px 40px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton icon="arrow_back" size="sm" onClick={onBack} aria-label="Back" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, color: 'var(--fg-1)' }}>{device.name}</div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)' }}>{device.ip}</div>
          </div>
          <Badge status={device.status} />
        </div>

        <div style={{ display: 'flex', gap: 18, justifyContent: 'space-between', padding: '4px 6px' }}>
          <AppShortcut icon="live_tv" label="Live TV" />
          <AppShortcut icon="movie" label="Movies" />
          <AppShortcut icon="sports_esports" label="Games" />
          <AppShortcut icon="apps" label="Apps" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <DPad size={220} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
          <IconButton icon="keyboard_backspace" aria-label="Back" />
          <IconButton icon="home" aria-label="Home" />
          <IconButton icon="menu" aria-label="Menu" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton
            icon={muted ? 'volume_off' : 'volume_up'}
            active={muted}
            size="sm"
            onClick={() => setMuted((m) => !m)}
            aria-label="Mute"
          />
          <Slider value={volume} onChange={setVolume} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
          <IconButton icon="power_settings_new" tone="accent" size="lg" aria-label="Power" />
        </div>
      </div>
    </div>
  )
}

function App() {
  const [device, setDevice] = useState<Device | null>(null)
  if (device) return <RemoteScreen device={device} onBack={() => setDevice(null)} />
  return <DeviceListScreen onOpenDevice={setDevice} />
}

export default App
