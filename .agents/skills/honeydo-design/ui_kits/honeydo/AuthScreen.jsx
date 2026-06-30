/* Honeydo — Auth / Sign in screen */
function AuthScreen({ onSignIn }) {
  const { Button, Input } = window.DS;
  const [email, setEmail] = React.useState("maya@honey.do");
  const [pw, setPw] = React.useState("buzzbuzz");

  return (
    <div className="honey-comb-bg" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px", overflowY: "auto" }}>
      <div style={{ flex: "0 0 auto", textAlign: "center", paddingTop: 48, paddingBottom: 28 }}>
        <div style={{
          width: 78, height: 78, margin: "0 auto 18px", borderRadius: "var(--radius-icon)",
          background: "linear-gradient(160deg, var(--highlight-gold), var(--accent-pressed))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-3)",
        }}>
          <Ico n="hexagon" size={40} color="#2A1B05" style={{ fill: "#2A1B05" }} />
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text)" }}>Welcome to Honeydo</h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 16 }}>
          Track your day, one sweet entry at a time.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          leadingIcon={<Ico n="mail" size={18} />} placeholder="you@honey.do" />
        <Input label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          leadingIcon={<Ico n="lock" size={18} />} placeholder="••••••••" />

        <div style={{ textAlign: "right", marginTop: -4 }}>
          <a style={{ color: "var(--accent)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Forgot password?</a>
        </div>

        <Button variant="primary" size="lg" block onClick={onSignIn} style={{ marginTop: 4 }}>Sign in</Button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0" }}>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>or</span>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <button onClick={onSignIn} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          height: 52, borderRadius: "var(--radius-pill)", cursor: "pointer",
          background: "var(--surface)", border: "1px solid var(--border)",
          color: "var(--text)", fontFamily: "var(--font-rounded)", fontWeight: 700, fontSize: 16,
        }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="" />
          Continue with Google
        </button>
      </div>

      <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginTop: 24, paddingBottom: 20 }}>
        New here? <span style={{ color: "var(--accent)", fontWeight: 700 }}>Create an account</span>
      </p>
    </div>
  );
}
Object.assign(window, { AuthScreen });
