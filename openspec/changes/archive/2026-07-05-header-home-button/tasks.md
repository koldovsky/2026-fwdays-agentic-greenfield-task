## 1. Implement

- [x] 1.1 Add a `HomeLink` client component (`usePathname`) that renders a labeled
  "Home" `next/link` to `/`, returning `null` on the landing page, styled through
  DS tokens with a visible focus ring
- [x] 1.2 Place `HomeLink` in the header (right side, before the theme toggle)

## 2. Verify

- [x] 2.1 Confirm the control appears on `/stats/{u}` and `/battle/{u1}/{u2}`,
  navigates to `/`, and is hidden on `/`
- [x] 2.2 Run the gate: `npm run lint && tsc --noEmit && npm test && npm run build`
