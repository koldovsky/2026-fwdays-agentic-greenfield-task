// JSON-LD structured data for rich results (SEO). Inline, first-party markup —
// not a third-party tracker (BC-PRIVACY-01). Mirrors the on-page FAQ + pricing so
// the structured data stays truthful to what the visitor sees.
import { absoluteUrl, siteDescription, siteName, siteUrl } from "@/shared/config";
import { faqSection, pricingSection } from "../lib/content";

function priceValue(price: string): string {
  return price.replace(/[^0-9.]/g, "");
}

export function StructuredData() {
  // JSON-LD mirrors the rendered (English) page; inLanguage is "en" below.
  const plans = pricingSection("en").plans;
  const faqItems = faqSection("en").items;
  const graph = [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: siteName,
      url: siteUrl,
      description: siteDescription,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: siteName,
      publisher: { "@id": `${siteUrl}#organization` },
      inLanguage: "en",
    },
    {
      "@type": "Product",
      name: `${siteName} — Honest Resume Tailor`,
      description: siteDescription,
      brand: { "@id": `${siteUrl}#organization` },
      offers: plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: priceValue(plan.price),
        priceCurrency: "USD",
        url: absoluteUrl("/tailor"),
        availability: "https://schema.org/InStock",
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}#faq`,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user input flows in.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
