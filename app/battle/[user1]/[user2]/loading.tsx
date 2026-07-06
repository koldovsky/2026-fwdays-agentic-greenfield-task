import { Skeleton } from "@/app/components/Skeleton";

// Shown while both users are fetched in parallel (FR-BATTLE-01). Mirrors the
// score header + fifteen rows so there is no layout shift on arrival.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-10">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-11 w-32" />
      </div>
      <div className="mt-10 space-y-px overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="h-[54px] w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
