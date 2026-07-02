// Final CTA block (FR-SALES-01): dark panel with the primary conversion action.
import { Button } from "@/shared/ui";
import { Wrap } from "./primitives";

export function FinalCta() {
  return (
    <section className="py-16">
      <Wrap>
        <div className="rounded-3xl bg-ink px-10 py-14 text-center text-white shadow-ink">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Tailor a resume you can defend
          </h2>
          <p className="mx-auto mt-[14px] max-w-[32em] text-lg leading-relaxed text-brand-wash">
            Paste a job, load your CV, and see the honest match in under two minutes. Your
            first tailoring is free.
          </p>
          <div className="mt-7 flex justify-center">
            <Button href="/tailor" variant="primary" size="lg">
              Tailor my CV — free
            </Button>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
