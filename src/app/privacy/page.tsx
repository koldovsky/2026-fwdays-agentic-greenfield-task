// /privacy route — thin App Router leaf (system-design 5.2): renders the
// views/legal Privacy Policy. Static + crawlable (add-legal-pages, BC-PRIVACY-01,
// NFR-GDPR-01/02).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { absoluteUrl } from "@/shared/config";
import { LOCALE_COOKIE, parseLocale, t } from "@/shared/lib/i18n";
import { LegalView } from "@/views/legal";

const copy = t("ua").legal.privacy;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default async function PrivacyPage() {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return <LegalView doc="privacy" locale={locale} />;
}
