"use client";

import { useSyncExternalStore } from "react";
import { strings } from "@/lib/strings";

const STORAGE_KEY = "gh-battle-theme";

// The `.dark` class on <html> is the single source of truth. Subscribing to it
// via useSyncExternalStore keeps the button in sync without a setState-in-effect,
// and cleanly reconciles the server default (dark) with whatever the
// pre-hydration script applied.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function isDarkNow() {
  return document.documentElement.classList.contains("dark");
}

// Light/dark toggle (FR-SHELL-04). Dark is the product default. The 🌙/☀️ glyphs
// are the one place emoji are allowed (BC-BRAND-03).
export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, isDarkNow, () => true);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage may be unavailable (private mode); the toggle still works.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? strings.theme.toLight : strings.theme.toDark}
      aria-pressed={isDark}
      className="grid size-9 place-items-center rounded-md border border-border bg-surface text-[15px] text-text-muted transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <span aria-hidden>{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}

/**
 * Blocking script that applies the stored theme before first paint, so a
 * light-theme visitor never sees a dark flash. Injected in <head>.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'){document.documentElement.classList.remove('dark');}else if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
