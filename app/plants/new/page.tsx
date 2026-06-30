// Add-plant route (design D6) — thin server component framing the client form
// island. On success the action revalidates the list; the form island handles
// the inline-error round-trip. Reachable in <= 2 clicks from the list (NFR-USA-01).
//
// @trace FR-PLANT-01

import { PlantForm } from "@/components/plants/PlantForm";
import { Button } from "@/components/ui/Button";
import { uk } from "@/lib/i18n/uk";

export default function NewPlantPage() {
  return (
    <section>
      <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
        {uk.plants.addTitle}
      </h1>
      <PlantForm />
      <div className="mt-4">
        <Button variant="ghost" href="/">
          {uk.nav.backToList}
        </Button>
      </div>
    </section>
  );
}
