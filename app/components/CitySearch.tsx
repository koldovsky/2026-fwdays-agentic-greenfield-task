"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { uk } from "@/lib/i18n/uk";
import { usePinnedCities } from "@/app/hooks/usePinnedCities";

// Task 3.1/3.2: Bookmark icon — filled when pinned, outline when unpinned
function PinIcon({ pinned, size = 14 }: { pinned: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={pinned ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

type GeocodingResult = {
  name: string;
  admin1: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 0x1f1a5))
    .join("");
}

export function CitySearch() {
  const router = useRouter();
  const listboxId = useId();
  const { pin, unpin, pins } = usePinnedCities();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll the highlighted option into view when keyboard navigating through
  // a scrollable list. `block: "nearest"` avoids jumping when already visible.
  useEffect(() => {
    if (activeIndex < 0 || !isOpen) return;
    const el = document.getElementById(`${listboxId}-opt-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen, listboxId]);

  // Debounced geocoding fetch. All setState calls live inside the callback so
  // they are never synchronous within the effect body (react-hooks/set-state-in-effect).
  // Empty-query case uses 0 ms so clearing is still effectively immediate.
  useEffect(() => {
    let cancelled = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(
      async () => {
        if (cancelled) return;
        if (!query.trim()) {
          setSuggestions([]);
          setIsOpen(false);
          return;
        }
        try {
          const res = await fetch(`/api/geocode?name=${encodeURIComponent(query.trim())}`);
          if (cancelled) return;
          const data: GeocodingResult[] = res.ok ? await res.json() : [];
          setSuggestions(data);
          setActiveIndex(-1);
          setIsOpen(true);
        } catch {
          if (cancelled) return;
          setSuggestions([]);
          setIsOpen(true);
        }
      },
      query.trim() ? 300 : 0
    );

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const select = useCallback(
    (result: GeocodingResult) => {
      setQuery("");
      setSuggestions([]);
      setIsOpen(false);
      const city = { lat: result.latitude, lon: result.longitude, name: result.name };
      pin(city);
      const p = new URLSearchParams();
      p.set("lat", String(result.latitude));
      p.set("lon", String(result.longitude));
      p.set("name", result.name);
      router.push(`?${p.toString()}`);
    },
    [router, pin]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          select(suggestions[activeIndex]);
        } else if (suggestions.length === 1) {
          select(suggestions[0]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    },
    [isOpen, suggestions, activeIndex, select]
  );

  // Close list when focus leaves the input (clicking outside, Tab away)
  const handleBlur = useCallback(() => {
    // Delay so onMouseDown on an option fires before blur closes the list
    setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 150);
  }, []);

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className="relative w-full">
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        {uk.search.label}
      </label>
      <input
        id={`${listboxId}-input`}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={uk.search.placeholder}
        className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text shadow-sm outline-none placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand"
      />

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={uk.search.label}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-surface shadow-md"
        >
          {suggestions.length === 0 ? (
            <li
              role="option"
              aria-selected={false}
              aria-disabled="true"
              className="px-4 py-3 text-sm text-text-muted"
            >
              {uk.search.nothingFound}
            </li>
          ) : (
            suggestions.map((result, idx) => {
              const flag = countryFlag(result.countryCode);
              const isActive = idx === activeIndex;
              const city = {
                lat: result.latitude,
                lon: result.longitude,
                name: result.name,
              };
              const isPinned = pins.some((p) => p.name === result.name);
              return (
                <li
                  key={`${result.latitude}-${result.longitude}`}
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => {
                    // Prevent blur so the input stays focused through the click
                    e.preventDefault();
                    select(result);
                  }}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive ? "bg-brand-soft outline-none" : "hover:bg-surface-hover"
                  }`}
                >
                  {flag && (
                    <span className="shrink-0 text-base leading-none" aria-hidden="true">
                      {flag}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text">{result.name}</span>
                    <span className="block truncate text-xs text-text-secondary">
                      {[result.admin1, result.country].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  {/* Task 3.1/3.2: pin toggle */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPinned) unpin(city);
                      else pin(city);
                    }}
                    aria-label={`${isPinned ? uk.compare.unpin : uk.compare.pin} ${result.name}`}
                    className={[
                      "shrink-0 rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                      isPinned ? "text-brand" : "text-text-muted hover:text-brand",
                    ].join(" ")}
                  >
                    <PinIcon pinned={isPinned} size={14} />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
