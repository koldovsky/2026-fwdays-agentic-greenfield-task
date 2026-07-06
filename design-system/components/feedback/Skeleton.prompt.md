Shimmering placeholder block. Build a loading state by composing Skeletons in the same footprint as the loaded layout — the profile avatar/name, then a 15-cell metric grid — so nothing jumps when data lands.

```jsx
<Skeleton width={88} height={88} radius="var(--radius-pill)" />
<Skeleton width="60%" height={28} />
```
