import { useEffect } from "react";

type ShortcutHandler = (event: KeyboardEvent) => void;

export type ShortcutMap = Record<string, ShortcutHandler | undefined>;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
}

function hasActiveOverlay(): boolean {
  if (typeof document === "undefined") return false;

  return Boolean(
    document.querySelector(
      '[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]',
    ),
  );
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      if (hasActiveOverlay()) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const handler = shortcuts[key];
      if (!handler) return;

      event.preventDefault();
      handler(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, shortcuts]);
}
