"use client";

import type { FacilityType } from "@/lib/booking/types";
import { FACILITY_LABEL, UNBOOKABLE_FACILITIES } from "@/lib/booking/types";

type FacilitySelectorProps = {
  facility: FacilityType;
  onChange: (facility: FacilityType) => void;
};

export function FacilitySelector({ facility, onChange }: FacilitySelectorProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-emerald-950">Outdoor facility</legend>
      <p className="text-sm text-zinc-600">
        Provider: <span className="font-medium text-emerald-800">Mahogany HOA</span>
      </p>
      <div className="flex flex-wrap gap-3">
        {(Object.keys(FACILITY_LABEL) as FacilityType[]).map((key) => (
          <label
            key={key}
            className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium transition-colors has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-violet-500 ${
              facility === key
                ? "border-violet-400 bg-violet-50 text-violet-950"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300"
            }`}
          >
            <input
              type="radio"
              name="facility"
              value={key}
              checked={facility === key}
              onChange={() => onChange(key)}
              className="sr-only"
            />
            {FACILITY_LABEL[key]}
          </label>
        ))}
      </div>
      <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-800">
          Not bookable through MHOA
        </summary>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {UNBOOKABLE_FACILITIES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </fieldset>
  );
}
