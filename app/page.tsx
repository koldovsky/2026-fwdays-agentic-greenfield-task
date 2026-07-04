import { Suspense } from "react";

import { HeaderClock } from "@/components/clock/header-clock";
import { RouteResultsLayout } from "@/components/layout/route-results-layout";
import { AppShell } from "@/components/layout/app-shell";
import { RoutePlanProvider } from "@/components/route-planning/route-plan-provider";

function RouteResultsFallback() {
  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <div className="h-64 w-full max-w-lg animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function Home() {
  return (
    <AppShell headerSlot={<HeaderClock />}>
      <RoutePlanProvider>
        <div className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
          <Suspense fallback={<RouteResultsFallback />}>
            <RouteResultsLayout />
          </Suspense>
        </div>
      </RoutePlanProvider>
    </AppShell>
  );
}
