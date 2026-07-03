"use client";

import type { CategoryFilter } from "@/app/lib/recommend";

const TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "safe", label: "Надійно" },
  { key: "real", label: "Реально" },
  { key: "dream", label: "Мрія" },
];

/**
 * Risk-category filter tabs (filtering, FR-FILTER-02). Uses the design-system
 * `.pk-tab` pills; the active tab is reflected via `aria-pressed`.
 */
export function CategoryTabs({
  value,
  onChange,
}: {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Фільтр за категорією шансу"
      style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "var(--pk-space-4)" }}
    >
      {TABS.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            className={`pk-tab${active ? " pk-tab--active" : ""}`}
            aria-pressed={active}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
