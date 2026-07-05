# Feedback — Toast, Alert, ProgressBar, Skeleton, EmptyState, Spinner

```jsx
<Toast message="Note moved to Trash" actionLabel="Undo" onAction={undo} />
<Alert tone="warning" title="You're offline">Changes will sync when you reconnect.</Alert>
<ProgressBar value={68} />
<Skeleton width={180} /><Skeleton circle height={34} />
<EmptyState icon="file-text" title="Nothing here yet"
  description="Create your first note to get started." action={<Button>New note</Button>} />
<Spinner />
```

All status components use Lucide icons. Toasts read on a dark surface; Alerts are inline and tinted.
