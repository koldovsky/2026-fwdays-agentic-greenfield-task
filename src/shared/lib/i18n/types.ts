// Centralized UI-string types (NFR-I18N-01). Framework-free, no runtime i18n lib.

import type { ChecklistStatus } from "../scoring/types";

export type Locale = "ua" | "en";

export interface Dictionary {
  readonly app: {
    readonly name: string;
  };
  readonly action: {
    readonly tailor: string;
  };
  readonly checklist: {
    /** Human labels for each of the 4 checklist statuses. */
    readonly statusLabel: Readonly<Record<ChecklistStatus, string>>;
    readonly scoreHeadline: string;
  };
  readonly bullets: {
    /** Section eyebrow / accessible label for the tailored-bullet list. */
    readonly listLabel: string;
    /** Label for the include-in-export toggle (FR-BULLETS-02). */
    readonly includeInExport: string;
    /** Shown on overclaim-risk bullets excluded by default (BC-HONESTY-02). */
    readonly excludedFromExport: string;
    /** Prefix for the grounding source sentence (FR-BULLETS-01). */
    readonly source: string;
    /** Evidence-pool label when a bullet is grounded in a CV sentence (BC-HONESTY-03). */
    readonly sourceCv: string;
    /** Evidence-pool label when a bullet is grounded in a confirmed wizard answer (BC-HONESTY-03). */
    readonly sourceUserConfirmed: string;
  };
  readonly result: {
    /** Accessible region label for the two-column result view (FR-SHELL-02). */
    readonly regionLabel: string;
    /** Section eyebrow above the result view. */
    readonly eyebrow: string;
    /** Result view title. */
    readonly title: string;
  };
  readonly workspace: {
    /** Short lead line under the result title. */
    readonly lead: string;
    /** CV textarea label (FR-CV-02). */
    readonly cvLabel: string;
    /** JD textarea label (FR-JD-01). */
    readonly jdLabel: string;
    /** Shown before the first tailoring run. */
    readonly emptyState: string;
  };
  readonly uploadCv: {
    /** Main dropzone label (FR-CV-01). */
    readonly dropLabel: string;
    /** Accepted formats + size hint under the label. */
    readonly hint: string;
    /** Click-to-browse action inside the dropzone. */
    readonly browseAction: string;
    /** Shown while the file is uploading / text is being extracted. */
    readonly pending: string;
    /** Calm error copy per UploadCvErrorCode (NFR-OBS-01). */
    readonly error: {
      readonly unsupportedType: string;
      readonly tooLarge: string;
      /** Points to the paste path as the fallback (FR-CV-02). */
      readonly unparseable: string;
      readonly failed: string;
    };
    /** Premium "attach original PDF" control (add-premium-pdf-attach, T5, FR-PAYWALL-02). */
    readonly attach: {
      /** Label on the disabled control for free/anon users. */
      readonly addOriginalPdf: string;
      /** Small "premium" tag on the disabled control (BC-BRAND-01: no emoji). */
      readonly premiumBadge: string;
      /** Confirmation shown to a paid user once the original PDF is attached. */
      readonly attachedLabel: string;
      /** Remove-attachment control for a paid user. */
      readonly remove: string;
      /** Shown when a paid user's PDF exceeds the attachment cap. */
      readonly tooLarge: string;
    };
  };
  readonly tailorRun: {
    /** Visible progress states (FR-TAILOR-01): queued → processing → done. */
    readonly queued: string;
    readonly processing: string;
    readonly done: string;
    /** Calm failure copy after retries are exhausted (FR-TAILOR-03, NFR-OBS-01). */
    readonly failed: string;
    /** Shown when the form is submitted without both texts. */
    readonly emptyInput: string;
    /** Shown when the free-tier or per-IP tailoring limit is reached (NFR-COST-02). */
    readonly rateLimited: string;
  };
  readonly auth: {
    /** Sign-in page title (FR-AUTH-01). */
    readonly signInTitle: string;
    /** Sign-up mode title. */
    readonly signUpTitle: string;
    /** Short lead under the title. */
    readonly lead: string;
    readonly emailLabel: string;
    readonly passwordLabel: string;
    /** Optional display-name field on sign-up. */
    readonly nameLabel: string;
    readonly signInAction: string;
    readonly signUpAction: string;
    readonly signOutAction: string;
    /** Switch-mode prompts under the form. */
    readonly noAccountPrompt: string;
    readonly haveAccountPrompt: string;
    /**
     * Error copy. `invalidCredentials` is deliberately uniform for wrong
     * password vs unknown email — no account enumeration (FR-AUTH-01).
     */
    readonly error: {
      readonly invalidCredentials: string;
      readonly emailTaken: string;
      readonly invalidEmail: string;
      readonly weakPassword: string;
      readonly generic: string;
    };
  };
  readonly checkout: {
    /** Checkout page title (add-payments-emulator, FR-PAYWALL-02). */
    readonly title: string;
    /** Emulator disclosure — dev/demo checkout, no real charge. */
    readonly emulatorNotice: string;
    /** Label above the selected plan. */
    readonly planLabel: string;
    /** Display names per purchasable plan (matches landing pricing). */
    readonly planName: Readonly<Record<"pro" | "job_hunt_pass", string>>;
    /** Price lines per purchasable plan (matches landing pricing). */
    readonly planPrice: Readonly<Record<"pro" | "job_hunt_pass", string>>;
    /** Emulator action: complete the checkout successfully. */
    readonly succeedAction: string;
    /** Emulator action: make the payment fail (FR-BILLING-03 path). */
    readonly failAction: string;
    /** Shown while the emulated webhook round-trip is in flight. */
    readonly pending: string;
    /** Shown after a successful payment while returning to the prior screen. */
    readonly redirecting: string;
    /** Calm decline copy — nothing charged, no partial access (FR-BILLING-03). */
    readonly declined: string;
    /** Retry CTA after a decline or an error (FR-BILLING-03). */
    readonly retryAction: string;
    /** Calm generic failure copy (NFR-OBS-01). */
    readonly error: string;
    /** Lead-in before the public-offer link (FR-PAYWALL-02, add-legal-pages). */
    readonly termsPrefix: string;
    /** Link text pointing at /oferta (the public offer a purchase accepts). */
    readonly termsLink: string;
  };
  readonly paywall: {
    /** Accessible region label for the paywall panel (FR-PAYWALL-01). */
    readonly regionLabel: string;
    /** Panel title — one calm headline for both interception points. */
    readonly title: string;
    /** Lead when the paywall intercepts the export step (FR-PAYWALL-01). */
    readonly exportLead: string;
    /** Lead when the paywall intercepts a tailoring past the free limit. */
    readonly limitLead: string;
    /** Lead when the paywall is opened from the premium attach control (T5). */
    readonly attachLead: string;
    /** Dismiss control — the blocked action simply stays blocked. */
    readonly dismissAction: string;
  };
  readonly upgrade: {
    /** One-line pitch per purchasable plan (matches landing pricing). */
    readonly planFeature: Readonly<Record<"pro" | "job_hunt_pass", string>>;
    /** Per-plan choose CTA (FR-PAYWALL-02: user picks before checkout). */
    readonly chooseAction: Readonly<Record<"pro" | "job_hunt_pass", string>>;
    /** Shown while the checkout session is being created. */
    readonly pending: string;
    /** Calm copy when checkout could not be started (NFR-OBS-01). */
    readonly error: string;
  };
  readonly billing: {
    /** Billing page title (FR-BILLING-01). */
    readonly title: string;
    /** Short lead under the title. */
    readonly lead: string;
    /** Label above the current plan (FR-BILLING-01). */
    readonly currentPlanLabel: string;
    /** Display names for every plan incl. Free. */
    readonly planName: Readonly<Record<"free" | "pro" | "job_hunt_pass", string>>;
    /** Next renewal date label — Pro (FR-BILLING-01). */
    readonly renewsOnLabel: string;
    /** Fixed expiry label — Job-hunt Pass. */
    readonly expiresOnLabel: string;
    /** Remaining-access label after cancellation (FR-BILLING-02). */
    readonly accessUntilLabel: string;
    /** Note after cancel: Free at period end, tailorings readable, export gated. */
    readonly canceledNote: string;
    /** Free-state copy: no partial access, choose a plan to unlock (FR-BILLING-03). */
    readonly freeNote: string;
    /** Heading over the plan chooser in the Free state — the retry CTA. */
    readonly upgradeTitle: string;
    /** Invoice history section title (FR-BILLING-01). */
    readonly invoicesTitle: string;
    /** Shown when there are no invoices yet. */
    readonly noInvoices: string;
    /** Status label on a settled synthetic invoice. */
    readonly invoicePaidLabel: string;
    /** Cancel button (FR-BILLING-01). */
    readonly cancelAction: string;
    /** Shown while the cancellation request is in flight. */
    readonly cancelPending: string;
    /** Calm copy when cancellation failed (NFR-OBS-01). */
    readonly cancelError: string;
  };
  readonly topBar: {
    /** Accessible label for the logo home link. */
    readonly homeLabel: string;
    /** Accessible label for the signed-in account area (FR-SHELL-01). */
    readonly accountLabel: string;
    readonly signIn: string;
    readonly tryFree: string;
    readonly navFeatures: string;
    readonly navPricing: string;
  };
  /** Signed-in account dropdown in the top bar (FR-SHELL-01). */
  readonly accountMenu: {
    /** Accessible label for the burger trigger. */
    readonly triggerLabel: string;
    readonly profile: string;
    readonly tailoring: string;
    /** Tailoring history destination (add-tailoring-history, FR-HISTORY-01). */
    readonly history: string;
    readonly usage: string;
    readonly subscription: string;
    readonly logout: string;
    /** Small tag on not-yet-shipped items (Usage, Refer a friend). */
    readonly comingSoon: string;
  };
  /** Profile page (/account/profile). */
  readonly profile: {
    readonly title: string;
    readonly lead: string;
    readonly nameLabel: string;
    readonly emailLabel: string;
    /** Label above the current plan; plan display names reuse `billing.planName`. */
    readonly planLabel: string;
    /** Link out to the subscription/billing page. */
    readonly viewSubscription: string;
    /** Refer-a-friend promo card (coming soon). */
    readonly referTitle: string;
    readonly referLead: string;
    /** GDPR self-serve section (NFR-GDPR-01/02). */
    readonly dataTitle: string;
    readonly dataLead: string;
    /** Export-my-data action — links to GET /api/account/export. */
    readonly exportAction: string;
    /** Delete-account action + its confirm step (FR-CV-05, NFR-GDPR-02). */
    readonly deleteAction: string;
    readonly deleteConfirmPrompt: string;
    readonly deleteConfirmAction: string;
    readonly deleteCancelAction: string;
    readonly deletePending: string;
    /** Calm failure copy (NFR-OBS-01). */
    readonly deleteError: string;
  };
  /** Resume-tailoring wizard (FR-WIZARD-01/02/03/05). */
  readonly wizard: {
    /** Submit CTA on the analyze step (CV + JD → analysis). */
    readonly analyzeAction: string;
    /** Step-indicator labels (FR-WIZARD-05). */
    readonly stepsLabel: string;
    readonly stepAnalyze: string;
    readonly stepConfirm: string;
    readonly stepClarify: string;
    readonly stepGenerate: string;
    readonly stepExport: string;
    /** Confirm step: review score + checklist, then proceed (FR-WIZARD-01). */
    readonly confirmHeading: string;
    readonly confirmLead: string;
    readonly confirmAction: string;
    /** Clarify step (FR-WIZARD-02/03). */
    readonly clarifyRegionLabel: string;
    readonly clarifyHeading: string;
    readonly clarifyLead: string;
    readonly answerPlaceholder: string;
    readonly skipAction: string;
    readonly declineAction: string;
    readonly skippedLabel: string;
    readonly declinedLabel: string;
    /** Proceed-to-generation CTA (never blocks, FR-WIZARD-03). */
    readonly clarifySubmitAction: string;
    /** Shown while the generation phase streams. */
    readonly generating: string;
    /** Reset the wizard back to the analyze step. */
    readonly startOverAction: string;
  };
  /** Export step (FR-EXPORT-01/02/03/04). */
  readonly export: {
    /** Document title placed at the top of exported files. */
    readonly headline: string;
    /** Free-tier attribution footer; omitted for paid exports (FR-EXPORT-04). */
    readonly footer: string;
    readonly copyAction: string;
    readonly pdfAction: string;
    readonly docxAction: string;
    /** Confirmation after a successful clipboard copy. */
    readonly copiedNotice: string;
    /** Shown while a download is being generated. */
    readonly pending: string;
    /** Calm failure copy when an export could not be produced (NFR-OBS-01). */
    readonly error: string;
    /** Cover-letter export (add-tailoring-intelligence §4, FR-COVERLETTER-02). */
    readonly coverLetter: {
      /** Download-cover-letter button label. */
      readonly action: string;
      /** Title placed at the top of the cover-letter document. */
      readonly headline: string;
      /** Neutral opening line — framing, not a claim. */
      readonly greeting: string;
      /** Connective line introducing the grounded highlights. */
      readonly intro: string;
      /** Neutral closing line. */
      readonly closing: string;
    };
  };
  /** Tailoring history (add-tailoring-history, FR-HISTORY-01/02, FR-TAILOR-04). */
  readonly history: {
    /** List page title + short intro. */
    readonly title: string;
    readonly lead: string;
    /** Empty state (paid user, no tailorings yet) + its CTA to start one. */
    readonly empty: string;
    readonly emptyCta: string;
    /** Fallback label when a stored tailoring has no extracted job title. */
    readonly untitled: string;
    /** Per-row match-score label + open action. */
    readonly scoreLabel: string;
    readonly openAction: string;
    /** Detail page: back-to-list link + short lead. */
    readonly backToList: string;
    readonly detailLead: string;
    /** Paid gate surfaced to a free user (history is paid-only, FR-TAILOR-04). */
    readonly lockedTitle: string;
    readonly lockedLead: string;
    readonly lockedCta: string;
    /** Calm failure copy (NFR-OBS-01). */
    readonly loadError: string;
  };
  /** Legal pages (add-legal-pages): Privacy Policy + public offer, BC-PRIVACY-01/02, NFR-GDPR-01/02. */
  readonly legal: {
    /** Draft banner shown until legal-counsel sign-off (removed at publish). */
    readonly draftNote: string;
    readonly privacy: LegalDoc;
    readonly offer: LegalDoc;
  };
  /**
   * Marketing landing copy (extract-landing-i18n, FR-SALES-01/02/03, NFR-I18N-01).
   * Text only; structural data (accent, status, grounding, price, hrefs) stays in
   * views/landing/lib/content.ts. Collections are keyed by stable id, never
   * index-zipped. Rendered as `en` until task 10 wires Cyrillic fonts.
   */
  readonly landing: {
    /** Header/footer nav link labels. */
    readonly nav: { readonly how: string; readonly pricing: string; readonly faq: string };
    /** Footer legal link labels. */
    readonly legal: { readonly privacy: string; readonly publicOffer: string };
    /** Hero: problem-first headline split into lead + emphasized fragment + tail. */
    readonly hero: {
      readonly kicker: string;
      readonly headlineLead: string;
      readonly headlineEmphasis: string;
      readonly headlineTail: string;
      readonly lead: string;
      readonly ctaPrimary: string;
      readonly ctaSecondary: string;
      readonly note: string;
    };
    /** Static demo card in the hero (example data only). */
    readonly demo: {
      /** Accessible label for the demo card. */
      readonly cardLabel: string;
      /** "Requirement:" prefix above the demo bullets. */
      readonly requirementPrefix: string;
      /** The example job requirement. */
      readonly requirement: string;
      /** Caption under the demo match score. */
      readonly scoreCaption: string;
      /** A grounded ("Vouched") bullet and an overclaim-risk (excluded) bullet. */
      readonly owned: { readonly text: string; readonly label: string };
      readonly ledTeam: { readonly text: string; readonly label: string };
    };
    /** Three honesty pillars. */
    readonly pillars: {
      readonly head: SectionHeadCopy;
      readonly grounded: { readonly title: string; readonly body: string };
      readonly checklist: { readonly title: string; readonly body: string };
      readonly overclaim: { readonly title: string; readonly body: string };
    };
    /** Grounded before/after rewrites. */
    readonly beforeAfter: {
      readonly head: SectionHeadCopy;
      /** Column labels above the original line and the tailored rewrite. */
      readonly yourCvLabel: string;
      readonly tailoredLabel: string;
      readonly payments: {
        readonly before: string;
        readonly after: string;
        readonly label: string;
      };
      readonly leadership: {
        readonly before: string;
        readonly after: string;
        readonly label: string;
      };
    };
    /** Match-score checklist preview (five statuses). */
    readonly checklist: {
      readonly head: SectionHeadCopy;
      /** Headline + subtext inside the match-score donut. */
      readonly headline: string;
      readonly subtext: string;
      readonly rows: {
        readonly rn: { readonly requirement: string; readonly rationale: string };
        readonly ts: { readonly requirement: string; readonly rationale: string };
        readonly graphql: { readonly requirement: string; readonly rationale: string };
        readonly node: { readonly requirement: string; readonly rationale: string };
        readonly aws: { readonly requirement: string; readonly rationale: string };
        readonly mgmt: { readonly requirement: string; readonly rationale: string };
      };
    };
    /** How-it-works: three numbered steps. */
    readonly steps: {
      readonly head: SectionHeadCopy;
      readonly load: { readonly title: string; readonly body: string };
      readonly paste: { readonly title: string; readonly body: string };
      readonly exportStep: { readonly title: string; readonly body: string };
    };
    /** Pricing table: three plans. */
    readonly pricing: {
      readonly head: SectionHeadCopy;
      readonly free: {
        readonly name: string;
        readonly cadence: string;
        readonly features: readonly string[];
        readonly cta: string;
      };
      readonly pro: {
        readonly name: string;
        readonly cadence: string;
        readonly features: readonly string[];
        readonly cta: string;
        readonly badge: string;
      };
      readonly pass: {
        readonly name: string;
        readonly cadence: string;
        readonly features: readonly string[];
        readonly cta: string;
      };
    };
    /** FAQ accordion (six questions). */
    readonly faq: {
      readonly head: SectionHeadCopy;
      readonly fabricate: { readonly question: string; readonly answer: string };
      readonly train: { readonly question: string; readonly answer: string };
      readonly coverLetter: { readonly question: string; readonly answer: string };
      readonly attach: { readonly question: string; readonly answer: string };
      readonly chatgpt: { readonly question: string; readonly answer: string };
      readonly pass: { readonly question: string; readonly answer: string };
    };
    /** Final CTA panel. */
    readonly finalCta: {
      readonly headline: string;
      readonly subtext: string;
      readonly cta: string;
    };
    /** Footer attribution line. */
    readonly footer: { readonly anthropicCredit: string };
  };
}

/** A section eyebrow + heading (+ optional lead) shared across landing sections. */
export interface SectionHeadCopy {
  readonly kicker: string;
  readonly title: string;
  readonly lead?: string;
}

/** One legal document rendered by views/legal (Ukrainian-first). */
export interface LegalDoc {
  /** Page + document title (also the <h1> and meta title). */
  readonly title: string;
  /** Meta description for the route. */
  readonly description: string;
  /** Human "last updated" line. */
  readonly updated: string;
  /** Short intro paragraph under the title. */
  readonly intro: string;
  /** Ordered sections: a heading and one or more paragraphs. */
  readonly sections: readonly { readonly heading: string; readonly paragraphs: readonly string[] }[];
}
