Pricing tier card. Always render three side-by-side: Free, Pro (featured), Job-hunt Pass.

```jsx
<PricingCard
  tier="Free"
  price="₴0"
  features={[
    "1 tailoring",
    "Checklist & grounding",
    { label: "Footer credit on export", muted: true }
  ]}
  cta="Start free"
/>

<PricingCard
  tier="Pro"
  price="₴249"
  period="/ mo"
  features={[
    "Unlimited tailorings",
    "Clean PDF & DOCX",
    "Saved history"
  ]}
  cta="Go Pro"
  featured   // ink background, "Popular" badge, elevated shadow
/>

<PricingCard
  tier="Job-hunt Pass"
  price="₴399"
  period="/ 30 days"
  features={[
    "Everything in Pro",
    "One-time, no renewal",
    "For an active search"
  ]}
  cta="Get the Pass"
/>
```

**Design rule:** Only one card should have `featured={true}`. The "Popular" badge is automatic when featured.
