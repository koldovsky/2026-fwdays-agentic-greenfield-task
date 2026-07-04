import { IntakeForm } from "@/components/booking/intake-form";
import { SiteHeaderWithAuth } from "@/components/shell/site-header-auth";

export default function BookPage() {
  return (
    <>
      <SiteHeaderWithAuth active="book" />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950">
            Book outdoor activity
          </h1>
          <p className="mt-2 text-zinc-600">
            Mahogany HOA outdoor facilities — describe when you want to play or gather.
          </p>
        </div>
        <IntakeForm />
      </main>
    </>
  );
}
