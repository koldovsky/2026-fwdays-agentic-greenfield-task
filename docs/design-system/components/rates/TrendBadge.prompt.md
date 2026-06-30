The product's signature movement read — a direction arrow and the signed delta in tabular mono, in the honest semantic colour. Strengthen = green, weaken = clay, flat = warm grey. Pair `trendTone()` to colour other elements consistently.

```jsx
<TrendBadge delta={1.2} />     {/* +1,20% green ↗ */}
<TrendBadge delta={-0.4} />    {/* −0,40% clay ↘  */}
<TrendBadge delta={0.0} />     {/* flat — */}
<TrendBadge delta={2.1} unit="%" size="lg" solid />
```

Props: `delta` (signed), `unit` (default `%`), `size` (`sm`/`md`/`lg`), `solid`, `flatBand`, `showSign`.
