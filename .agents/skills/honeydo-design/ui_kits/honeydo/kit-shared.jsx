/* Honeydo UI kit — shared frame, status bar, headers, helpers.
   Exposes everything on window for the sibling screen scripts. */

const DS = window.HoneydoDesignSystem_cfe9be;
const Ico = ({ n, size = 22, color, style }) =>
  React.createElement("i", { "data-lucide": n, style: { width: size, height: size, color, display: "inline-flex", ...style } });

/* iOS status bar */
function StatusBar({ dark }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", height: 50, paddingTop: 6, flex: "none",
      color: "var(--text)", fontFamily: "var(--font-rounded)",
    }}>
      <span style={{ fontWeight: 700, fontSize: 15 }}>9:41</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Ico n="signal" size={16} />
        <Ico n="wifi" size={16} />
        <Ico n="battery-full" size={18} />
      </span>
    </div>
  );
}

/* Large iOS title with optional trailing node */
function LargeTitle({ children, trailing, sub }) {
  return (
    <div style={{ padding: "6px 20px 10px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <div>
        {sub && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", letterSpacing: ".02em", marginBottom: 2 }}>{sub}</div>}
        <h1 style={{ fontSize: "var(--text-large-title)", fontWeight: 800, color: "var(--text)", letterSpacing: "-.01em" }}>{children}</h1>
      </div>
      {trailing}
    </div>
  );
}

/* The phone shell. Sets the theme scope; chrome (notch + home indicator)
   sits outside the scrollable screen area. */
function PhoneFrame({ theme, children, statusBar = true }) {
  return (
    <div data-theme={theme} style={{
      position: "relative",
      width: 390, height: 844,
      background: "var(--bg)",
      borderRadius: 54,
      boxShadow: "0 40px 90px rgba(20,12,0,.5), 0 0 0 12px #0c0a08, 0 0 0 13px #2a2622",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-text)",
    }}>
      {/* Dynamic Island */}
      <div style={{
        position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
        width: 124, height: 36, background: "#0a0807", borderRadius: 20, zIndex: 50,
      }} />
      {statusBar && <StatusBar />}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

/* A vertically scrolling screen body with bottom inset for the tab bar. */
function ScreenScroll({ children, pad = true, style }) {
  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch",
      paddingBottom: 16, ...style,
    }}>
      {children}
    </div>
  );
}

Object.assign(window, { DS, Ico, StatusBar, LargeTitle, PhoneFrame, ScreenScroll });
