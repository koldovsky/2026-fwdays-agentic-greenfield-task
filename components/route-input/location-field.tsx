"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPlaces } from "@/lib/geocoding/search-places";
import type { GeocodedPlace } from "@/lib/geocoding/types";
import { t, type I18nKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type LocationFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: GeocodedPlace | null;
  query: string;
  errorKey?: I18nKey;
  onQueryChange: (query: string) => void;
  onSelect: (place: GeocodedPlace) => void;
  onClearSelection: () => void;
};

export function LocationField({
  id,
  label,
  placeholder,
  value,
  query,
  errorKey,
  onQueryChange,
  onSelect,
  onClearSelection,
}: LocationFieldProps) {
  const listboxId = useId();
  const inputAnchorRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showNoResults, setShowNoResults] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);

  const updateDropdownPosition = useCallback(() => {
    const anchor = inputAnchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const resetSearch = useCallback(() => {
    abortRef.current?.abort();
    setSuggestions([]);
    setIsOpen(false);
    setIsLoading(false);
    setShowNoResults(false);
    setActiveIndex(-1);
    setDropdownPosition(null);
  }, []);

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) {
      return;
    }

    if (value && query === value.name) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setShowNoResults(false);

      void searchPlaces(query, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) {
            return;
          }
          if (results.length > 0) {
            updateDropdownPosition();
          }
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setShowNoResults(results.length === 0);
          setActiveIndex(results.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }
          setSuggestions([]);
          setIsOpen(false);
          setShowNoResults(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query, value, updateDropdownPosition]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    updateDropdownPosition();

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen, suggestions.length, updateDropdownPosition]);

  const selectPlace = useCallback(
    (place: GeocodedPlace) => {
      abortRef.current?.abort();
      onSelect(place);
      resetSearch();
    },
    [onSelect, resetSearch],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowNoResults(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const place = suggestions[activeIndex];
      if (place) {
        selectPlace(place);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setShowNoResults(false);
    }
  };

  const activeDescendant =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const suggestionsList =
    isOpen && suggestions.length > 0 && dropdownPosition ? (
      <ul
        id={listboxId}
        role="listbox"
        style={{
          position: "fixed",
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
        className="z-[9999] max-h-60 overflow-auto rounded-lg border border-border bg-card py-1 shadow-md"
      >
        {suggestions.map((place, index) => {
          const secondary = [place.region, place.country]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={place.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "cursor-pointer px-3 py-2",
                index === activeIndex && "bg-muted",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                selectPlace(place);
              }}
            >
              <div className="text-sm font-medium">{place.name}</div>
              {secondary ? (
                <div className="text-sm text-muted-foreground">{secondary}</div>
              ) : null}
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div ref={inputAnchorRef} className="w-full">
        <Input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-invalid={errorKey ? true : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            onClearSelection();
            if (next.length < MIN_QUERY_LENGTH) {
              resetSearch();
            }
            onQueryChange(next);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            window.setTimeout(() => {
              setIsOpen(false);
            }, 150);
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
              updateDropdownPosition();
            }
          }}
          className="h-10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </div>
      <span className="sr-only">{t("route.autocompleteHint")}</span>

      <p
        className="min-h-5 text-sm text-muted-foreground"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading
          ? t("route.searching")
          : showNoResults
            ? t("route.noResults")
            : null}
      </p>

      {typeof document !== "undefined" && suggestionsList
        ? createPortal(suggestionsList, document.body)
        : null}

      {errorKey ? (
        <p className="text-sm text-destructive">{t(errorKey)}</p>
      ) : null}
    </div>
  );
}
