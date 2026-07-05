// Notely UI kit — left sidebar (nav, folders, tags).
const { FolderItem, Avatar, Button } = window.NotelyDesignSystem_fd4cb3;

function SidebarSection({ label, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px 6px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{children}</div>
    </div>
  );
}

function Sidebar({ active, onSelect, onNew }) {
  const d = window.NotelyData;
  return (
    <aside style={{
      width: 244, flex: "none", height: "100%", boxSizing: "border-box",
      display: "flex", flexDirection: "column",
      background: "var(--color-surface)", borderRight: "1px solid var(--color-border)",
      padding: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 8px 14px" }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--color-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>N</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em" }}>Notely</span>
        <i data-lucide="chevrons-up-down" style={{ width: 15, height: 15, color: "var(--color-text-tertiary)", marginLeft: "auto" }} />
      </div>

      <Button leadingIcon={<i data-lucide="plus" style={{ width: 16, height: 16 }} />} fullWidth onClick={onNew}>New note</Button>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 1 }}>
        {d.folders.map((f) => (
          <FolderItem key={f.id} name={f.name} icon={f.icon} count={f.count} active={active === f.id} onClick={() => onSelect(f.id)} />
        ))}
      </div>

      <SidebarSection label="Folders">
        {d.myFolders.map((f) => (
          <FolderItem key={f.id} name={f.name} color={f.color} count={f.count} active={active === f.id} onClick={() => onSelect(f.id)} />
        ))}
        <FolderItem name="New folder" icon="plus" />
      </SidebarSection>

      <SidebarSection label="Tags">
        {d.tags.map((t) => (
          <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 14, color: "var(--color-text-secondary)", cursor: "pointer" }}>
            <span style={{ color: "var(--color-text-tertiary)" }}>#</span>{t.label}
          </div>
        ))}
      </SidebarSection>

      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        <FolderItem name="Trash" icon="trash-2" />
        <FolderItem name="Settings" icon="settings" onClick={() => onSelect("settings")} active={active === "settings"} />
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 8px 4px", marginTop: 6, borderTop: "1px solid var(--color-divider)" }}>
          <Avatar name="Maya Chen" size="sm" status="online" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Maya Chen</div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Free plan</div>
          </div>
          <i data-lucide="cloud" style={{ width: 15, height: 15, color: "var(--color-success)" }} />
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
