Primary pill action button in honey amber — use for the single primary action on a screen (Start, Sign in, Save).

```jsx
<Button variant="primary" size="lg" block>Start your first entry</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Skip for now</Button>
```

Variants: `primary` (amber fill), `secondary` (surface-alt + border), `ghost` (text-only amber). Sizes `sm | md | lg`. Pass `block` for full-width, `leadingIcon`/`trailingIcon` for icon nodes. Presses settle with a soft 0.96 scale — no harsh bounce.
