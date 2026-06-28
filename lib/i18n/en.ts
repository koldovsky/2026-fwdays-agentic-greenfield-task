import type { Messages } from "@/lib/i18n/uk";

/** English fallback (NFR-I18N-01). Same shape as `uk`; no runtime i18n library. */
export const en: Messages = {
  auth: {
    signInTitle: "Sign in to the cabinet",
    signInSubtitle: "Kolo360 internal assessment tool",
    emailLabel: "Work email",
    passwordLabel: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    invalidCredentials: "Wrong email or password",
    genericError: "Could not sign in. Please try again",
  },
};
