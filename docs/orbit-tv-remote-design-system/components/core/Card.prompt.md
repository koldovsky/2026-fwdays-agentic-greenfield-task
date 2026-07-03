The foundational neumorphic surface — same color as the background, depth comes only from shadow.

```jsx
<Card>Plain raised panel</Card>
<Card variant="inset" padding="14px 18px">Recessed well</Card>
```

Every other component (DeviceCard, Modal, DPad housing) composes this shadow pairing rather than redefining it.
