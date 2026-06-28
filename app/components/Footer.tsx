import { uk } from "@/lib/i18n/uk";
import { BottomJokes } from "./BottomJokes";

// Footer / contentinfo landmark. Renders deterministic Ukrainian jokes
// (FR-JOKES-01) and Open-Meteo / OpenStreetMap credits (BC-BRAND-02).
export function Footer() {
  return (
    <footer className="relative mt-10 flex flex-wrap items-center justify-between gap-3.5 border-t border-border-subtle bg-bg px-[22px] py-[22px]">
      <BottomJokes />
      <p className="m-0 text-xs text-text-muted">
        {uk.footer.dataPrefix}:{" "}
        <a
          href="https://open-meteo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-link"
        >
          {uk.footer.openMeteo}
        </a>
        {" · "}
        {uk.footer.mapPrefix}:{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-link"
        >
          {uk.footer.osm}
        </a>
      </p>
    </footer>
  );
}
