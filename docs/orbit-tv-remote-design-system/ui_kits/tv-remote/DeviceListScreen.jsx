// DeviceListScreen — first page of the app: nearby TVs found on the
// local network, plus "Add a TV" by IP address.
const NS = window.OrbitTVRemoteDesignSystem_08e5b7;

const SAMPLE_DEVICES = [
  { id: 1, name: 'Living Room', model: 'OrbitCast X1', ip: '192.168.1.42', status: 'online' },
  { id: 2, name: 'Bedroom', model: 'OrbitCast S', ip: '192.168.1.58', status: 'online' },
  { id: 3, name: 'Kitchen', model: 'OrbitCast X1', ip: '192.168.1.61', status: 'connecting' },
  { id: 4, name: 'Guest Room', model: 'OrbitCast Mini', ip: '192.168.1.77', status: 'offline' },
];

function DeviceListScreen({ dark, onToggleDark, onOpenRemote }) {
  const { Button, DeviceCard, Modal, Input } = NS;
  const [modalOpen, setModalOpen] = React.useState(false);
  const [ip, setIp] = React.useState('');
  const [devices, setDevices] = React.useState(SAMPLE_DEVICES);

  function addDevice() {
    if (!ip.trim()) return;
    setDevices((d) => [...d, { id: Date.now(), name: 'New TV', model: 'Unknown model', ip, status: 'connecting' }]);
    setIp('');
    setModalOpen(false);
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--base-100)', padding: '40px 48px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 'var(--text-caption)', letterSpacing: 'var(--tracking-overline)', textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 6 }}>
              Local network
            </div>
            <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', fontWeight: 800, color: 'var(--fg-1)' }}>Your TVs</h1>
          </div>
          <div
            onClick={onToggleDark}
            title="Toggle theme"
            style={{
              width: 48, height: 48, borderRadius: '50%', background: 'var(--base-100)',
              boxShadow: 'var(--nm-raised-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--fg-2)', flexShrink: 0,
            }}
          >
            <span className="material-symbols-rounded">{dark ? 'dark_mode' : 'light_mode'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {devices.map((d) => (
            <DeviceCard key={d.id} name={d.name} model={d.model} ip={d.ip} status={d.status} onClick={() => onOpenRemote(d)} />
          ))}
        </div>

        <Button variant="primary" icon="add" onClick={() => setModalOpen(true)}>Add a TV</Button>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add a TV"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={addDevice}>Connect</Button>
            </>
          }
        >
          <p style={{ margin: '0 0 4px', fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)', lineHeight: 'var(--leading-relaxed)' }}>
            Enter the IP address shown in your TV's network settings.
          </p>
          <Input label="IP Address" icon="lan" placeholder="192.168.1.42" value={ip} onChange={setIp} />
        </Modal>
      </div>
    </div>
  );
}

window.DeviceListScreen = DeviceListScreen;
