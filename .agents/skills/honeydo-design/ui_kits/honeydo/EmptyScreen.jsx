/* Honeydo — First-run empty state */
function EmptyScreen({ onStart }) {
  const { Button } = window.DS;
  return (
    <div className="honey-comb-bg" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" }}>
      <div style={{ position: "relative", marginBottom: 28 }}>
        {/* Honey jar — empty, waiting to fill */}
        <div style={{
          width: 132, height: 132, borderRadius: "50%",
          background: "radial-gradient(circle at 50% 35%, var(--accent-faint), transparent 70%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 92, height: 92, borderRadius: "var(--radius-icon)",
            background: "linear-gradient(160deg, var(--highlight-gold), var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-glow)",
          }}>
            <Ico n="hexagon" size={48} color="#2A1B05" style={{ fill: "#2A1B05" }} />
          </div>
        </div>
      </div>

      <h1 style={{ fontSize: 27, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
        Your hive is empty
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.5, maxWidth: 280, marginBottom: 28 }}>
        Start a timer with a quick note about what you're doing. Stop it when you switch. That's the whole thing.
      </p>

      <Button variant="primary" size="lg" onClick={onStart} leadingIcon={<Ico n="play" size={20} style={{ fill: "currentColor" }} />}>
        Start your first entry
      </Button>

      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 18, display: "flex", alignItems: "center", gap: 6 }}>
        <Ico n="sparkles" size={14} color="var(--accent)" /> Tip: you can start from your Home Screen too
      </p>
    </div>
  );
}
Object.assign(window, { EmptyScreen });
