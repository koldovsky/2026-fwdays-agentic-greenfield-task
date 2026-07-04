import type { I18nKey } from "@/lib/i18n";

import { DEFAULT_DAY_KM, DEFAULT_REST_KM } from "./defaults";
import type { RouteConfig } from "./types";

export const REST_KM_MIN = 50;
export const REST_KM_MAX = 300;
export const DAY_KM_MIN = 100;
export const DAY_KM_MAX = 1000;

export type ValidationField = "restKm" | "dayKm" | "start" | "end";

export type ValidationErrors = Partial<Record<ValidationField, I18nKey>>;

export function validateRestKm(value: number): I18nKey | null {
  if (!Number.isInteger(value) || value < REST_KM_MIN || value > REST_KM_MAX) {
    return "route.errorRestRange";
  }
  return null;
}

export function validateDayKm(value: number): I18nKey | null {
  if (!Number.isInteger(value) || value < DAY_KM_MIN || value > DAY_KM_MAX) {
    return "route.errorDayRange";
  }
  return null;
}

export function validateRouteConfig(config: RouteConfig): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!config.start) {
    errors.start = "route.errorStartRequired";
  }
  if (!config.end) {
    errors.end = "route.errorEndRequired";
  }

  const restError = validateRestKm(config.restKm);
  if (restError) {
    errors.restKm = restError;
  }

  const dayError = validateDayKm(config.dayKm);
  if (dayError) {
    errors.dayKm = dayError;
  }

  return errors;
}

export function parsePositiveInteger(raw: string, fallback: number): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return fallback;
  }
  return Number.parseInt(digits, 10);
}

export function sanitizeRestKmInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 3);
}

export function sanitizeDayKmInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

export function restKmFromInput(raw: string): number {
  const parsed = parsePositiveInteger(raw, DEFAULT_REST_KM);
  return parsed;
}

export function dayKmFromInput(raw: string): number {
  const parsed = parsePositiveInteger(raw, DEFAULT_DAY_KM);
  return parsed;
}
