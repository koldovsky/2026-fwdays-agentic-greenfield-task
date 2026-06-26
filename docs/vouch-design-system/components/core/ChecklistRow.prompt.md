One row in the per-requirement compliance checklist. Compose multiple rows inside a white card below the MatchScore component. Always include a `rationale` — the one-sentence grounding explanation is the product's core value.

```jsx
<ChecklistRow
  requirement="5+ years React"
  priority="must"
  status="met"
  rationale="6 років фронтенду на React у двох продуктових компаніях."
/>
<ChecklistRow
  requirement="Team leadership"
  priority="must"
  status="partial"
  rationale="Менторив двох джуніорів, але формального лідерства команди немає."
/>
<ChecklistRow
  requirement="Kubernetes"
  priority="nice"
  status="gap"
  rationale="У CV немає згадок про Kubernetes чи оркестрацію контейнерів."
/>
<ChecklistRow
  requirement="Scaled to 1M users"
  priority="nice"
  status="overclaim"
  rationale="CV згадує зростання трафіку, але точної цифри 1M немає."
  last
/>
```

**Status dot colors:**
- `met` → green `#2f8f5b`
- `partial` → amber `#c79a1e`
- `gap` → red `#d05151`
- `overclaim` → orange `#e08a3c`

**Note:** Rationale text appears in Ukrainian in product demos — this reflects the BC-BRAND-01 Ukrainian-first audience.
