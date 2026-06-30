/* Honeydo — Stats screen */
function StatBlock({ value, unit, label, accent }) {
  return (
    <div style={{ flex: 1, padding: "14px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
      <div className="honey-numeric" style={{ fontSize: 26, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text)", letterSpacing: "-.02em" }}>
        {value}<span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 700 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function TopTag({ name, color, hours, pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flex: "none" }} />
      <span style={{ width: 90, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{name}</span>
      <span style={{ flex: 1, height: 8, background: "var(--surface-alt)", borderRadius: 4, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: pct, background: color, borderRadius: 4 }} />
      </span>
      <span className="honey-numeric" style={{ width: 48, textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>{hours}</span>
    </div>
  );
}

function StatsScreen() {
  const { WeekChart, InsightCard, Card } = window.DS;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <LargeTitle>Stats</LargeTitle>
      <ScreenScroll>
        <div style={{ padding: "4px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ display: "flex", gap: 10 }}>
            <StatBlock value="6.2" unit="h" label="Today" accent />
            <StatBlock value="31" unit="h" label="This week" />
            <StatBlock value="412" unit="h" label="All time" />
          </div>

          <Card padding={16}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontFamily: "var(--font-rounded)", fontWeight: 700, fontSize: 17, color: "var(--text)" }}>This week</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Goal 6h / day</span>
            </div>
            <WeekChart goal={6} data={[
              { label: "M", hours: 4 }, { label: "T", hours: 7 }, { label: "W", hours: 5.5 },
              { label: "T", hours: 6 }, { label: "F", hours: 3 }, { label: "S", hours: 1 },
              { label: "S", hours: 6.2, today: true },
            ]} />
          </Card>

          <InsightCard>You're 1h ahead of your usual Tuesday pace — three deep-work blocks already. Sweet.</InsightCard>

          <Card padding={16}>
            <span style={{ fontFamily: "var(--font-rounded)", fontWeight: 700, fontSize: 17, color: "var(--text)", display: "block", marginBottom: 6 }}>Top tags</span>
            <TopTag name="Design" color="#F5A300" hours="14h" pct="78%" />
            <TopTag name="Meetings" color="#5B8DEF" hours="8h" pct="46%" />
            <TopTag name="Admin" color="#7BC57F" hours="5h" pct="28%" />
            <TopTag name="Personal" color="#9B6A9E" hours="4h" pct="22%" />
          </Card>

        </div>
      </ScreenScroll>
    </div>
  );
}
Object.assign(window, { StatsScreen });
