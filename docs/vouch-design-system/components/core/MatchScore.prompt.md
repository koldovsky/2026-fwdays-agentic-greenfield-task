The signature metric component. Always appears at the top of the compliance checklist card, above the ChecklistRow list.

```jsx
// Standard usage — score + headline + subtext
<MatchScore
  score={76}
  headline="Strong, with two honest gaps"
  subtext="Weighted by must-have vs nice-to-have"
/>

// Score only (compact contexts)
<MatchScore score={54} size="sm" />

// Failing score — automatically renders in red
<MatchScore score={32} headline="Significant gaps" subtext="Three must-haves unmet" />
```

**Color thresholds (automatic):**
- ≥ 70 → green (`--color-met`)
- 45–69 → amber (`--color-partial`)
- < 45 → red (`--color-gap`)

**Layout tip:** Wrap in a white card with a bottom border below the MatchScore row before rendering ChecklistRow list items beneath it.
