Pill badge shown directly under a tailored CV bullet to communicate grounding status. Critical trust signal — do not omit or hide it.

```jsx
// Fully grounded
<GroundingBadge status="met" />
// With a custom label (e.g. CV line reference)
<GroundingBadge status="met" label="Linked to CV line 14" />

// Partial support
<GroundingBadge status="partial" />

// Overclaim — excluded from export
<GroundingBadge status="overclaim" />

// Manually edited by user (Ukrainian label per brand)
<GroundingBadge status="manual" />
```

**Design rules:**
- Always appears directly below the bullet text, never inline
- `overclaim` state is the most visually distinct — orange, clearly a warning
- `manual` uses neutral grey with the Ukrainian label "відредаговано вручну"
- Custom `label` prop allows adding a specific CV line reference ("Linked to CV line 14")
