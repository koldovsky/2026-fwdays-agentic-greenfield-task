Brief confirmation after an action ("Link copied", "Reminder sent", "Report approved").

```jsx
<Toast message={toast} />   // caller clears it after ~2.8s
```

Dark `--ink` pill, paper text, bottom-right, toast shadow, non-interactive. Short verb-phrase messages only. The caller owns the timer.
