# Input

Single-line text field for forms (note title, folder name, login).

```jsx
<Input label="Note title" placeholder="Untitled" />
<Input label="Email" type="email" leadingIcon={<i data-lucide="mail" />} />
<Input label="Password" type="password" error="Must be 8+ characters" />
```

- **Sizes:** sm/md/lg (lg = 44px, mobile-friendly).
- Pass `error` to show the invalid state; `helperText` for hints. Focus shows the indigo ring.
