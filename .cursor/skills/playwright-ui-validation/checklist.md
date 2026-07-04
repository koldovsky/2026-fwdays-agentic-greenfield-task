# UI/UX validation checklist — Colibri Book

Use during Playwright validation runs. Mark each item PASS / FAIL / N/A.

## Global / chrome

- [ ] Site header shows Colibri logo + wordmark
- [ ] Logo background is transparent (no checkerboard or white box on gradient)
- [ ] Home / Book nav links work; active state matches current route
- [ ] Page `<title>` matches product ("Colibri Book")
- [ ] No horizontal scroll at 390px width
- [ ] Console free of errors on initial load

## Landing `/`

- [ ] Hero hummingbird image loads (`/colibri-logo.png`)
- [ ] Headline and subcopy readable on emerald/violet gradient
- [ ] "Start a booking" → `/book`
- [ ] External MHOA link opens in new tab (`rel="noopener noreferrer"`)
- [ ] "How it works" cards visible on desktop; stack cleanly on mobile
- [ ] Footer present

## Booking intake `/book`

- [ ] Page title "Book outdoor activity" visible
- [ ] Mahogany HOA shown as fixed provider
- [ ] Tennis / Picnic facility toggle works
- [ ] "Not bookable" details expandable
- [ ] All required fields labeled with asterisk
- [ ] Phone placeholder hints change by facility (optional)
- [ ] Automation disclosure + attestation checkbox visible
- [ ] Submit empty → multiple field-specific errors
- [ ] First invalid field receives focus after failed submit
- [ ] Valid submit → confirm step with captured values
- [ ] "Submit to MHOA" disabled with explanation
- [ ] "Edit details" returns to form with values preserved

## Accessibility

- [ ] Tab order logical: facility → fields → attestation → submit
- [ ] Focus ring visible on links, inputs, buttons, checkbox
- [ ] Invalid fields: `aria-invalid="true"` and error linked via `aria-describedby`
- [ ] Errors announced (`role="alert"`)

## Responsive

- [ ] **390×844** — form usable, no clipped buttons
- [ ] **768×1024** — two-column field grid where intended
- [ ] **1280×800** — content centered, max-width respected

## Brand

- [ ] Emerald + violet palette consistent with landing
- [ ] Gradient CTA on primary actions
- [ ] No broken or stretched logo aspect ratio
