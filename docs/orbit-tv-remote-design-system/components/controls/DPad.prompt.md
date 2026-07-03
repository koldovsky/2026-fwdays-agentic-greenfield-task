Domain-specific directional pad — an inset circular dish holding four IconButtons + a central accent Select button.

```jsx
<DPad onDirection={(dir) => console.log(dir)} onSelect={() => console.log('OK')} />
```

Composes `IconButton`; don't rebuild the arrow buttons by hand.
