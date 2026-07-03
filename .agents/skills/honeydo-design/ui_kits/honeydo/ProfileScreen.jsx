/* Honeydo — Profile / Settings screen */
function SettingRow({ icon, iconBg, label, trailing, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Ico n={icon} size={17} color="#fff" />
      </span>
      <span style={{ flex: 1, fontSize: 16, color: "var(--text)", fontWeight: 500 }}>{label}</span>
      {trailing}
    </div>
  );
}

function ProfileScreen({ theme, setTheme }) {
  const { Avatar, SegmentedControl, Switch, Button, StreakHive, Card } = window.DS;
  const [reminders, setReminders] = React.useState(true);
  const [goal, setGoal] = React.useState(6);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <LargeTitle>Profile</LargeTitle>
      <ScreenScroll>
        <div style={{ padding: "4px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* User */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar name="Maya Okonkwo" size={64} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-rounded)", color: "var(--text)" }}>Maya Okonkwo</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>maya@honey.do</div>
            </div>
          </div>

          {/* Streak + goal */}
          <Card padding={16}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-rounded)", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>Streak</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontWeight: 800, fontFamily: "var(--font-rounded)" }}>
                <Ico n="flame" size={16} color="var(--accent)" style={{ fill: "var(--accent)" }} /> 5 days
              </span>
            </div>
            <StreakHive filled={5} total={7} current label="Hit your goal 5 days running — keep it warm." />
          </Card>

          {/* Daily goal */}
          <Card padding={0} style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, color: "var(--text)", fontWeight: 500 }}>Daily goal</span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={() => setGoal((g) => Math.max(1, g - 1))} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)", cursor: "pointer", fontSize: 18 }}>−</button>
                <span className="honey-numeric" style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", minWidth: 38, textAlign: "center" }}>{goal}h</span>
                <button onClick={() => setGoal((g) => Math.min(16, g + 1))} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)", cursor: "pointer", fontSize: 18 }}>+</button>
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-muted)", padding: "0 4px 8px" }}>Appearance</div>
            <Card padding={14}>
              <SegmentedControl style={{ display: "flex", width: "100%" }} options={["Light", "Dark", "System"]} value={theme} onChange={setTheme} />
            </Card>
          </div>

          {/* Settings group */}
          <Card padding={0} style={{ overflow: "hidden" }}>
            <SettingRow icon="bell" iconBg="#F5A300" label="Daily reminder" trailing={<Switch checked={reminders} onChange={setReminders} size="sm" />} />
            <SettingRow icon="tag" iconBg="#5B8DEF" label="Manage tags" trailing={<Ico n="chevron-right" size={18} color="var(--text-muted)" />} />
            <SettingRow icon="download" iconBg="#7BC57F" label="Export data" trailing={<Ico n="chevron-right" size={18} color="var(--text-muted)" />} last />
          </Card>

          <Button variant="secondary" block style={{ color: "#E07A5F" }}>Sign out</Button>
          <div style={{ height: 10 }} />
        </div>
      </ScreenScroll>
    </div>
  );
}
Object.assign(window, { ProfileScreen });
