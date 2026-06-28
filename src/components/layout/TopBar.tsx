import Link from "next/link";

export function TopBar() {
  return (
    <header
      role="banner"
      className="sticky top-0 z-20 flex items-center justify-between border-b"
      style={{
        height: "60px",
        padding: "0 var(--space-6)",
        background: "color-mix(in oklab, var(--paper) 86%, transparent)",
        backdropFilter: "saturate(140%) blur(8px)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <Link href="/" className="inline-flex items-baseline gap-2 no-underline">
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: "var(--weight-extrabold)",
            fontSize: "var(--text-md)",
            letterSpacing: "var(--tracking-tighter)",
            color: "var(--ink-900)",
            textDecoration: "none",
          }}
        >
          Pokédex
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: "var(--weight-medium)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
            color: "var(--paper)",
            background: "var(--ink-900)",
            padding: "2px var(--space-1-5)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          EXPLORER
        </span>
      </Link>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          color: "var(--text-tertiary)",
          letterSpacing: "var(--tracking-wide)",
        }}
      >
        1 025 Pokémon · keyless · no trackers
      </span>
    </header>
  );
}
