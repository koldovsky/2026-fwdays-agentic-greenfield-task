// /oferta route — thin App Router leaf (system-design 5.2): renders the
// views/legal public offer (публічна оферта). Static + crawlable
// (add-legal-pages, FR-PAYWALL-02, BC-PRIVACY-01).
import type { Metadata } from "next";
import { absoluteUrl } from "@/shared/config";
import { t } from "@/shared/lib/i18n";
import { LegalView } from "@/views/legal";

const copy = t("ua").legal.offer;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  alternates: { canonical: absoluteUrl("/oferta") },
};

export default function OfertaPage() {
  return <LegalView doc="offer" />;
}
