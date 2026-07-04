import { t } from "@/lib/i18n";

export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted-foreground xl:px-6">
      <p>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {t("footer.osm")}
        </a>{" "}
        {t("footer.separator")}{" "}
        <a
          href="http://project-osrm.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {t("footer.osrm")}
        </a>
      </p>
    </footer>
  );
}
