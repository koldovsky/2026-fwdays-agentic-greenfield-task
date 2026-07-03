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
  topBar: {
    homeLabel: "Vouch home",
    accountLabel: "Account",
    signIn: "Sign in",
    tryFree: "Try free",
    navFeatures: "Features",
    navPricing: "Pricing",
  },
};
