"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Itinerary } from "@/lib/route-engine";
import type { RouteConfig } from "@/lib/route-config/types";
import type { I18nKey } from "@/lib/i18n";
import { planRoute } from "@/lib/routing/plan-route";

export type RoutePlanStatus = "idle" | "loading" | "success" | "error";

type RoutePlanContextValue = {
  itinerary: Itinerary | null;
  status: RoutePlanStatus;
  errorKey: I18nKey | null;
  planFromConfig: (config: RouteConfig) => Promise<void>;
};

const RoutePlanContext = createContext<RoutePlanContextValue | null>(null);

export function RoutePlanProvider({ children }: { children: ReactNode }) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [status, setStatus] = useState<RoutePlanStatus>("idle");
  const [errorKey, setErrorKey] = useState<I18nKey | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const planFromConfig = useCallback(async (config: RouteConfig) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorKey(null);

    const result = await planRoute(config, controller.signal);

    if (controller.signal.aborted) {
      return;
    }

    if (!result.ok) {
      if (result.error.code === "ABORTED") {
        return;
      }

      setItinerary(null);
      setStatus("error");
      setErrorKey("route.errorRoutingFailed");
      return;
    }

    setItinerary(result.itinerary);
    setStatus("success");
    setErrorKey(null);
  }, []);

  const value = useMemo(
    () => ({
      itinerary,
      status,
      errorKey,
      planFromConfig,
    }),
    [errorKey, itinerary, planFromConfig, status],
  );

  return (
    <RoutePlanContext.Provider value={value}>{children}</RoutePlanContext.Provider>
  );
}

export function useRoutePlan(): RoutePlanContextValue {
  const context = useContext(RoutePlanContext);

  if (!context) {
    throw new Error("useRoutePlan must be used within RoutePlanProvider");
  }

  return context;
}
