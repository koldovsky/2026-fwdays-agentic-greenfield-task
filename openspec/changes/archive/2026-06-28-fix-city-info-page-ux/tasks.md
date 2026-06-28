## 1. Clear search bar on load

- [x] 1.1 In `app/components/CitySearch.tsx` line 49, change the `useState` initialiser from `() => searchParams.get("name") ?? ""` to `""`
- [x] 1.2 Remove the `searchParams` import/usage from `CitySearch` if `name` is the only param it reads (keep `useSearchParams` if it reads other params — it does not, so it can be removed entirely from this component)

## 2. Restructure RegionGrid layout

- [x] 2.1 In `app/components/Shell.tsx`, rewrite `RegionGrid` to use a `flex flex-col gap-6` outer wrapper:
  - Search `<div>`: no column span classes; just `aria-label` and `data-slot="search"`
  - Inner grid `<div>`: `grid grid-cols-1 gap-6 md:grid-cols-2`
  - Forecast `<section>`: `rounded-xl border border-border bg-surface p-5 shadow-sm` (no col-span overrides)
  - Map `<section>`: default col (no col-span overrides); include `aria-label` and `data-slot="map"`
- [x] 2.2 Remove the old `md:col-span-2 xl:col-span-*` classes that were on search, forecast, and map (they no longer apply)

## 3. City name heading in ForecastPanel

- [x] 3.1 In `app/components/forecast/ForecastPanel.tsx`, read `const name = searchParams.get("name") ?? ""` alongside the existing `lat` / `lon` reads (move to top of component, before any early-return guards)
- [x] 3.2 In the `return` of the happy-path (after `if (!data) return null` guard), add as the first child:
  ```jsx
  {name && (
    <h2 className="text-lg font-semibold text-text leading-snug">
      {name}
    </h2>
  )}
  ```
- [x] 3.3 In the loading skeleton return (the `status === "loading"` branch), also add a placeholder `<div>` at the top for the heading area so the layout does not jump when data loads:
  ```jsx
  <div className="h-7 w-48 animate-pulse rounded bg-surface-sunken" />
  ```

## 4. Fix hourly chart tooltip and active dot

- [x] 4.1 In `app/components/forecast/HourlyChart.tsx`, add `isAnimationActive={false}` and `activeDot={false}` to the `<Line>` element
- [x] 4.2 Create a `CustomCursor` component inside `HourlyChart.tsx`:
  ```tsx
  function CustomCursor({
    points,
    height,
  }: {
    points?: { x: number; y: number }[];
    height?: number;
  }) {
    if (!points?.length) return null;
    const { x, y } = points[0];
    return (
      <g>
        <line
          x1={x} y1={0} x2={x} y2={height ?? 160}
          stroke="var(--border-strong)"
          strokeWidth={1}
        />
        <circle cx={x} cy={y} r={4} fill="var(--brand)" />
      </g>
    );
  }
  ```
- [x] 4.3 Create a `CustomTooltip` component inside `HourlyChart.tsx`:
  ```tsx
  function CustomTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: { rawLabel: string; temp: number } }[];
  }) {
    if (!active || !payload?.length) return null;
    const { rawLabel, temp } = payload[0].payload;
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          color: "var(--text)",
          padding: "4px 8px",
          whiteSpace: "nowrap",
        }}
      >
        {rawLabel} – {temp}°C
      </div>
    );
  }
  ```
- [x] 4.4 Replace the existing `<Tooltip>` in `HourlyChart` with:
  ```jsx
  <Tooltip
    cursor={<CustomCursor />}
    content={<CustomTooltip />}
  />
  ```
  Remove the old `contentStyle`, `formatter`, `labelFormatter`, and `cursor` props.

## 5. Verification

- [x] 5.1 Load the app on `localhost:3000`, select a city → confirm the search bar is empty on the info page (no pre-fill, no dropdown on load)
- [x] 5.2 Confirm search bar is full-width in its own row above forecast and map
- [x] 5.3 Confirm forecast panel shows the city name at the top (e.g. "Київ")
- [x] 5.4 Hover across the hourly chart → active dot tracks the cursor smoothly without jumping to position 0
- [x] 5.5 Tooltip shows "HH:MM – TT°C" on one line (e.g. "14:00 – 23°C"), not split across two lines
- [x] 5.6 Switch between pinned cities → heading updates to the active city each time
- [x] 5.7 Weekend compare mode still renders without layout issues (compare table is full-width inside the forecast section)
- [x] 5.8 Run `tsc --noEmit`, `eslint`, and `prettier --check` — all pass (NFR-OBS-01)
- [x] 5.9 No console errors or warnings during normal interaction (NFR-OBS-01)
- [x] 5.10 All existing Vitest tests pass (`npm test`)
