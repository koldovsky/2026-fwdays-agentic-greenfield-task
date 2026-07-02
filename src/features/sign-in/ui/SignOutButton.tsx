"use client";

// Sign-out control (add-auth 3.2): destroys the Auth.js session and returns
// to the landing page; subsequent requests are anonymous.
import { signOut } from "next-auth/react";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

export interface SignOutButtonProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function SignOutButton({ locale = "ua" }: SignOutButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void signOut({ redirectTo: "/" });
      }}
    >
      {t(locale).auth.signOutAction}
    </Button>
  );
}
