Weekly bar chart of hours per day (last 7) for the Stats screen.

```jsx
<WeekChart goal={6} data={[
  {label:"M", hours:4}, {label:"T", hours:7}, {label:"W", hours:5.5},
  {label:"T", hours:6}, {label:"F", hours:3}, {label:"S", hours:1},
  {label:"S", hours:5, today:true},
]} />
```

Bars settle up from the baseline. `goal` draws a dashed line; days meeting it turn amber, today is gold.
