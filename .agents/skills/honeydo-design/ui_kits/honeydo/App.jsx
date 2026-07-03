/* Honeydo UI kit — interactive app shell */
function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function HoneydoApp() {
  const { TabBar } = window.DS;
  const [view, setView] = React.useState("auth"); // auth | empty | app
  const [tab, setTab] = React.useState("timer");
  const [theme, setTheme] = React.useState("Dark");
  const themeAttr = theme.toLowerCase() === "light" ? "light" : "dark";

  const [running, setRunning] = React.useState(false);
  const [secs, setSecs] = React.useState(0);
  const [desc, setDesc] = React.useState("Design review — Honeydo");

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const today = [
    { description: "Inbox & standup", tag: "Admin", color: "#7BC57F", duration: "32m" },
    { description: "Roadmap sync", tag: "Meetings", color: "#5B8DEF", duration: "48m" },
    { description: "Wireframes", tag: "Design", color: "#F5A300", duration: "2:15:00" },
  ];

  const toggle = () => {
    if (!running) { setSecs(0); setRunning(true); }
    else setRunning(false);
  };

  let screen;
  if (view === "auth") screen = <AuthScreen onSignIn={() => setView("empty")} />;
  else if (view === "empty") screen = <EmptyScreen onStart={() => { setView("app"); setTab("timer"); setRunning(true); setSecs(0); }} />;
  else {
    const inner = {
      timer: <TimerScreen running={running} elapsed={fmt(secs)} description={desc} setDescription={setDesc} onToggle={toggle} today={today} onContinue={(e) => { setDesc(e.description); setSecs(0); setRunning(true); }} />,
      history: <HistoryScreen />,
      stats: <StatsScreen />,
      profile: <ProfileScreen theme={theme} setTheme={setTheme} />,
    }[tab];

    screen = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {inner}
        <TabBar value={tab} onChange={setTab} items={[
          { value: "timer", label: "Timer", icon: <i data-lucide="timer"></i> },
          { value: "history", label: "History", icon: <i data-lucide="list"></i> },
          { value: "stats", label: "Stats", icon: <i data-lucide="bar-chart-2"></i> },
          { value: "profile", label: "Profile", icon: <i data-lucide="user"></i> },
        ]} />
      </div>
    );
  }

  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "32px 0 48px" }}>
      {/* Outer chrome — not part of the phone */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,.28)", padding: 4, borderRadius: 999 }}>
          {[["auth", "Sign in"], ["empty", "First run"], ["app", "App"]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={chipBtn(view === v)}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,.28)", padding: 4, borderRadius: 999 }}>
          {["Dark", "Light"].map((t) => (
            <button key={t} onClick={() => setTheme(t)} style={chipBtn(theme === t)}>{t}</button>
          ))}
        </div>
      </div>

      <PhoneFrame theme={themeAttr}>{screen}</PhoneFrame>
    </div>
  );
}

function chipBtn(active) {
  return {
    border: "none", cursor: "pointer", padding: "7px 16px", borderRadius: 999,
    fontFamily: "var(--font-rounded)", fontWeight: 700, fontSize: 14,
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#2A1B05" : "#cdbfa8",
    transition: "all .15s ease",
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(<HoneydoApp />);
requestAnimationFrame(() => window.lucide && window.lucide.createIcons());
