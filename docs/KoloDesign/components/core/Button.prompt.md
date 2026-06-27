Primary action button — use for the single most important action on a view; everything else is `secondary`, `ghost`, or `dashed`.

```jsx
<Button variant="primary" size="md" onClick={launch}>Launch cycle</Button>
<Button variant="secondary">Save draft</Button>
<Button variant="dashed" size="sm">+ Add reviewer</Button>
```

- `variant`: `primary` (evergreen fill, one per view), `secondary` (white + hairline border), `ghost` (borderless muted), `dashed` (add-row affordance).
- `size`: `sm` 12px / `md` 13px / `lg` 22px-padding for the respondent Submit.
- `disabled` greys a primary to `--line-strong` (used for the locked "Approved" state).
- No 700 bold, no shadow, no transform on press — only a slight background darken on hover.
