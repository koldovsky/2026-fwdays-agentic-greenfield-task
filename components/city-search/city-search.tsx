"use client";

import { useEffect, useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { fetchCitySuggestions } from "@/lib/city-search/geocoding-client";
import {
  getEnterAutoSelection,
  selectedLocationToSearchParams,
  shouldRequestGeocoding,
  type CityLocation,
} from "@/lib/city-search/geocoding";
import { uk } from "@/lib/i18n/uk";

const DEBOUNCE_MS = 350;

type CitySearchProps = {
  selectedLocation: CityLocation | null;
  onSelectLocation: (location: CityLocation) => void;
};

export function CitySearch({ selectedLocation, onSelectLocation }: CitySearchProps) {
  const inputId = useId();
  const hintId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState(() => selectedLocation?.name ?? "");
  const [suggestions, setSuggestions] = useState<CityLocation[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!shouldRequestGeocoding(normalizedQuery, selectedLocation)) {
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(() => {
      fetchCitySuggestions(normalizedQuery)
        .then((results) => {
          if (cancelled) {
            return;
          }

          setSuggestions(results);
          setStatus(results.length === 0 ? "empty" : "idle");
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setSuggestions([]);
          setStatus("error");
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, selectedLocation]);
  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuery(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
  }


  const helperText =
    status === "loading"
      ? uk.citySearch.loading
      : status === "empty"
        ? uk.citySearch.emptyResults
        : status === "error"
          ? uk.citySearch.error
          : uk.citySearch.hint;

  function selectLocation(location: CityLocation) {
    onSelectLocation(location);
    setQuery(location.name);
    setSuggestions([]);
    setStatus("idle");

    const nextUrl = new URL(window.location.href);
    nextUrl.search = selectedLocationToSearchParams(location).toString();
    window.history.replaceState(null, "", nextUrl);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    const selection = getEnterAutoSelection(suggestions);

    if (!selection) {
      return;
    }

    event.preventDefault();
    selectLocation(selection);
  }

  return (
    <div
      role="search"
      className="w-full max-w-xl rounded-3xl border border-[#d8e3f0] bg-[#f4f7fb] p-3 text-left shadow-inner dark:border-white/10 dark:bg-[#0f1419]"
      aria-label={uk.citySearch.label}
    >
      <label
        className="mb-2 block px-2 text-sm font-medium text-[#1a2332] dark:text-[#e8edf4]"
        htmlFor={inputId}
      >
        {uk.citySearch.label}
      </label>
      <input
        id={inputId}
        type="search"
        value={query}
        placeholder={uk.citySearch.placeholder}
        aria-describedby={hintId}
        autoComplete="off"
        className="h-12 w-full rounded-2xl border border-transparent bg-white px-4 text-base text-[#1a2332] outline-none ring-[#3b6fd9] transition placeholder:text-[#5c6b7a]/70 focus:border-[#3b6fd9] focus:ring-2 dark:bg-[#1a2332] dark:text-[#e8edf4] dark:placeholder:text-[#8b9bb0]"
        onChange={handleQueryChange}
        onKeyDown={handleKeyDown}
      />
      <p
        id={hintId}
        className="mt-3 px-2 text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]"
      >
        {helperText}
      </p>

      {suggestions.length > 0 ? (
        <ul id={listboxId} className="mt-3 space-y-2">
          {suggestions.map((location) => (
            <li key={location.id}>
              <button
                type="button"
                className="w-full rounded-2xl bg-white px-4 py-3 text-left text-sm text-[#1a2332] outline-none ring-[#3b6fd9] transition hover:bg-[#eef4ff] focus-visible:ring-2 dark:bg-[#1a2332] dark:text-[#e8edf4] dark:hover:bg-[#22304a]"
                onClick={() => selectLocation(location)}
              >
                <span className="font-medium">
                  {location.flag ? `${location.flag} ` : ""}
                  {location.name}
                </span>
                <span className="mt-1 block text-[#5c6b7a] dark:text-[#8b9bb0]">
                  {[location.region, location.country].filter(Boolean).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedLocation ? (
        <div className="mt-4 rounded-2xl border border-[#d8e3f0] bg-white/70 p-4 dark:border-white/10 dark:bg-[#1a2332]/70">
          <p className="text-sm font-medium text-[#1a2332] dark:text-[#e8edf4]">
            {uk.citySearch.selectedPrefix}: {selectedLocation.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]">
            {uk.citySearch.selectedHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
