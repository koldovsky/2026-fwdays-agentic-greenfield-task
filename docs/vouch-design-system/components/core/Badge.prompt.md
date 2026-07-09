Compact uppercase priority tag used inside ChecklistRow (and anywhere a must/nice requirement label is needed). Always paired with a requirement title, never standalone.

```jsx
<Badge priority="must" />
<Badge priority="nice" />
```

**Notable details:**
- Tight kerning (`0.06em`), 10px, all-caps — designed to sit beside a 15px heading without dominating
- "must" → brand blue wash; "nice" → neutral grey
- Extend with additional `priority` values if the PRD adds more tiers
