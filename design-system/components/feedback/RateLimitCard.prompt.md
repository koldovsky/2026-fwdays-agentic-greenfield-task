Calm, explicit state for an exhausted GitHub rate limit (HTTP 403) — the app degrades to this, never a crash or blank page.

```jsx
<RateLimitCard onRetry={reload} />
```

For a missing user, use NotFoundCard instead.
