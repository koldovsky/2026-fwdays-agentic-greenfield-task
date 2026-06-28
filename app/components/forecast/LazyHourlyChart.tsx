"use client";

// Dynamic import with ssr: false must live in a Client Component (Next.js 16).
import dynamic from "next/dynamic";
import type { HourlyPoint } from "@/lib/forecast/types";

const HourlyChart = dynamic(() => import("./HourlyChart").then((m) => m.HourlyChart), {
  ssr: false,
  loading: () => (
    <div
      className="h-[160px] w-full animate-pulse rounded-lg bg-surface-sunken"
      aria-hidden="true"
    />
  ),
});

export function LazyHourlyChart({ hours }: { hours: HourlyPoint[] }) {
  return <HourlyChart hours={hours} />;
}
