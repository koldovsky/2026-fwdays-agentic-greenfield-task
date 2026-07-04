// Landing content assemblers (FR-SALES-01/02/03, NFR-I18N-01). All copy lives in
// shared/lib/i18n (ua+en); this module merges that text with the STRUCTURAL data
// that is not translatable (accent, checklist status, grounding, price, feature
// ordering, hrefs). Each export is a function of locale so the landing can switch
// languages once task 10 wires Cyrillic fonts. Until then the section components
// pass an explicit "en" (see extract-landing-i18n): t() defaults to ua, and the
// display fonts are latin-only, so the landing must not fall back to that default.
import { t, type Locale, type SectionHeadCopy } from "@/shared/lib/i18n";
import type { ChecklistRowStatus } from "@/shared/ui/checklist-row";
import type { GroundingStatus } from "@/shared/ui/grounding-badge";

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

/** Header/footer nav links (labels localized, hrefs structural). */
export function navLinks(locale: Locale): readonly NavLink[] {
  const n = t(locale).landing.nav;
  return [
    { href: "#how", label: n.how },
    { href: "#pricing", label: n.pricing },
    { href: "#faq", label: n.faq },
  ];
}

/** Real legal routes for the footer (add-legal-pages) — replaces the dead `#` stub. */
export function legalLinks(locale: Locale): readonly NavLink[] {
  const l = t(locale).landing.legal;
  return [
    { href: "/privacy", label: l.privacy },
    { href: "/oferta", label: l.publicOffer },
  ];
}

/** Hero copy (FR-SALES-01). Problem-first framing; the headline renders as
 * lead + emphasized fragment + tail so the emphasis carries the brand color. */
export interface Hero {
  readonly kicker: string;
  readonly headlineLead: string;
  readonly headlineEmphasis: string;
  readonly headlineTail: string;
  readonly lead: string;
  readonly ctaPrimary: string;
  readonly ctaSecondary: string;
  readonly note: string;
}

export function heroContent(locale: Locale): Hero {
  return { ...t(locale).landing.hero };
}

export interface DemoBullet {
  readonly text: string;
  readonly grounding: GroundingStatus;
  readonly label: string;
  readonly excluded: boolean;
}

export interface DemoContent {
  readonly cardLabel: string;
  readonly requirementPrefix: string;
  readonly requirement: string;
  readonly scoreCaption: string;
  readonly score: number;
  readonly bullets: readonly DemoBullet[];
}

/** Static hero demo card (FR-SALES-02): one grounded + one overclaim bullet. */
export function demoContent(locale: Locale): DemoContent {
  const d = t(locale).landing.demo;
  return {
    cardLabel: d.cardLabel,
    requirementPrefix: d.requirementPrefix,
    requirement: d.requirement,
    scoreCaption: d.scoreCaption,
    score: 82,
    bullets: [
      { ...d.owned, grounding: "met", excluded: false },
      { ...d.ledTeam, grounding: "overclaim", excluded: true },
    ],
  };
}

export interface Pillar {
  readonly title: string;
  readonly body: string;
  readonly accent: "brand" | "met" | "overclaim";
}

export function pillarsSection(locale: Locale): {
  readonly head: SectionHeadCopy;
  readonly items: readonly Pillar[];
} {
  const p = t(locale).landing.pillars;
  return {
    head: p.head,
    items: [
      { ...p.grounded, accent: "brand" },
      { ...p.checklist, accent: "met" },
      { ...p.overclaim, accent: "overclaim" },
    ],
  };
}

export interface BeforeAfter {
  readonly before: string;
  readonly after: string;
  readonly grounding: GroundingStatus;
  readonly label: string;
}

export function beforeAfterSection(locale: Locale): {
  readonly head: SectionHeadCopy;
  readonly yourCvLabel: string;
  readonly tailoredLabel: string;
  readonly rows: readonly BeforeAfter[];
} {
  const b = t(locale).landing.beforeAfter;
  return {
    head: b.head,
    yourCvLabel: b.yourCvLabel,
    tailoredLabel: b.tailoredLabel,
    rows: [
      { ...b.payments, grounding: "met" },
      { ...b.leadership, grounding: "overclaim" },
    ],
  };
}

export interface ChecklistPreviewRow {
  readonly requirement: string;
  readonly priority: "must" | "nice";
  readonly status: ChecklistRowStatus;
  readonly rationale: string;
}

export function checklistSection(locale: Locale): {
  readonly head: SectionHeadCopy;
  readonly score: number;
  readonly headline: string;
  readonly subtext: string;
  readonly rows: readonly ChecklistPreviewRow[];
} {
  const c = t(locale).landing.checklist;
  return {
    head: c.head,
    score: 82,
    headline: c.headline,
    subtext: c.subtext,
    rows: [
      { ...c.rows.rn, priority: "must", status: "met" },
      { ...c.rows.ts, priority: "must", status: "met" },
      { ...c.rows.graphql, priority: "nice", status: "info" },
      { ...c.rows.node, priority: "must", status: "partial" },
      { ...c.rows.aws, priority: "nice", status: "gap" },
      { ...c.rows.mgmt, priority: "nice", status: "overclaim" },
    ],
  };
}

export interface Step {
  readonly number: string;
  readonly title: string;
  readonly body: string;
}

export function stepsSection(locale: Locale): {
  readonly head: SectionHeadCopy;
  readonly items: readonly Step[];
} {
  const s = t(locale).landing.steps;
  return {
    head: s.head,
    items: [
      { number: "01", ...s.load },
      { number: "02", ...s.paste },
      { number: "03", ...s.exportStep },
    ],
  };
}

export interface Plan {
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly features: readonly string[];
  readonly cta: string;
  readonly featured: boolean;
  readonly badge?: string;
}

export function pricingSection(locale: Locale): {
  readonly head: SectionHeadCopy;
  readonly plans: readonly Plan[];
} {
  const p = t(locale).landing.pricing;
  return {
    head: p.head,
    plans: [
      { ...p.free, price: "$0", featured: false },
      { ...p.pro, price: "$12", featured: true },
      { ...p.pass, price: "$19", featured: false },
    ],
  };
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export function faqSection(locale: Locale): {
  readonly head: SectionHeadCopy;
  readonly items: readonly FaqItem[];
} {
  const f = t(locale).landing.faq;
  return {
    head: f.head,
    items: [f.fabricate, f.train, f.coverLetter, f.attach, f.chatgpt, f.pass],
  };
}

export function finalCtaContent(locale: Locale): {
  readonly headline: string;
  readonly subtext: string;
  readonly cta: string;
} {
  return { ...t(locale).landing.finalCta };
}

export function footerContent(locale: Locale): { readonly anthropicCredit: string } {
  return { ...t(locale).landing.footer };
}
