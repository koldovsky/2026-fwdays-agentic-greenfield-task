export function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        padding: "var(--space-6)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div
        className="flex items-center justify-between w-full mx-auto"
        style={{
          maxWidth: "var(--container-max)",
          fontSize: "var(--text-xs)",
          color: "var(--text-tertiary)",
        }}
      >
        <span>
          Data from{" "}
          <a
            href="https://pokeapi.co"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)" }}
          >
            PokéAPI
          </a>
        </span>
        <span>No accounts · no cookies · no analytics</span>
      </div>
    </footer>
  );
}
