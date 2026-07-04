// Legal document view (add-legal-pages): renders the Privacy Policy or the
// public offer from centralized i18n copy (NFR-I18N-01). Static — no data fetch,
// no tracker/analytics markup (BC-PRIVACY-01). The session-aware header stays a
// client island so the route still prerenders static (NFR-PERF-04); its
// marketing nav is off (these are not the landing page — see rework-app-header).
import { t, type Locale } from "@/shared/lib/i18n";
import { TopBarSession } from "@/widgets/top-bar";

export interface LegalViewProps {
  /** Which legal document to render. */
  readonly doc: "privacy" | "offer";
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function LegalView({ doc, locale = "ua" }: LegalViewProps) {
  const copy = t(locale).legal;
  const document = copy[doc];

  return (
    <div className="flex flex-1 flex-col bg-surface-canvas font-body">
      <TopBarSession locale={locale} showMarketingNav={false} />
      <main className="mx-auto w-full max-w-[720px] px-6 py-14">
        <p
          role="note"
          className="mb-8 rounded-md border border-hairline bg-surface-warm px-4 py-3 text-sm text-ink-soft"
        >
          {copy.draftNote}
        </p>

        <h1 className="font-display text-3xl font-semibold leading-snug text-ink">
          {document.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{document.updated}</p>
        <p className="mt-6 text-ink-soft">{document.intro}</p>

        {document.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="font-display text-xl font-semibold text-ink">{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-3 text-ink-soft">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
