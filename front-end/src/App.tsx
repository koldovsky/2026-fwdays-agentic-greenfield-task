import { useEffect, useState } from 'react'
import { IconButton } from '@ds/components/core/IconButton.jsx'
import { Badge } from '@ds/components/core/Badge.jsx'
import { Slider } from '@ds/components/forms/Slider.jsx'
import { DPad } from '@ds/components/controls/DPad.jsx'
import { AppShortcut } from '@ds/components/controls/AppShortcut.jsx'
import { DeviceListScreen } from './screens/DeviceListScreen.tsx'
import { useDevices } from './data/useDevices.ts'
import { useDeviceSession, type ClientSessionState } from './data/useDeviceSession.ts'
import type { Device } from './data/types.ts'

function sessionToBadgeStatus(
  state: ClientSessionState,
): 'online' | 'offline' | 'connecting' {
  switch (state) {
    case 'Connected':
      return 'online'
    case 'Connecting':
      return 'connecting'
    case 'Offline':
    case 'Disconnected':
    default:
      return 'offline'
  }
}

function RemoteScreen({ device, onBack }: { device: Device; onBack: () => void }) {
  const [volume, setVolume] = useState(38)
  const [muted, setMuted] = useState(false)
  const { state, connect, disconnect } = useDeviceSession(device.udn)

  // On mount: bring the session up. The user opened the remote — that's
  // the intent-to-connect signal per the spec ("On opening a device from
  // the list, call `connect()` immediately").
  useEffect(() => {
    void connect().catch(() => {
      /* silent — error-surfacing owns user-visible failures */
    })
  }, [connect])

  const isConnected = state === 'Connected'
  const disabledStyle = isConnected
    ? undefined
    : { opacity: 0.55, pointerEvents: 'none' as const }

  async function handleBack() {
    try {
      await disconnect()
    } catch {
      /* proceed with navigation even if the disconnect POST fails */
    }
    onBack()
  }

  return (
    <div style={{ minHeight: '100%', padding: '32px 40px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton icon="arrow_back" size="sm" onClick={handleBack} aria-label="Back" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, color: 'var(--fg-1)' }}>{device.name}</div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)' }}>{device.ip}</div>
          </div>
          <Badge status={sessionToBadgeStatus(state)} />
        </div>

        <div
          aria-disabled={!isConnected}
          style={{ display: 'flex', gap: 18, justifyContent: 'space-between', padding: '4px 6px', ...disabledStyle }}
        >
          <AppShortcut icon="live_tv" label="Live TV" />
          <AppShortcut icon="movie" label="Movies" />
          <AppShortcut icon="sports_esports" label="Games" />
          <AppShortcut icon="apps" label="Apps" />
        </div>

        <div
          aria-disabled={!isConnected}
          style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', ...disabledStyle }}
        >
          <DPad size={220} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
          <IconButton icon="keyboard_backspace" aria-label="Back" disabled={!isConnected} />
          <IconButton icon="home" aria-label="Home" disabled={!isConnected} />
          <IconButton icon="menu" aria-label="Menu" disabled={!isConnected} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton
            icon={muted ? 'volume_off' : 'volume_up'}
            active={muted}
            size="sm"
            onClick={() => setMuted((m) => !m)}
            aria-label="Mute"
            disabled={!isConnected}
          />
          <div style={{ flex: 1, ...disabledStyle }} aria-disabled={!isConnected}>
            <Slider value={volume} onChange={setVolume} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
          <IconButton icon="power_settings_new" tone="accent" size="lg" aria-label="Power" disabled={!isConnected} />
        </div>
      </div>
    </div>
  )
}

function App() {
  const [device, setDevice] = useState<Device | null>(null)
  const { devices } = useDevices()

  if (device) return <RemoteScreen device={device} onBack={() => setDevice(null)} />
  return <DeviceListScreen devices={devices} onOpenDevice={setDevice} />
}

export default App
