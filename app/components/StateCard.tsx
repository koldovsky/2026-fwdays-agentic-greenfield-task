import Link from "next/link";
import { strings } from "@/lib/strings";

// Calm, explicit failure states — never a crash or blank (FR-DATA-05/06,
// NFR-OBS-01). A shared shell keeps the not-found and rate-limit cards
// consistent; honest, specific copy per DESIGN.md voice.
function StateCard({
  title,
  body,
  href = "/",
  cta = strings.states.back,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mx-auto my-16 max-w-[520px] rounded-xl border border-border bg-surface p-9 text-center font-sans">
      <h2 className="font-serif text-[24px]">{title}</h2>
      <p className="mt-2 text-small leading-relaxed text-text-muted">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-md border border-border px-[22px] py-[11px] text-small font-semibold text-text transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        {cta}
      </Link>
    </div>
  );
}

export function NotFoundCard({ login }: { login?: string }) {
  return (
    <StateCard
      title={strings.states.notFoundTitle}
      body={login ? strings.states.notFoundBody(login) : strings.states.notFoundBodyGeneric}
    />
  );
}

export function RateLimitCard() {
  return (
    <StateCard
      title={strings.states.rateLimitTitle}
      body={strings.states.rateLimitBody}
    />
  );
}

export function GenericErrorCard() {
  return (
    <StateCard
      title={strings.states.genericErrorTitle}
      body={strings.states.genericErrorBody}
    />
  );
}
