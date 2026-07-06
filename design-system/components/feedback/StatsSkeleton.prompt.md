Drop-in loading state for the stats page — mirrors the profile header + 15-cell metric grid so there is zero layout shift when data arrives.

```jsx
{loading ? <StatsSkeleton /> : <Stats data={stats} />}
```
