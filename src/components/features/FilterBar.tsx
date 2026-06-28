"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  TypeBadge,
  POKEMON_TYPES,
  Select,
  Switch,
  Button,
} from "@/components/ds";
import type { PokemonType, SelectOption } from "@/components/ds";
import { strings } from "@/lib/i18n/en";

interface FilterBarProps {
  initialTypes: string[];
  initialGen: string;
  initialLegendary: boolean;
  initialSearch?: string;
}

export function FilterBar({
  initialTypes,
  initialGen,
  initialLegendary,
  initialSearch = "",
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [selectedGen, setSelectedGen] = useState(initialGen);
  const [isLegendary, setIsLegendary] = useState(initialLegendary);

  const hasAnyFilter =
    selectedTypes.length > 0 ||
    selectedGen !== "" ||
    isLegendary ||
    !!initialSearch;

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleTypeToggle(type: PokemonType) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(next);
    pushParams({ type: next.length > 0 ? next.join(",") : null });
  }

  function handleGenChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelectedGen(val);
    pushParams({ gen: val || null });
  }

  function handleLegendaryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setIsLegendary(checked);
    pushParams({ legendary: checked ? "1" : null });
  }

  function handleClear() {
    setSelectedTypes([]);
    setSelectedGen("");
    setIsLegendary(false);
    router.push(pathname);
  }

  const genOptions: SelectOption[] = [
    ...strings.filters.generationOptions,
  ] as SelectOption[];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
          {strings.filters.typeHeading}
        </p>
        <div className="flex flex-wrap gap-2">
          {POKEMON_TYPES.map((type) => (
            <TypeBadge
              key={type}
              type={type}
              selectable
              selected={selectedTypes.includes(type)}
              onClick={() => handleTypeToggle(type)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Select
          label={strings.filters.genLabel}
          options={genOptions}
          placeholder={strings.filters.genPlaceholder}
          value={selectedGen}
          onChange={handleGenChange}
          size="sm"
        />

        <Switch
          label={strings.filters.legendaryLabel}
          checked={isLegendary}
          onChange={handleLegendaryChange}
        />

        {hasAnyFilter && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            {strings.filters.clearFilters}
          </Button>
        )}
      </div>
    </div>
  );
}
