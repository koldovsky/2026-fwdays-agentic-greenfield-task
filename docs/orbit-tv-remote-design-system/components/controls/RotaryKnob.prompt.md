Neumorphic rotary knob for relative volume — raised housing with an inset centre well hosting a caller-supplied action (typically a mute IconButton). Per-detent (~15°) rotation fires `onStep('up' | 'down')`; the knob holds no absolute value.

```jsx
<RotaryKnob
  onStep={(dir) => console.log(dir)}
  center={<IconButton icon="volume_up" size="md" aria-label="Mute" />}
/>
```

Composes `IconButton` in the `center` slot; the knob itself is the outer surface. Keyboard: ArrowUp/Right = up, ArrowDown/Left = down, PageUp/PageDown = ×3.
