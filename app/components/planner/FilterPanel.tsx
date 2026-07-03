"use client";

import { CITIES, FIELDS } from "@/app/lib/programs";
import type { ProfileApi } from "@/app/hooks/useProfile";

/**
 * Field & city filters (filtering capability, FR-FILTER-01). Multi-select
 * chips sourced from the program registry; combinable and instant
 * (NFR-PERF-01). Empty selection = no narrowing.
 */
export function FilterPanel({ profile }: { profile: ProfileApi }) {
  return (
    <div className="pk-card">
      <p className="pk-label">Напрями</p>
      <div
        role="group"
        aria-label="Фільтр за напрямом"
        style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "var(--pk-space-3)" }}
      >
        {FIELDS.map((field) => {
          const active = profile.fields.includes(field);
          return (
            <button
              key={field}
              type="button"
              className="pk-chip"
              aria-pressed={active}
              onClick={() => profile.toggleField(field)}
            >
              {field}
            </button>
          );
        })}
      </div>

      <p className="pk-label" style={{ marginTop: "var(--pk-space-5)" }}>
        Міста
      </p>
      <div
        role="group"
        aria-label="Фільтр за містом"
        style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "var(--pk-space-3)" }}
      >
        {CITIES.map((city) => {
          const active = profile.cities.includes(city);
          return (
            <button
              key={city}
              type="button"
              className="pk-chip"
              aria-pressed={active}
              onClick={() => profile.toggleCity(city)}
            >
              {city}
            </button>
          );
        })}
      </div>
    </div>
  );
}
