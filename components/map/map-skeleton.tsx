import { getMapSkeletonClassName } from "@/lib/map/map-config";

export function MapSkeleton() {
  return (
    <div
      className={`${getMapSkeletonClassName()} animate-pulse bg-[linear-gradient(135deg,#d8e3f0_0%,#eef4ff_50%,#d8e3f0_100%)] dark:bg-[linear-gradient(135deg,#22304a_0%,#1a2332_50%,#22304a_100%)]`}
      aria-hidden="true"
    />
  );
}
