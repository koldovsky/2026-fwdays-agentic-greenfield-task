"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRoutePlan } from "@/components/route-planning/route-plan-provider";
import { Button } from "@/components/ui/button";
import type { GeocodedPlace, RouteConfig } from "@/lib/route-config/types";
import {
  decodeRouteConfig,
  routeConfigToPath,
} from "@/lib/route-config/url-codec";
import {
  validateDayKm,
  validateRestKm,
  validateRouteConfig,
  type ValidationErrors,
} from "@/lib/route-config/validation";
import { t } from "@/lib/i18n";

import { ConstraintFields } from "./constraint-fields";
import { LocationField } from "./location-field";

export function RouteConfigForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastSyncedPathRef = useRef(
    routeConfigToPath(decodeRouteConfig(searchParams)),
  );

  const [config, setConfig] = useState<RouteConfig>(() =>
    decodeRouteConfig(searchParams),
  );
  const [startQuery, setStartQuery] = useState(
    () => decodeRouteConfig(searchParams).start?.name ?? "",
  );
  const [endQuery, setEndQuery] = useState(
    () => decodeRouteConfig(searchParams).end?.name ?? "",
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [touchedRest, setTouchedRest] = useState(false);
  const [touchedDay, setTouchedDay] = useState(false);
  const shouldSyncUrlRef = useRef(false);
  const { status, errorKey, planFromConfig } = useRoutePlan();

  useEffect(() => {
    const parsed = decodeRouteConfig(searchParams);
    const path = routeConfigToPath(parsed);
    if (path === lastSyncedPathRef.current) {
      return;
    }
    lastSyncedPathRef.current = path;
    shouldSyncUrlRef.current = false;
    setConfig(parsed);
    setStartQuery(parsed.start?.name ?? "");
    setEndQuery(parsed.end?.name ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!shouldSyncUrlRef.current) {
      return;
    }
    shouldSyncUrlRef.current = false;
    const path = routeConfigToPath(config);
    lastSyncedPathRef.current = path;
    router.replace(path, { scroll: false });
  }, [config, router]);

  const updateConfig = useCallback((patch: Partial<RouteConfig>) => {
    shouldSyncUrlRef.current = true;
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const handleStartSelect = (place: GeocodedPlace) => {
    setStartQuery(place.name);
    updateConfig({ start: place });
    setErrors((current) => ({ ...current, start: undefined }));
  };

  const handleEndSelect = (place: GeocodedPlace) => {
    setEndQuery(place.name);
    updateConfig({ end: place });
    setErrors((current) => ({ ...current, end: undefined }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateRouteConfig(config);
    setErrors(nextErrors);
    setSubmitted(true);

    if (Object.keys(nextErrors).length === 0) {
      const path = routeConfigToPath(config);
      lastSyncedPathRef.current = path;
      router.replace(path, { scroll: false });
      void planFromConfig(config);
    }
  };

  const isPlanning = status === "loading";
  const routingError = errorKey ? t(errorKey) : undefined;

  const startError = submitted ? errors.start : undefined;
  const endError = submitted ? errors.end : undefined;
  const restError =
    submitted || touchedRest ? validateRestKm(config.restKm) ?? undefined : undefined;
  const dayError =
    submitted || touchedDay ? validateDayKm(config.dayKm) ?? undefined : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <LocationField
        id="route-start"
        label={t("route.startLabel")}
        placeholder={t("route.startPlaceholder")}
        value={config.start}
        query={startQuery}
        errorKey={startError}
        onQueryChange={setStartQuery}
        onSelect={handleStartSelect}
        onClearSelection={() => {
          updateConfig({ start: null });
        }}
      />

      <LocationField
        id="route-end"
        label={t("route.endLabel")}
        placeholder={t("route.endPlaceholder")}
        value={config.end}
        query={endQuery}
        errorKey={endError}
        onQueryChange={setEndQuery}
        onSelect={handleEndSelect}
        onClearSelection={() => {
          updateConfig({ end: null });
        }}
      />

      <ConstraintFields
        restKm={config.restKm}
        dayKm={config.dayKm}
        restError={restError}
        dayError={dayError}
        onRestKmChange={(restKm) => {
          updateConfig({ restKm });
        }}
        onDayKmChange={(dayKm) => {
          updateConfig({ dayKm });
        }}
        onRestBlur={() => {
          setTouchedRest(true);
        }}
        onDayBlur={() => {
          setTouchedDay(true);
        }}
      />

      <Button
        type="submit"
        className="h-10 w-full sm:w-auto"
        disabled={isPlanning}
      >
        {isPlanning ? t("route.planning") : t("route.submit")}
      </Button>

      {routingError ? (
        <p className="text-sm text-destructive">{routingError}</p>
      ) : null}
    </form>
  );
}
