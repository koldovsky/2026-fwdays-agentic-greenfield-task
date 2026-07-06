Celebratory confetti burst for the moment a battle winner is declared. Mount it when the score is final and auto-hide after ~3s; respects reduced-motion by simply not mounting.

```jsx
{done && <Confetti active={showConfetti} />}
```

Pairs with WinnerBanner. Uses the `ds-confetti-fall` keyframe shipped in the token layer.
