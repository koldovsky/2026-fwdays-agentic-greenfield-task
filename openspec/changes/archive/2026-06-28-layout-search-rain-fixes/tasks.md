## 1. Container Width

- [x] 1.1 In `app/components/Shell.tsx`, replace `max-w-[1240px]` with `max-w-screen-2xl` on the `<main>` element

## 2. Two-Row Two-Column Layout

- [x] 2.1 In `app/components/Shell.tsx`, add a CSS custom property `--top-bar-h` or confirm the existing `TopBar` height (expected: `h-14` = 56 px); set a token or comment documenting the measured value
- [x] 2.2 In `Shell.tsx`, when `hasActiveLocation` is true, wrap `<main>` to constrain its height to `calc(100dvh - <topbar-height>)` with `overflow-hidden` so no vertical scroll appears
- [x] 2.3 In the `RegionGrid` component (`Shell.tsx`), change the outer wrapper from `flex flex-col gap-6` to `flex flex-col gap-4 h-full`
- [x] 2.4 In `RegionGrid`, replace the sibling forecast `<section>` and map `<section>` with a single grid wrapper: `<div className="grid grid-cols-[70%_30%] gap-4 min-h-0 flex-1">` containing both sections
- [x] 2.5 Add `h-full` to the forecast `<section>` inside the grid so it fills the row height
- [x] 2.6 Add `h-full min-h-[300px]` to the map `<section>` so the Leaflet container has a concrete height to render into

## 3. Search Bar Reset After City Selection

- [x] 3.1 In `app/components/CitySearch.tsx`, in the `select` callback, change `setQuery(result.name)` to `setQuery("")` so the input is cleared when a city is chosen
- [x] 3.2 Verify that `setSuggestions([])` and `setIsOpen(false)` are still present in the same `select` callback (they should already be there — no addition needed, just confirm)

## 4. Rain Animation Fix

- [x] 4.1 In `app/globals.css`, replace the `.bg-anim-rain-particles` rule: change the `repeating-linear-gradient` angle from `173deg` to `180deg` (pure vertical) and change `background-size` from `38px 38px` to a rectangular tile (e.g. `20px 40px`) that produces vertical streaks without diagonal banding
- [x] 4.2 Optionally add a second gradient layer inside `.bg-anim-rain-particles` at a different tile size and horizontal offset (e.g. `33px 55px, offset 10px`) to break up the regular comb pattern and add visual depth
- [x] 4.3 Confirm the `@keyframes anim-rain` animation moves `background-position` downward (positive Y direction in the `to` keyframe) and adjust if needed
- [x] 4.4 Confirm the `@media (prefers-reduced-motion: reduce)` block in `globals.css` still targets `.bg-anim-rain-particles` and disables its animation

## 5. Quality Gate & Verification

- [x] 5.1 Run `npx tsc --noEmit` and fix any TypeScript errors introduced by the layout changes
- [x] 5.2 Run `npx eslint app/components/Shell.tsx app/components/CitySearch.tsx app/globals.css` and resolve any lint errors
- [x] 5.3 Run `npx prettier --check app/components/Shell.tsx app/components/CitySearch.tsx app/globals.css` and auto-fix with `--write` if needed
- [x] 5.4 Run `npx vitest run` and confirm all 56 existing tests still pass (no regressions)
- [x] 5.5 Start the dev server and open the app in the browser; select a city and confirm: search bar clears, info+map appear side by side with no vertical scroll, rain gradient background shows vertical-falling streaks (test with a city that currently reports rain, or temporarily override `weatherCode` to a rain code)
