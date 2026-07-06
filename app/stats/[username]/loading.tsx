import { StatsSkeleton } from "@/app/components/Skeleton";

// Shown while the server component fetches; matches the loaded footprint so data
// arrival causes no layout shift (FR-STATS-05).
export default function Loading() {
  return <StatsSkeleton />;
}
