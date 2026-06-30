/* Honeydo — Timer / Home screen (the core loop) */
function TimerScreen({ running, elapsed, description, setDescription, onToggle, today, onContinue }) {
  const { TimerEntry } = window.DS;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <LargeTitle sub="GOOD EVENING, MAYA" trailing={
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-alt)", padding: "6px 12px", borderRadius: 999, border: "1px solid var(--border)" }}>
          <Ico n="flame" size={16} color="var(--accent)" style={{ fill: "var(--accent)" }} />
          <span style={{ fontWeight: 800, fontFamily: "var(--font-rounded)", color: "var(--text)" }}>5</span>
        </div>
      }>Today</LargeTitle>

      <ScreenScroll>
        {/* Start / running control */}
        <div style={{ padding: "4px 20px 8px" }}>
          <div style={{
            position: "relative", overflow: "hidden",
            background: running ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : "var(--surface)",
            border: `1px solid ${running ? "var(--accent-soft)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)",
            boxShadow: running ? "var(--shadow-glow)" : "var(--shadow-2)",
            padding: 20,
            transition: "all var(--dur-base) var(--ease-settle)",
          }}>
            {running && <div className="honey-pulse" style={{
              position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%",
              background: "radial-gradient(circle, var(--running-glow-soft), transparent 70%)",
            }} />}

            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              style={{
                width: "100%", border: "none", outline: "none", background: "transparent",
                fontFamily: "var(--font-text)", fontSize: 18, fontWeight: 600, color: "var(--text)",
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="honey-numeric" style={{
                fontSize: running ? 44 : 40, fontWeight: 700,
                color: running ? "var(--accent)" : "var(--text-muted)",
                fontVariantNumeric: "tabular-nums", letterSpacing: "-.02em",
                transition: "color var(--dur-base)",
              }}>{elapsed}</span>

              <button onClick={onToggle} aria-label={running ? "Stop" : "Start"} style={{
                width: 64, height: 64, borderRadius: "50%", border: "none", cursor: "pointer",
                background: running ? "var(--accent)" : "linear-gradient(160deg, var(--highlight-gold), var(--accent))",
                color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: running ? "var(--shadow-glow)" : "var(--shadow-3)",
                transition: "transform var(--dur-fast) var(--ease-settle)",
              }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
                {running
                  ? <span style={{ width: 22, height: 22, borderRadius: 6, background: "currentColor" }} />
                  : <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
              </button>
            </div>
          </div>
        </div>

        {/* Today group */}
        <div style={{ padding: "12px 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-muted)" }}>Today</span>
          <span className="honey-numeric" style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>6h 12m</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "6px 20px 8px" }}>
          {today.map((e, i) => (
            <TimerEntry key={i} description={e.description} tag={e.tag} tagColor={e.color}
              duration={e.duration} onContinue={() => onContinue(e)} />
          ))}
        </div>
      </ScreenScroll>
    </div>
  );
}
Object.assign(window, { TimerScreen });
