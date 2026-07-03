# IconButton

Compact icon-only action — toolbars, list-row actions, nav. **Always** pass `label` for accessibility.

```jsx
<IconButton icon={<i data-lucide="pin" />} label="Pin note" />
<IconButton icon={<i data-lucide="star" />} label="Favorite" active />
<IconButton icon={<i data-lucide="more-horizontal" />} label="More" variant="outline" size="sm" />
```

- **Variants:** `ghost` (default, toolbar), `solid` (rare, primary), `outline` (bordered).
- **Sizes:** sm 28 / md 34 / lg 40 — use lg on mobile for touch targets.
- `active` tints ghost with the selection color (e.g. pinned/favorited).
