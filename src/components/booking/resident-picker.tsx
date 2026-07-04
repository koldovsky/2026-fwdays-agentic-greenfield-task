import {
  RESIDENT_PROFILES,
  type ResidentProfile,
} from "@/lib/booking/residents";

type ResidentPickerProps = {
  selectedId: string | null;
  onSelect: (resident: ResidentProfile | null) => void;
};

export function ResidentPicker({ selectedId, onSelect }: ResidentPickerProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-zinc-800">
        Who is booking? <span className="text-red-500">*</span>
      </legend>
      <p className="text-xs text-zinc-500">
        Pick a household member — contact details are stored on their profile.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {RESIDENT_PROFILES.map((resident) => {
          const active = selectedId === resident.id;
          return (
            <button
              key={resident.id}
              type="button"
              aria-label={`Book as ${resident.fullName}`}
              aria-pressed={active}
              onClick={() => onSelect(resident)}
              className={`rounded-xl border px-3 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                active
                  ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                  : "border-zinc-200 bg-white hover:border-emerald-300"
              }`}
            >
              <span className="block font-semibold text-zinc-900">{resident.label}</span>
              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                {resident.fullName.split(" ").slice(-1)[0]}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selectedId === null}
          onClick={() => onSelect(null)}
          className={`rounded-xl border px-3 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
            selectedId === null
              ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
              : "border-zinc-200 bg-white hover:border-emerald-300"
          }`}
        >
          <span className="block font-semibold text-zinc-900">Other</span>
          <span className="mt-0.5 block text-xs text-zinc-500">Enter manually</span>
        </button>
      </div>
    </fieldset>
  );
}
