A free-form filter over the currency list — type to narrow by code or Ukrainian name, pick a row to focus it. Shows a calm inline "Не знайдено" when nothing matches. Composes `Input` + `RateRow`.

```jsx
<CurrencyPicker currencies={list} selected={code} onSelect={setCode} />
```

Props: `currencies` (`{code,name,rate,delta,…}[]`), `selected`, `onSelect`, `query`/`onQueryChange` (controlled filter), `maxHeight`.
