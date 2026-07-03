// RemoteScreen — second page of the app: the actual remote control
// for a paired TV. D-pad, transport/volume, power, and an app shortcuts row.
const NS2 = window.OrbitTVRemoteDesignSystem_08e5b7;

function RemoteScreen({ device, onBack }) {
  const { IconButton, DPad, Slider, Badge, AppShortcut } = NS2;
  const [volume, setVolume] = React.useState(38);
  const [muted, setMuted] = React.useState(false);

  return (
    <div style={{ minHeight: '100%', background: 'var(--base-100)', padding: '32px 40px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton icon="arrow_back" size="sm" onClick={onBack} aria-label="Back" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, color: 'var(--fg-1)' }}>{device?.name || 'Living Room'}</div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)' }}>{device?.ip || '192.168.1.42'}</div>
          </div>
          <Badge status={device?.status || 'online'} />
        </div>

        {/* app shortcuts row */}
        <div style={{ display: 'flex', gap: 18, justifyContent: 'space-between', padding: '4px 6px' }}>
          <AppShortcut icon="live_tv" label="Live TV" />
          <AppShortcut icon="movie" label="Movies" />
          <AppShortcut icon="sports_esports" label="Games" />
          <AppShortcut icon="apps" label="Apps" />
        </div>

        {/* dpad */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <DPad size={220} onDirection={() => {}} onSelect={() => {}} />
        </div>

        {/* transport row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
          <IconButton icon="keyboard_backspace" aria-label="Back" />
          <IconButton icon="home" aria-label="Home" />
          <IconButton icon="menu" aria-label="Menu" />
        </div>

        {/* volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton icon={muted ? 'volume_off' : 'volume_up'} active={muted} size="sm" onClick={() => setMuted((m) => !m)} aria-label="Mute" />
          <Slider value={volume} onChange={setVolume} />
        </div>

        {/* power */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
          <IconButton icon="power_settings_new" tone="accent" size="lg" aria-label="Power" />
        </div>
      </div>
    </div>
  );
}

window.RemoteScreen = RemoteScreen;
