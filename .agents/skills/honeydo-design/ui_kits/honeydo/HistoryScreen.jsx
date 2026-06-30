/* Honeydo — History screen */
function HistoryScreen() {
  const { TimerEntry, FilterChip } = window.DS;
  const [filter, setFilter] = React.useState("All");

  const tags = [
    { name: "All", dot: null },
    { name: "Design", dot: "#F5A300" },
    { name: "Admin", dot: "#7BC57F" },
    { name: "Meetings", dot: "#5B8DEF" },
    { name: "Personal", dot: "#9B6A9E" },
  ];

  const days = [
    { label: "Today", total: "6h 12m", entries: [
      { description: "Design review — Honeydo", tag: "Design", color: "#F5A300", duration: "1:24:08" },
      { description: "Inbox & standup", tag: "Admin", color: "#7BC57F", duration: "32m" },
      { description: "Roadmap sync", tag: "Meetings", color: "#5B8DEF", duration: "48m" },
    ]},
    { label: "Yesterday", total: "7h 02m", entries: [
      { description: "Prototype build", tag: "Design", color: "#F5A300", duration: "3:10:00" },
      { description: "Reading", tag: "Personal", color: "#9B6A9E", duration: "26m" },
      { description: "1:1 with Sam", tag: "Meetings", color: "#5B8DEF", duration: "30m" },
    ]},
    { label: "Monday, Jun 26", total: "5h 40m", entries: [
      { description: "Email triage", tag: "Admin", color: "#7BC57F", duration: "44m" },
      { description: "Wireframes", tag: "Design", color: "#F5A300", duration: "2:15:00" },
    ]},
  ];

  const match = (e) => filter === "All" || e.tag === filter;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <LargeTitle>History</LargeTitle>

      {/* Tag filter row */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 20px 12px", flex: "none" }}>
        {tags.map((t) => (
          <FilterChip key={t.name} dot={t.dot} selected={filter === t.name} onClick={() => setFilter(t.name)}>
            {t.name}
          </FilterChip>
        ))}
      </div>

      <ScreenScroll>
        {days.map((d, i) => {
          const visible = d.entries.filter(match);
          if (!visible.length) return null;
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ padding: "10px 20px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-muted)" }}>{d.label}</span>
                <span className="honey-numeric" style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{d.total}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 20px" }}>
                {visible.map((e, j) => (
                  <TimerEntry key={j} description={e.description} tag={e.tag} tagColor={e.color} duration={e.duration} />
                ))}
              </div>
            </div>
          );
        })}
      </ScreenScroll>
    </div>
  );
}
Object.assign(window, { HistoryScreen });
