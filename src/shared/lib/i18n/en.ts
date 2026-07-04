// English fallback (NFR-I18N-01) — same keys as ua.
import type { Dictionary } from "./types";

export const en: Dictionary = {
  app: {
    name: "Vouch",
  },
  action: {
    tailor: "Tailor",
  },
  checklist: {
    statusLabel: {
      met: "Met",
      partial: "Partial",
      info: "Coverable",
      gap: "Gap",
      "overclaim-risk": "Overclaim risk",
    },
    scoreHeadline: "Job match",
  },
  bullets: {
    listLabel: "Tailored bullets",
    includeInExport: "Include in export",
    excludedFromExport: "Excluded from export",
    source: "Source",
    sourceCv: "From your CV",
    sourceUserConfirmed: "Confirmed by you",
  },
  result: {
    regionLabel: "Tailoring result",
    eyebrow: "Result",
    title: "Tailored profile",
  },
  workspace: {
    lead: "Check the job match and choose which bullets to export.",
    cvLabel: "Résumé text",
    jdLabel: "Job description",
    emptyState: "Your result will appear here after tailoring.",
  },
  uploadCv: {
    dropLabel: "Drag your resume file here",
    hint: "PDF or DOCX, up to 5 MB",
    browseAction: "Browse files",
    pending: "Extracting text from your file",
    error: {
      unsupportedType: "Only PDF and DOCX files are supported.",
      tooLarge: "The file is too large. The maximum size is 5 MB.",
      unparseable: "We could not read text from this file. Paste your resume below instead.",
      failed: "The upload failed. Try again.",
    },
    attach: {
      addOriginalPdf: "Attach the original PDF for a better result",
      premiumBadge: "Premium",
      attachedLabel: "Original PDF attached to generation",
      remove: "Remove",
      tooLarge: "That PDF is too large to attach. The maximum size is 3 MB.",
    },
  },
  tailorRun: {
    queued: "Queued",
    processing: "Tailoring your résumé",
    done: "Done",
    failed: "We could not tailor your résumé. Try again — this attempt was not counted.",
    emptyInput: "Add your résumé text and the job description.",
    rateLimited: "You have reached the free tailoring limit. Sign in or upgrade to continue.",
  },
  auth: {
    signInTitle: "Sign in",
    signUpTitle: "Create account",
    lead: "One free tailoring works without an account. Sign in is only needed to export.",
    emailLabel: "Email",
    passwordLabel: "Password",
    nameLabel: "Name (optional)",
    signInAction: "Sign in",
    signUpAction: "Create account",
    signOutAction: "Sign out",
    noAccountPrompt: "No account yet?",
    haveAccountPrompt: "Already have an account?",
    error: {
      invalidCredentials: "Sign-in failed. Check your email and password.",
      emailTaken: "This email is already registered. Try signing in.",
      invalidEmail: "Enter a valid email address.",
      weakPassword: "Password must be at least 8 characters.",
      generic: "Something went wrong. Try again.",
    },
  },
  checkout: {
    title: "Checkout",
    emulatorNotice: "Test payment mode. No real charge is made.",
    planLabel: "Plan",
    planName: {
      pro: "Pro",
      job_hunt_pass: "Job-hunt Pass",
    },
    planPrice: {
      pro: "$12 per month",
      job_hunt_pass: "$19 one-time, 30 days",
    },
    succeedAction: "Simulate a successful payment",
    failAction: "Simulate a failed payment",
    pending: "Processing the payment",
    redirecting: "Done. Taking you back",
    declined: "The payment was declined. Nothing was charged and your access is unchanged.",
    retryAction: "Try again",
    error: "Something went wrong. Try again.",
    termsPrefix: "By paying you accept our",
    termsLink: "public offer",
  },
  paywall: {
    regionLabel: "Upgrade",
    title: "Unlock full access",
    exportLead: "Export is available on paid plans. Choose a plan to continue.",
    limitLead: "You have reached the free tailoring limit. Choose a plan to continue.",
    attachLead: "Attaching the original PDF is available on paid plans. Choose a plan to continue.",
    dismissAction: "Not now",
  },
  upgrade: {
    planFeature: {
      pro: "Unlimited tailorings and clean PDF + DOCX export.",
      job_hunt_pass: "Everything in Pro for 30 days, no subscription.",
    },
    chooseAction: {
      pro: "Choose Pro",
      job_hunt_pass: "Choose Job-hunt Pass",
    },
    pending: "Opening checkout",
    error: "We could not start the checkout. Try again.",
  },
  billing: {
    title: "Plan and billing",
    lead: "Manage your subscription, invoices, and cancellation.",
    currentPlanLabel: "Current plan",
    planName: {
      free: "Free",
      pro: "Pro",
      job_hunt_pass: "Job-hunt Pass",
    },
    renewsOnLabel: "Next renewal",
    expiresOnLabel: "Valid until",
    accessUntilLabel: "Access until",
    canceledNote:
      "Your subscription is canceled. At the end of the period you move to Free: your tailorings stay readable, but export is gated.",
    freeNote: "You are on the Free plan. Choose a plan to unlock export and unlimited tailorings.",
    upgradeTitle: "Upgrade your plan",
    invoicesTitle: "Invoices",
    noInvoices: "No invoices yet.",
    invoicePaidLabel: "Paid",
    cancelAction: "Cancel subscription",
    cancelPending: "Canceling",
    cancelError: "We could not cancel the subscription. Try again.",
  },
  topBar: {
    homeLabel: "Vouch home",
    accountLabel: "Account",
    signIn: "Sign in",
    tryFree: "Try free",
    navFeatures: "Features",
    navPricing: "Pricing",
  },
  accountMenu: {
    triggerLabel: "Account menu",
    profile: "Profile",
    tailoring: "Tailoring",
    history: "Tailoring history",
    usage: "Usage",
    subscription: "Subscription",
    logout: "Log out",
    comingSoon: "coming soon",
  },
  profile: {
    title: "Profile",
    lead: "Your account and data.",
    nameLabel: "Name",
    emailLabel: "Email",
    planLabel: "Current plan",
    viewSubscription: "Manage subscription",
    referTitle: "Refer a friend",
    referLead: "Soon you'll be able to share Vouch and earn rewards for friends who join.",
    dataTitle: "Your data",
    dataLead: "Download a copy of your data, or permanently delete your account.",
    exportAction: "Download my data",
    deleteAction: "Delete account",
    deleteConfirmPrompt:
      "Delete your account for good? Your CVs, tailorings, and subscription are erased. This can't be undone.",
    deleteConfirmAction: "Yes, delete",
    deleteCancelAction: "Cancel",
    deletePending: "Deleting",
    deleteError: "We could not delete your account. Try again.",
  },
  wizard: {
    analyzeAction: "Analyze",
    stepsLabel: "Tailoring steps",
    stepAnalyze: "Analyze",
    stepConfirm: "Confirm",
    stepClarify: "Clarify",
    stepGenerate: "Generate",
    stepExport: "Export",
    confirmHeading: "Review the match",
    confirmLead:
      "Here is how well your résumé matches the job. Bullets are rewritten only after you confirm.",
    confirmAction: "Continue",
    clarifyRegionLabel: "Clarifying questions",
    clarifyHeading: "A few clarifications",
    clarifyLead:
      "Tell us about experience your résumé doesn't cover. Your answers become a separate evidence source for tailoring. Any question can be skipped.",
    answerPlaceholder: "Briefly describe a specific example",
    skipAction: "Skip",
    declineAction: "No experience",
    skippedLabel: "Skipped",
    declinedLabel: "No experience",
    clarifySubmitAction: "Tailor résumé",
    generating: "Tailoring your résumé",
    startOverAction: "Start over",
  },
  export: {
    headline: "Tailored résumé",
    footer: "Tailored with Vouch",
    copyAction: "Copy",
    pdfAction: "Download PDF",
    docxAction: "Download DOCX",
    copiedNotice: "Copied",
    pending: "Preparing file",
    error: "Export failed. Try again.",
    coverLetter: {
      action: "Cover letter",
      headline: "Cover letter",
      greeting: "Hello,",
      intro: "Here is a short summary of the experience relevant to this role.",
      closing: "I would be glad to discuss the details. Best regards.",
    },
  },
  history: {
    title: "Tailoring history",
    lead: "Your saved résumé tailorings. Open any one to review its checklist and bullets.",
    empty: "You haven’t saved any tailorings yet. Finish a tailoring and it will appear here.",
    emptyCta: "Start a tailoring",
    untitled: "Untitled role",
    scoreLabel: "Match",
    openAction: "Open",
    backToList: "Back to history",
    detailLead: "A saved tailoring in review mode.",
    lockedTitle: "History is a paid feature",
    lockedLead:
      "Saved tailoring history is available on the Pro and Job-hunt Pass plans. The free plan shows only your current result.",
    lockedCta: "Upgrade to Pro",
    loadError: "Could not load your history. Please try again later.",
  },
  legal: {
    draftNote: "Draft: this copy is pending legal-counsel sign-off and is not final.",
    privacy: {
      title: "Privacy Policy",
      description: "What data Vouch holds, how it is protected, and how you control it.",
      updated: "Updated: 4 July 2026",
      intro:
        "Vouch tailors your résumé honestly and respects your data. Below is what we store, how we protect it, and the rights you have.",
      sections: [
        {
          heading: "What we store",
          paragraphs: [
            "Account: your email address and name.",
            "Résumé: your CV text, stored encrypted at rest.",
            "Tailoring history: the saved results of your tailoring runs.",
          ],
        },
        {
          heading: "How we protect your data",
          paragraphs: [
            "CV text is personal data. It is encrypted at rest (AES-256-GCM) and never logged in plaintext.",
            "We never use your résumé to train models.",
            "No third-party trackers or analytics run on any page.",
          ],
        },
        {
          heading: "Your rights (GDPR)",
          paragraphs: [
            "You can export all your stored data (résumé profile and tailoring history) as JSON.",
            "You can permanently delete your account and all associated data; deletion propagates within 24 hours.",
            "Exercise both from the Profile section of your account.",
          ],
        },
      ],
    },
    offer: {
      title: "Public Offer",
      description: "The terms of service and plans for Vouch.",
      updated: "Updated: 4 July 2026",
      intro:
        "This public offer describes the terms of using Vouch. By completing payment you accept these terms.",
      sections: [
        {
          heading: "Parties and service",
          paragraphs: [
            "Vouch (the “Service”) provides online résumé tailoring to job descriptions. The User is the person using the Service.",
          ],
        },
        {
          heading: "Plans",
          paragraphs: [
            "Free — one free tailoring.",
            "Pro — a subscription with full access to tailoring and export.",
            "Job-hunt Pass — access for a fixed period.",
            "Current prices are shown on the pricing page.",
          ],
        },
        {
          heading: "Payment and refunds",
          paragraphs: [
            "Payment is processed by a payments provider (Stripe; test mode at this stage).",
            "Refund terms will be finalized after legal-counsel review.",
          ],
        },
        {
          heading: "Acceptance",
          paragraphs: ["Paying for a plan constitutes acceptance of this offer."],
        },
      ],
    },
  },
  landing: {
    nav: { how: "How it works", pricing: "Pricing", faq: "FAQ" },
    legal: { privacy: "Privacy", publicOffer: "Public offer" },
    hero: {
      kicker: "Honest resume tailoring",
      headlineLead: "Generic AI writes resumes you ",
      headlineEmphasis: "can't defend",
      headlineTail: " in the interview.",
      lead: "It invents skills, numbers, and roles you never had, and you find out when a recruiter asks. Vouch tailors your resume to each job and grounds every line in your real experience, so what you send is what you can stand behind.",
      ctaPrimary: "Tailor my CV, free",
      ctaSecondary: "See how it works",
      note: "First tailoring is free. No account needed to try it.",
    },
    demo: {
      cardLabel: "Example of a tailored bullet",
      requirementPrefix: "Requirement:",
      requirement: "5+ yrs React Native, native modules",
      scoreCaption: "match to this job, 7 of 9 requirements met",
      owned: {
        text: "Owned the mobile stack end-to-end on a production React Native app: IAP, push/VoIP, and custom native modules across iOS and Android.",
        label: "Vouched · backed by 3 lines in your CV",
      },
      ledTeam: {
        text: "Led a team of 12 engineers across 4 squads.",
        label: "No evidence found · excluded from export",
      },
    },
    pillars: {
      head: {
        kicker: "Why Vouch",
        title: "Built to keep you honest, and hireable",
        lead: "Every other tool optimizes for keywords and speed. Vouch optimizes for what you can stand behind in the interview.",
      },
      grounded: {
        title: "Grounded in your CV",
        body: "Every rewritten bullet links back to a real sentence in your resume. The model is forbidden from inventing skills, numbers, or roles you never had.",
      },
      checklist: {
        title: "A checklist for every requirement",
        body: "See each job requirement scored met, partial, gap, or overclaim-risk, with a one-line reason drawn straight from your experience.",
      },
      overclaim: {
        title: "Overclaim, flagged",
        body: "Anything we can't back gets marked and left out of your export by default. You decide what goes in, nothing sneaks past you onto the page.",
      },
    },
    beforeAfter: {
      head: {
        kicker: "Grounded rewrites",
        title: "Tailored, not invented",
        lead: "Vouch sharpens what's already true. Your original line stays the source; the rewrite stretches toward the job without drifting off your record.",
      },
      yourCvLabel: "Your CV",
      tailoredLabel: "Tailored for this job",
      payments: {
        before:
          "Worked on payments and subscriptions for a mobile app, including some native bridging work.",
        after:
          "Built and shipped in-app purchases and subscription flows in React Native, including custom native modules for iOS and Android billing.",
        label: "Vouched · linked to your CV",
      },
      leadership: {
        before: "Collaborated with two other engineers on the mobile features.",
        after: "Directed a 12-person mobile org and set the multi-year platform roadmap.",
        label: "No evidence found · excluded from export",
      },
    },
    checklist: {
      head: {
        kicker: "The checklist",
        title: "Know exactly where you stand",
        lead: "Before you send anything, Vouch shows you the honest match, requirement by requirement.",
      },
      headline: "Strong fit, honestly scored",
      subtext:
        "Met, coverable, partial, gap. Blue is coverable: adjacent evidence you can raise in a cover letter, not a hard miss.",
      rows: {
        rn: {
          requirement: "React Native, production apps",
          rationale: "7 years across IAP, push/VoIP, and native modules in your CV.",
        },
        ts: {
          requirement: "TypeScript",
          rationale: "Primary language on Konnect and side projects.",
        },
        graphql: {
          requirement: "GraphQL",
          rationale:
            "No direct GraphQL, but your REST and Apollo-client work is adjacent. Raise it in a cover letter.",
        },
        node: {
          requirement: "Node / backend ownership",
          rationale: "NestJS experience present, but limited end-to-end backend evidence.",
        },
        aws: {
          requirement: "AWS infrastructure at scale",
          rationale: "No cloud-infra signal found in your CV.",
        },
        mgmt: {
          requirement: "People management",
          rationale: "Coordinating peers is not managing reports, don't claim the latter.",
        },
      },
    },
    steps: {
      head: { kicker: "How it works", title: "Three steps, two minutes" },
      load: {
        title: "Load your CV",
        body: "Upload a PDF or DOCX, or paste it in. Vouch parses it into a structured profile you confirm.",
      },
      paste: {
        title: "Paste the job",
        body: "Drop in the posting. Vouch pulls out every requirement and labels it must-have or nice-to-have.",
      },
      exportStep: {
        title: "Export what you can defend",
        body: "In seconds you get the checklist, grounded rewrites, and clean PDF or DOCX exports, plus a grounded cover letter. Overclaims stay out, and every run is saved to your history to reopen later.",
      },
    },
    pricing: {
      head: {
        kicker: "Pricing",
        title: "Honest pricing, too",
        lead: "The real renewal price, shown in plain numbers. No build-it-free-then-paywall-the-download games.",
      },
      free: {
        name: "Free",
        cadence: "2 tailorings, lifetime",
        features: [
          "Full match checklist",
          "Grounded rewrites + overclaim flags",
          "Copy to clipboard",
        ],
        cta: "Start free",
      },
      pro: {
        name: "Pro",
        cadence: "per month, renews at $12",
        features: [
          "Unlimited tailorings",
          "Clean PDF + DOCX export",
          "Tailor from your original PDF, not just its text",
          "Tailoring history + cover letters",
          "Priority generation",
        ],
        cta: "Go Pro",
        badge: "Popular",
      },
      pass: {
        name: "Job-hunt Pass",
        cadence: "one-time · 30 days",
        features: ["Everything in Pro", "No subscription", "Built for a focused sprint"],
        cta: "Get the pass",
      },
    },
    faq: {
      head: { kicker: "FAQ", title: "The honest questions" },
      fabricate: {
        question: "Will it make things up to fit the job?",
        answer:
          "No, that's the entire point of Vouch. The model is instructed never to introduce skills, numbers, or experience that aren't in your CV, and a second pass flags anything it can't ground. Unbacked lines are excluded from your export unless you knowingly add them back.",
      },
      train: {
        question: "Do you train on my resume?",
        answer:
          "No. Your CV is personal data. It's encrypted at rest, never used to train models, and deletable on request. We don't load third-party trackers on any page.",
      },
      coverLetter: {
        question: "Can it write my cover letter too?",
        answer:
          "Yes. Pro turns your vouched, grounded bullets into a cover letter for the role, drawing only on what your CV supports, so it stays as honest as the resume. Every tailoring is also saved to your history, so you can reopen and reuse past results.",
      },
      attach: {
        question: "Can I attach my original PDF?",
        answer:
          "Yes, on Pro. Extraction turns your CV into plain text and drops the structure the original carried, so Pro lets you attach the original PDF and the tailor works from your full document, layout and detail included, for a more faithful rewrite. It only widens what the tailor reads while writing: the attached PDF never enters the grounding pass and never adds experience your CV doesn't support, so the result stays as honest as always.",
      },
      chatgpt: {
        question: "How is this different from ChatGPT?",
        answer:
          "A blank chat will happily invent a decade of experience you don't have. Vouch is built around the opposite constraint: it shows its evidence, scores every requirement, and refuses to write claims your CV can't support.",
      },
      pass: {
        question: "What's the Job-hunt Pass?",
        answer:
          "A one-time 30-day unlock with everything in Pro and no recurring charge. Job hunts come in bursts, the pass fits a focused sprint without signing you up for a subscription you'll forget to cancel.",
      },
    },
    finalCta: {
      headline: "Tailor a resume you can defend",
      subtext:
        "Paste a job, load your CV, and see the honest match in under two minutes. Your first tailoring is free.",
      cta: "Tailor my CV, free",
    },
    footer: { anthropicCredit: "Grounded responses powered by the Anthropic API." },
  },
};
