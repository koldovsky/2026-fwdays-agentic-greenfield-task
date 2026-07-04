// Static marketing content for the landing view (FR-SALES-01/02/03).
// Example data only — no network, no sign-in (FR-SALES-02). English copy;
// see docs/current-state.md for the Ukrainian-first i18n follow-up (display
// font Bricolage Grotesque lacks a Cyrillic subset).
import type { ChecklistRowStatus } from "@/shared/ui/checklist-row";
import type { GroundingStatus } from "@/shared/ui/grounding-badge";

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const navLinks: readonly NavLink[] = [
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** Real legal routes for the footer (add-legal-pages) — replaces the dead `#` stub. */
export const legalLinks: readonly NavLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/oferta", label: "Public offer" },
];

export interface Pillar {
  readonly title: string;
  readonly body: string;
  readonly accent: "brand" | "met" | "overclaim";
}

export const pillars: readonly Pillar[] = [
  {
    title: "Grounded in your CV",
    body: "Every rewritten bullet links back to a real sentence in your resume. The model is forbidden from inventing skills, numbers, or roles you never had.",
    accent: "brand",
  },
  {
    title: "A checklist for every requirement",
    body: "See each job requirement scored met, partial, gap, or overclaim-risk — with a one-line reason drawn straight from your experience.",
    accent: "met",
  },
  {
    title: "Overclaim, flagged",
    body: "Anything we can't back gets marked and left out of your export by default. You decide what goes in — nothing sneaks past you onto the page.",
    accent: "overclaim",
  },
];

export interface DemoBullet {
  readonly text: string;
  readonly grounding: GroundingStatus;
  readonly label: string;
  readonly excluded: boolean;
}

export const demoRequirement = "5+ yrs React Native, native modules";

export const demoBullets: readonly DemoBullet[] = [
  {
    text: "Owned the mobile stack end-to-end on a production React Native app — IAP, push/VoIP, and custom native modules across iOS and Android.",
    grounding: "met",
    label: "Vouched · backed by 3 lines in your CV",
    excluded: false,
  },
  {
    text: "Led a team of 12 engineers across 4 squads.",
    grounding: "overclaim",
    label: "No evidence found · excluded from export",
    excluded: true,
  },
];

export const demoScore = 82;

export interface BeforeAfter {
  readonly before: string;
  readonly after: string;
  readonly grounding: GroundingStatus;
  readonly label: string;
}

export const beforeAfter: readonly BeforeAfter[] = [
  {
    before:
      "Worked on payments and subscriptions for a mobile app, including some native bridging work.",
    after:
      "Built and shipped in-app purchases and subscription flows in React Native, including custom native modules for iOS and Android billing.",
    grounding: "met",
    label: "Vouched · linked to your CV",
  },
  {
    before: "Collaborated with two other engineers on the mobile features.",
    after: "Directed a 12-person mobile org and set the multi-year platform roadmap.",
    grounding: "overclaim",
    label: "No evidence found · excluded from export",
  },
];

export interface ChecklistPreviewRow {
  readonly requirement: string;
  readonly priority: "must" | "nice";
  readonly status: ChecklistRowStatus;
  readonly rationale: string;
}

export const checklistScore = 82;
export const checklistHeadline = "Strong fit, two real gaps";
export const checklistSubtext =
  "7 of 9 requirements met. The gaps are honest — close them or speak to them.";

export const checklistRows: readonly ChecklistPreviewRow[] = [
  {
    requirement: "React Native, production apps",
    priority: "must",
    status: "met",
    rationale: "7 years across IAP, push/VoIP, and native modules in your CV.",
  },
  {
    requirement: "TypeScript",
    priority: "must",
    status: "met",
    rationale: "Primary language on Konnect and side projects.",
  },
  {
    requirement: "Node / backend ownership",
    priority: "must",
    status: "partial",
    rationale: "NestJS experience present, but limited end-to-end backend evidence.",
  },
  {
    requirement: "AWS infrastructure at scale",
    priority: "nice",
    status: "gap",
    rationale: "No cloud-infra signal found in your CV.",
  },
  {
    requirement: "People management",
    priority: "nice",
    status: "overclaim",
    rationale: "Coordinating peers is not managing reports — don't claim the latter.",
  },
];

export interface Step {
  readonly number: string;
  readonly title: string;
  readonly body: string;
}

export const steps: readonly Step[] = [
  {
    number: "01",
    title: "Load your CV",
    body: "Upload a PDF or DOCX, or paste it in. Vouch parses it into a structured profile you confirm.",
  },
  {
    number: "02",
    title: "Paste the job",
    body: "Drop in the posting. Vouch pulls out every requirement and labels it must-have or nice-to-have.",
  },
  {
    number: "03",
    title: "Get vouched bullets",
    body: "In seconds you get the checklist, grounded rewrites, and a clean export — overclaims left out.",
  },
];

export interface Plan {
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly features: readonly string[];
  readonly cta: string;
  readonly featured: boolean;
  readonly badge?: string;
}

export const plans: readonly Plan[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "2 tailorings, lifetime",
    features: [
      "Full match checklist",
      "Grounded rewrites + overclaim flags",
      "Copy to clipboard",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "per month, renews at $12",
    features: [
      "Unlimited tailorings",
      "Clean PDF + DOCX export",
      "Tailoring history + cover letters",
      "Priority generation",
    ],
    cta: "Go Pro",
    featured: true,
    badge: "Popular",
  },
  {
    name: "Job-hunt Pass",
    price: "$19",
    cadence: "one-time · 30 days",
    features: [
      "Everything in Pro",
      "No subscription",
      "Built for a focused sprint",
    ],
    cta: "Get the pass",
    featured: false,
  },
];

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export const faqItems: readonly FaqItem[] = [
  {
    question: "Will it make things up to fit the job?",
    answer:
      "No — that's the entire point of Vouch. The model is instructed never to introduce skills, numbers, or experience that aren't in your CV, and a second pass flags anything it can't ground. Unbacked lines are excluded from your export unless you knowingly add them back.",
  },
  {
    question: "Do you train on my resume?",
    answer:
      "No. Your CV is personal data. It's encrypted at rest, never used to train models, and deletable on request. We don't load third-party trackers on any page.",
  },
  {
    question: "How is this different from ChatGPT?",
    answer:
      "A blank chat will happily invent a decade of experience you don't have. Vouch is built around the opposite constraint: it shows its evidence, scores every requirement, and refuses to write claims your CV can't support.",
  },
  {
    question: "What's the Job-hunt Pass?",
    answer:
      "A one-time 30-day unlock with everything in Pro and no recurring charge. Job hunts come in bursts — the pass fits a focused sprint without signing you up for a subscription you'll forget to cancel.",
  },
];
