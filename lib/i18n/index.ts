import { uk } from "./uk";

type NestedKeyOf<T, Prefix extends string = ""> = T extends string
  ? Prefix extends ""
    ? never
    : Prefix
  : {
      [K in keyof T & string]: NestedKeyOf<
        T[K],
        Prefix extends "" ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string];

export type I18nKey = NestedKeyOf<typeof uk>;

export function t(key: I18nKey): string {
  const parts = key.split(".");
  let value: unknown = uk;

  for (const part of parts) {
    if (value === null || typeof value !== "object") {
      throw new Error(`Invalid i18n key: ${key}`);
    }
    value = (value as Record<string, unknown>)[part];
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid i18n key: ${key}`);
  }

  return value;
}
