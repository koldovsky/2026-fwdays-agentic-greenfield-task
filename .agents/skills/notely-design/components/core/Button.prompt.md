# Button

Primary action control. Use for the main action on a screen, form submits, and toolbar actions.

```jsx
<Button variant="primary" size="md" onClick={save}>New note</Button>
<Button variant="secondary" leadingIcon={<i data-lucide="share" />}>Share</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger">Delete</Button>
```

- **Variants:** `primary` (one per view), `secondary` (bordered, neutral), `ghost` (low-emphasis), `danger` (destructive).
- **Sizes:** `sm` 30px, `md` 36px, `lg` 44px (use `lg` for mobile primary actions — meets 44px touch target).
- **Props:** `leadingIcon`/`trailingIcon`, `fullWidth`, `loading`, `disabled`. Sentence-case labels, 1–2 words.
