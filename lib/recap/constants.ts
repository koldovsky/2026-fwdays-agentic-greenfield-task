export const REFLECTION_TAGS = [
  { id: "music", label: "Music" },
  { id: "breakdown", label: "Breakdown" },
  { id: "tiny-start", label: "Tiny start" },
  { id: "motivation", label: "Motivation note" },
  { id: "break", label: "Taking a break" },
] as const;

export type ReflectionTagId = (typeof REFLECTION_TAGS)[number]["id"];

export function isReflectionTagId(value: string): value is ReflectionTagId {
  return REFLECTION_TAGS.some((tag) => tag.id === value);
}
