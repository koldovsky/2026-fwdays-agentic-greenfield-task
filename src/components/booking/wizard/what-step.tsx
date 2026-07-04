"use client";

import { FacilitySelector } from "@/components/booking/facility-selector";
import type { FacilityType } from "@/lib/booking/types";

type WhatStepProps = {
  facility: FacilityType;
  onChange: (facility: FacilityType) => void;
  onNext: () => void;
};

export function WhatStep({ facility, onChange, onNext }: WhatStepProps) {
  return (
    <section aria-labelledby="what-heading" className="space-y-6">
      <div>
        <h2 id="what-heading" className="text-xl font-semibold text-emerald-950">
          What do you want to book?
        </h2>
        <p className="mt-1 text-sm text-zinc-600">Choose a Mahogany HOA outdoor facility.</p>
      </div>
      <FacilitySelector facility={facility} onChange={onChange} />
      <button
        type="button"
        onClick={onNext}
        className="rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md"
      >
        Continue — Who is playing?
      </button>
    </section>
  );
}
