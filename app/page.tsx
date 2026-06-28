import { Shell } from "./components/Shell";

// Надворі home — the app shell (FR-SHELL-01..03). `hasActiveLocation` is
// derived from the ?lat=&lon=&name= URL state set by the `city-search`
// capability (FR-SEARCH-03). When true, the region grid replaces the hero.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lat?: string; lon?: string; name?: string }>;
}) {
  const params = await searchParams;
  const lat = params.lat ? parseFloat(params.lat) : undefined;
  const lon = params.lon ? parseFloat(params.lon) : undefined;
  const name = params.name ?? "";
  const hasActiveLocation = !!(
    lat !== undefined &&
    lon !== undefined &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
  return (
    <Shell
      hasActiveLocation={hasActiveLocation}
      location={hasActiveLocation ? { lat: lat!, lon: lon!, name } : undefined}
    />
  );
}
