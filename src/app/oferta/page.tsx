// /oferta route — thin App Router leaf (system-design 5.2): renders the
// views/legal public offer (публічна оферта). Static + crawlable
// (add-legal-pages, FR-PAYWALL-02, BC-PRIVACY-01).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { absoluteUrl } from "@/shared/config";
import { LOCALE_COOKIE, parseLocale, t } from "@/shared/lib/i18n";
import { LegalView } from "@/views/legal";

const copy = t("ua").legal.offer;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  alternates: { canonical: absoluteUrl("/oferta") },
};

export default async function OfertaPage() {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return <LegalView doc="offer" locale={locale} />;
}
