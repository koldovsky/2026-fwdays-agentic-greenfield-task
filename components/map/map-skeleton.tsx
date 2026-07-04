export function MapSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[280px] w-full animate-pulse flex-col justify-end rounded-lg bg-muted p-4 ring-1 ring-border"
    >
      <div className="h-3 w-40 rounded bg-background/60" />
    </div>
  );
}
