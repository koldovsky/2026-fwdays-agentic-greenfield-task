A behaviourally-anchored scale answer — the respondent picks one. Stack 5 of them.

```jsx
<ScaleOption value="4" label="Clear and structured" selected onClick={pick} />
```

Mono value chip on the left, anchor label right. Selected promotes to 2px green border + `--green-tint-2`. Always show the full anchor sentence, never bare numbers.
