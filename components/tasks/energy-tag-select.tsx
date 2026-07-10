import type { EnergyLevel } from "@/lib/types";

const ENERGY_STYLES: Record<
  EnergyLevel,
  { label: string; className: string }
> = {
  low: {
    label: "Low energy",
    className: "bg-surface-muted text-foreground-muted",
  },
  medium: {
    label: "Medium energy",
    className: "bg-border text-[#57534E]",
  },
  high: {
    label: "High energy",
    className: "bg-accent-subtle text-accent-hover",
  },
};

interface EnergyTagSelectProps {
  value?: EnergyLevel;
  onChange: (value: EnergyLevel | undefined) => void;
  id?: string;
}

export function EnergyTagSelect({ value, onChange, id }: EnergyTagSelectProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-foreground-muted">
        Energy (optional)
      </legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Energy level">
        {(["low", "medium", "high"] as const).map((level) => {
          const style = ENERGY_STYLES[level];
          const isSelected = value === level;

          return (
            <label
              key={level}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150 ease-in-out focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
                isSelected
                  ? `${style.className} ring-2 ring-ring ring-offset-2 ring-offset-background`
                  : `${style.className} opacity-80 hover:opacity-100`
              }`}
            >
              <input
                id={id ? `${id}-${level}` : undefined}
                type="radio"
                name={id ?? "energy"}
                value={level}
                checked={isSelected}
                className="sr-only"
                onChange={() => onChange(level)}
              />
              {style.label}
            </label>
          );
        })}
        {value ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium text-foreground-muted transition-colors duration-150 ease-in-out hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => onChange(undefined)}
          >
            Clear
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
