Primary clickable control — use for the single strongest action in a view; quieter variants for everything else.

```jsx
<Button variant="primary" iconLeft={<Plus size={16} />}>Add book</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="soft" size="sm">Link note</Button>
```

Variants: `primary` (ballpoint blue, one per view), `secondary` (paper + hairline), `ghost` (text only), `soft` (blue tint), `danger`. Sizes `sm | md | lg`. Pass `iconLeft`/`iconRight` as Lucide nodes; `block` stretches full width.
