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
  const inputClassName =
    "h-10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div className="grid grid-cols-1 gap-y-1.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1.5">
      <Label
        htmlFor="rest-km"
        className="leading-snug sm:col-start-1 sm:row-start-1 sm:self-end"
      >
        {t("route.restLabel")}
      </Label>
      <div className="flex flex-col gap-1.5 sm:col-start-1 sm:row-start-2">
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
          className={inputClassName}
        />
        {restError ? (
          <p className="text-sm text-destructive">{t(restError)}</p>
        ) : null}
      </div>

      <Label
        htmlFor="day-km"
        className="mt-2.5 leading-snug sm:col-start-2 sm:row-start-1 sm:mt-0 sm:self-end"
      >
        {t("route.dayLabel")}
      </Label>
      <div className="flex flex-col gap-1.5 sm:col-start-2 sm:row-start-2">
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
          className={inputClassName}
        />
        {dayError ? (
          <p className="text-sm text-destructive">{t(dayError)}</p>
        ) : null}
      </div>
    </div>
  );
}
