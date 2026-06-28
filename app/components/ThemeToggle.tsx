"use client";

import { useSyncExternalStore } from "react";
import { uk } from "@/lib/i18n/uk";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.getAttribute("data-theme") === "dark";

const getServerSnapshot = () => false;

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("nadvori-theme", next);
    } catch {
      // localStorage unavailable (e.g. private browsing with strict settings)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={uk.theme.toggle}
      aria-pressed={isDark}
      suppressHydrationWarning
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-border-subtle bg-surface px-2.5 py-1 text-2xs font-medium text-text-secondary transition-colors hover:bg-surface-hover active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring]"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span>{isDark ? uk.theme.light : uk.theme.dark}</span>
    </button>
  );
}
