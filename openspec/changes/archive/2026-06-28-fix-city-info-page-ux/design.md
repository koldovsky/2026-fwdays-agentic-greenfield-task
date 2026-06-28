## Context

`RegionGrid` in `Shell.tsx` is a CSS Grid with `grid-cols-1 / md:grid-cols-2 / xl:grid-cols-3`. The search `<div>` carries `md:col-span-2 xl:col-span-1`; the forecast `<section>` carries `md:col-span-2 xl:col-span-2`; the map `<section>` carries `md:col-span-2 xl:col-span-3` (always full-width). The query leak comes from `CitySearch` reading `searchParams.get("name")` as the initial state value.

`ForecastPanel` already reads `lat` and `lon` from `useSearchParams`; reading `name` from the same hook is zero-cost.

`HourlyChart` uses Recharts `<LineChart>`. The activeDot mispositioning is a known Recharts 3 behaviour when `dot={false}` is combined with a default activeDot object — the dot renders at index 0 on mount and does not re-sync until the React reconciler catches up, producing a jump. The fix is (a) `isAnimationActive={false}` on `<Line>` so there is no animated sweep that delays the first render, and (b) a custom tooltip component that draws the dot itself at `cx/cy` taken from the first `payload` entry — bypassing the built-in activeDot entirely. The built-in `activeDot` is set to `false` to suppress the buggy default.

## Goals / Non-Goals

**Goals:**
- Empty search bar on every hard load of the active-location page.
- Search bar full-width, above the forecast + map region.
- Forecast panel: city name in `<h2>` using `--text` (primary) token, one font-size step above body.
- Chart tooltip: single line, "HH:MM – TT°C", font-mono, inside the existing content-style box; dot at exact cursor-nearest data point.

**Non-Goals:**
- Saving last-visited city name across sessions.
- Changing search debounce, pin, or navigation logic.
- Altering weekend-compare table layout.

## Decisions

### 1. Clear search bar on load

**Decision:** Change line 49 of `CitySearch.tsx`:
```ts
// before
const [query, setQuery] = useState(() => searchParams.get("name") ?? "");
// after
const [query, setQuery] = useState("");
```

The `name` URL param is used by `Shell` / `ForecastPanel` for display — `CitySearch` does not need it. After a user selects a result, `select()` already calls `setQuery(result.name)`, so the bar correctly shows the chosen city until the user clears it or navigates away.

**Alternatives considered:** Resetting state inside a `useEffect` on mount — unnecessary indirection; the simplest fix is the correct one.

---

### 2. Search bar in its own row

**Decision:** Replace `RegionGrid`'s single `<div className="grid ...">` with a `<div className="flex flex-col gap-6">` wrapper. Inside, place the search `<div>` (no column classes needed) then a nested grid `<div className="grid grid-cols-1 gap-6 md:grid-cols-2">` containing the forecast section (`md:col-span-1`) and the map section (`md:col-span-1`). On xl screens both columns are roughly equal width. The `xl:col-span-*` overrides from the old three-column grid are dropped.

```jsx
<div className="flex flex-col gap-6">
  {/* full-width search row */}
  <div aria-label={uk.regions.search} data-slot="search">
    <Suspense fallback={…}>
      <CitySearch />
    </Suspense>
  </div>

  {/* two-column grid on md+ */}
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    <section aria-label={uk.regions.forecast} data-slot="forecast"
      className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <Suspense fallback={…}>
        <ForecastRegionClient />
      </Suspense>
    </section>

    <section aria-label={uk.regions.map} data-slot="map">
      <Map lat={location.lat} lon={location.lon} name={location.name} />
    </section>
  </div>
</div>
```

On mobile both sections stack. On md+ they share the row 50/50. This is a clean improvement without adding complexity.

**Rationale:** The previous three-column layout tried to put search, forecast, and map on the same row at xl, but this left the search column visually orphaned. Separating concerns into "search row" + "content grid" reflects actual hierarchy.

---

### 3. City name heading in ForecastPanel

**Decision:** Inside `ForecastPanel`, read `const name = searchParams.get("name") ?? ""`. When `name` is truthy, render a `<h2>` as the first child of the returned JSX (before the `WeekendComfortBanner`):

```jsx
{name && (
  <h2 className="text-lg font-semibold text-text leading-snug">
    {name}
  </h2>
)}
```

Use `text-lg` (maps to `--font-size-lg` in the design system), `font-semibold`, `text-text` (primary text token). No extra wrapper needed.

The heading also appears during the loading skeleton; extract the name read to before the early-return guards so it is always available.

**Accessibility:** `<h2>` inside the `<section aria-label={uk.regions.forecast}>` gives screen-reader users an explicit city label for the section (NFR-A11Y-01).

---

### 4. Hourly chart — dot fix + tooltip reformat

**Decision A — disable animation, suppress default activeDot:**

```jsx
<Line
  type="monotone"
  dataKey="temp"
  stroke="var(--brand)"
  strokeWidth={2}
  dot={false}
  activeDot={false}           // suppress the misbehaving built-in dot
  isAnimationActive={false}   // eliminate sweep-in jitter
/>
```

**Decision B — custom tooltip with inline dot:**

Replace the `<Tooltip>` props with a `content={<CustomTooltip />}` render. `CustomTooltip` receives `{ active, payload, coordinate }` from Recharts. When active and payload is non-empty, it:
1. Renders an `<svg>` circle at `coordinate.x / coordinate.y` (absolute-positioned over the chart via a shared-ref approach or a custom `Cursor` component).
2. Renders the label box with "HH:MM – TT°C" as a single `<span>` in font-mono.

Because placing an SVG dot from the tooltip component requires knowing the chart bounding box, a simpler equivalent is to use a **custom `Cursor`** component:

```jsx
<Tooltip
  cursor={<CustomCursor />}   // renders vertical line + dot
  content={<CustomTooltip />} // renders label box
  ...
/>
```

`CustomCursor` receives `{ points, width, height }` from Recharts and draws:
- A `<line>` from top to bottom at `points[0].x`
- A `<circle>` at `points[0].x / points[0].y` with `r=4`, `fill=var(--brand)`

`CustomTooltip` renders:
```jsx
<div style={{ ...contentStyle }}>
  <span>{rawLabel} – {temp}°C</span>
</div>
```
Single line, no label/value split. Use `white-space: nowrap` to prevent wrapping.

**Rationale:** Recharts 3.x passes correct `points` to a custom `Cursor` synchronously without the one-tick delay that breaks the built-in `activeDot`. The custom tooltip removes the framework-controlled two-row format.

## Risks / Trade-offs

- **Recharts CustomCursor typing:** `CustomCursor` props are loosely typed in Recharts 3; cast with `as React.FC<{ points?: { x: number; y: number }[] }>` or use a type assertion at the call site.
- **Layout shift:** removing `xl:col-span-*` classes could affect very wide viewports. The new `md:grid-cols-2` gives 50/50 split — verify map does not become too narrow to be useful (map has a min-height).
- **Hydration:** `ForecastPanel` is a client component; reading `searchParams` is already safe.
