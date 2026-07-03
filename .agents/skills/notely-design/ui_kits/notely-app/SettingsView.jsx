// Notely UI kit — settings screen.
const { Switch, Select, Avatar, Button, Divider } = window.NotelyDesignSystem_fd4cb3;

function Row({ title, desc, control }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{title}</div>
        {desc && <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{desc}</div>}
      </div>
      {control}
    </div>
  );
}

function SettingsView({ dark, onToggleTheme }) {
  return (
    <main style={{ flex: 1, minWidth: 0, height: "100%", overflowY: "auto", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 32px 80px" }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)", margin: "0 0 24px" }}>Settings</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-1)" }}>
          <Avatar name="Maya Chen" size="lg" status="online" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>Maya Chen</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>maya@notely.app · Free plan</div>
          </div>
          <Button variant="secondary" size="sm">Upgrade</Button>
        </div>

        <div style={{ marginTop: 28, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Appearance</div>
        <Row title="Dark theme" desc="Use a darker palette in low light." control={<Switch checked={dark} onChange={onToggleTheme} />} />
        <Divider spacing={0} />
        <Row title="Default view" desc="How notes are laid out on open." control={<div style={{ width: 150 }}><Select value="grid" options={[{ value: "grid", label: "Grid" }, { value: "list", label: "List" }]} /></div>} />

        <div style={{ marginTop: 28, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Sync &amp; backup</div>
        <Row title="Sync across devices" desc="Keep notes up to date everywhere." control={<Switch checked onChange={() => {}} />} />
        <Divider spacing={0} />
        <Row title="Offline mode" desc="Edit without a connection; sync later." control={<Switch checked onChange={() => {}} />} />
      </div>
    </main>
  );
}

window.SettingsView = SettingsView;
