"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_DAY_KM, DEFAULT_REST_KM } from "@/lib/route-config/defaults";
import {
  sanitizeDayKmInput,
  sanitizeRestKmInput,
} from "@/lib/route-config/validation";
import { t, type I18nKey } from "@/lib/i18n";

type ConstraintFieldsProps = {
  restKm: number;
  dayKm: number;
  restError?: I18nKey;
  dayError?: I18nKey;
  onRestKmChange: (value: number) => void;
  onDayKmChange: (value: number) => void;
  onRestBlur?: () => void;
  onDayBlur?: () => void;
};

export function ConstraintFields({
  restKm,
  dayKm,
  restError,
  dayError,
  onRestKmChange,
  onDayKmChange,
  onRestBlur,
  onDayBlur,
}: ConstraintFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rest-km">{t("route.restLabel")}</Label>
        <Input
          id="rest-km"
          inputMode="numeric"
          aria-invalid={restError ? true : undefined}
          value={String(restKm)}
          onChange={(event) => {
            const sanitized = sanitizeRestKmInput(event.target.value);
            onRestKmChange(
              sanitized ? Number.parseInt(sanitized, 10) : DEFAULT_REST_KM,
            );
          }}
          onBlur={() => {
            onRestBlur?.();
          }}
          className="h-10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        {restError ? (
          <p className="text-sm text-destructive">{t(restError)}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="day-km">{t("route.dayLabel")}</Label>
        <Input
          id="day-km"
          inputMode="numeric"
          aria-invalid={dayError ? true : undefined}
          value={String(dayKm)}
          onChange={(event) => {
            const sanitized = sanitizeDayKmInput(event.target.value);
            onDayKmChange(
              sanitized ? Number.parseInt(sanitized, 10) : DEFAULT_DAY_KM,
            );
          }}
          onBlur={() => {
            onDayBlur?.();
          }}
          className="h-10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        {dayError ? (
          <p className="text-sm text-destructive">{t(dayError)}</p>
        ) : null}
      </div>
    </div>
  );
}
