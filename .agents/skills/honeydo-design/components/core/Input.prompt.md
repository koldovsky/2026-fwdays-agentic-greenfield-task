Filled iOS text field. Border and a soft amber ring appear on focus.

```jsx
<Input label="Email" type="email" placeholder="you@honey.do" leadingIcon={<Mail/>} />
<Input label="Password" type="password" placeholder="••••••••" />
```

Pass `label`, `leadingIcon`, `trailingIcon`. All native input attributes pass through. Use `containerStyle` to control width/layout of the field.
