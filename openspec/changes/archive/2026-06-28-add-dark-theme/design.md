## Context

The design system has had a complete `[data-theme="dark"]` color palette since the first commit (`app/design-system/tokens/colors.css`). DESIGN.md describes the theme as "Full light + dark via `[data-theme="dark"]` on `<html>`. Toggle by swapping the attribute; no toggle UI is wired up yet." NFR-A11Y-02 requires WCAG AA in both themes.

`TopBar.tsx` already renders a **static** `<ThemeIndicator>` that uses CSS to show/hide sun or moon text based on `data-theme` — it was a placeholder. This change promotes it to an interactive icon-button that actually toggles the theme.

`lib/i18n/uk.ts` already has `theme.light` ("Денна тема") and `theme.dark` ("Нічна тема") strings.

## Goals / Non-Goals

**Goals:**

- Apply the user's theme **before first paint** to avoid a flash of wrong theme (FOWT). This is the primary technical challenge; everything else is straightforward.
- Read `prefers-color-scheme` as the initial default when no stored preference exists.
- Persist the user's explicit choice in `localStorage` under the key `nadvori-theme` (`"light"` | `"dark"`).
- Replace the static `ThemeIndicator` in `TopBar.tsx` with an interactive `<ThemeToggle>` icon-button that swaps `html[data-theme]` and saves to `localStorage`.
- Keep `TopBar.tsx` a Server Component — only `ThemeToggle` is a client component.

**Non-Goals:**

- A "system" (auto) mode that tracks live OS changes without a stored preference; detecting `prefers-color-scheme` once on load as the default is sufficient for MVP.
- Animations between themes (the token swap is instant; CSS transitions on individual elements are already handled by the design system).
- Server-side cookie-based theme (would require a middleware or server action; localStorage is sufficient and avoids the complexity).

## Decisions

### 1. FOWT-free inline blocking script

**Decision:** Inject a small inline `<script>` as the first child of `<head>` in `app/layout.tsx`. It reads `localStorage.getItem("nadvori-theme")` and, if absent, reads `window.matchMedia("(prefers-color-scheme: dark)").matches`. It then writes `document.documentElement.setAttribute("data-theme", theme)` synchronously before any paint.

```ts
// Runs synchronously before CSS applies; no import, no closure over React
(function () {
  try {
    var t = localStorage.getItem("nadvori-theme");
    if (!t) t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
  } catch (_) {}
})();
```

**Rationale:** Next.js App Router renders the initial HTML on the server. Without this script, the server always emits `data-theme="light"` (the hardcoded default) and the browser re-renders once React hydrates — visible as a white flash in dark mode. An inline script executes before the CSSOM is built, eliminating the flash. The `try/catch` guards against `localStorage` being unavailable (e.g. private browsing with strict settings).

**Alternatives considered:**

- Cookie + server-side middleware to set `data-theme` in the streamed HTML — correct but adds a middleware layer, a cookie, and complexity. Overkill for MVP.
- CSS-only using `@media (prefers-color-scheme: dark)` without a `data-theme` attribute — would not respect the user's explicit toggle, only OS preference.

---

### 2. ThemeToggle client component

**Decision:** Create `app/components/ThemeToggle.tsx` as a `"use client"` component. It:
1. On mount, reads `document.documentElement.getAttribute("data-theme")` to initialize local state (avoids a second localStorage read; the blocking script already set the attribute correctly).
2. On click, flips the attribute and writes to `localStorage`.
3. Renders a Lucide `Sun` icon in dark mode (click → go light) and a `Moon` icon in light mode (click → go dark), both at 16 px / 1.75 stroke, inside an icon-button styled with design-system tokens.

The button has `aria-label={uk.theme.toggle}` and `aria-pressed` reflecting the current dark state.

**Rationale:** Keeping state in the DOM attribute (`html[data-theme]`) as the single source of truth avoids a React context or Zustand store just for a two-value flag. The blocking script initializes it; the client component reads and mutates it.

**Alternatives considered:**

- A React context / Zustand store for theme state — unnecessary indirection; the DOM attribute already is shared mutable state between CSS and JS.
- `next-themes` library — adds a dependency; the pattern it implements is exactly what this change does, at ~30 lines of code.

---

### 3. Replace ThemeIndicator with ThemeToggle in TopBar

**Decision:** Delete the `ThemeIndicator` function from `TopBar.tsx` and render `<ThemeToggle />` in its place. `TopBar.tsx` stays a Server Component; `ThemeToggle` is the isolated client leaf.

**Rationale:** `ThemeIndicator` was always a placeholder. Replacing it (not adding alongside it) keeps the header uncluttered and avoids redundant UI.

---

### 4. i18n: add toggle label

**Decision:** Add `theme.toggle` to `lib/i18n/uk.ts` ("Перемкнути тему") and `lib/i18n/en.ts` ("Toggle theme") for the button `aria-label`.

**Rationale:** All user-facing strings belong in i18n per NFR-I18N-01, including accessible labels.

## Risks / Trade-offs

- **Hydration mismatch** → The server renders `data-theme="light"` (hardcoded in layout). The blocking script may have already set it to `"dark"` by the time React hydrates. React 19 + Next.js 16 do not diff `data-*` attributes on `<html>` set before hydration, so this is safe — but the `suppressHydrationWarning` already on `<body>` in `layout.tsx` may need to move to or be added to `<html>` if a warning surfaces during development.

- **SSR initial state for ThemeToggle** → On the server, `ThemeToggle` cannot know the user's stored preference. It will render with `theme="light"` as the SSR default (matching the hardcoded `data-theme`). After the blocking script runs and hydration completes, the component reads the actual attribute and updates. This causes a single client-only re-render but **no visible flash** because the inline script already corrected the DOM before paint. If React emits a hydration warning, add `suppressHydrationWarning` to the toggle element.
