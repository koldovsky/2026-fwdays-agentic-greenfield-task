import { useState } from 'react'
import { DeviceListScreen } from './screens/DeviceListScreen.tsx'
import { RemoteScreen } from './screens/RemoteScreen.tsx'
import { useDevices } from './data/useDevices.ts'
import type { Device } from './data/types.ts'

function App() {
  const [device, setDevice] = useState<Device | null>(null)
  const { devices } = useDevices()

  if (device) return <RemoteScreen device={device} onBack={() => setDevice(null)} />
  return <DeviceListScreen devices={devices} onOpenDevice={setDevice} />
}

export default App
