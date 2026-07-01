Primary action button for Vouch interfaces. Use `primary` for the main CTA, `secondary` for supporting actions, `ghost` for text-link-style actions, `dark` for actions on light surfaces that need extra weight (e.g. "Export PDF").

```jsx
// Primary CTA
<Button label="Tailor my CV — free" variant="primary" size="lg" />

// Secondary / outline
<Button label="Re-upload" variant="secondary" />

// Ghost / text link
<Button label="See the demo →" variant="ghost" />

// Dark (e.g. export action)
<Button label="Export PDF" variant="dark" />

// Disabled
<Button label="Exporting…" variant="primary" disabled />
```

**Notable variants/props:**
- `size="lg"` is for hero CTAs (padding 14px 28px)
- `size="sm"` for dense UI (inside cards, sidebars)
- `disabled` shows muted `#eef0f3` / `#aab2bf` style automatically — no extra prop needed
- Press animation (`scale(0.97)`) is built in
