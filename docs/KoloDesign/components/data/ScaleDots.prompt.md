The signature score visualization — five dots, filled `--ink` / empty `--dot-empty`.

```jsx
<div style={{display:"flex",gap:14,alignItems:"center"}}>
  <ScaleDots value={4.1} />
  <span style={{fontSize:13,color:"var(--ink-muted)"}}>4.1 / 5</span>
</div>
```

Always pair with the `N.N / 5` numeral beside it. Bars are *not* used for scores — only for progress/coverage (`ProgressBar`).
