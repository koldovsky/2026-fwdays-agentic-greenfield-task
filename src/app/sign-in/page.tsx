// /sign-in route — thin App Router leaf (system-design 5.2): session check +
// one view slice (FR-AUTH-01). An already-signed-in user is sent on to their
// destination. A `callbackUrl` search param (set by the /tailor auth gate)
// carries the post-auth destination through both the "already signed in"
// redirect and the form's own redirectTo — but ONLY after an open-redirect
// guard (NFR-SEC-04): a same-origin relative path ("/…" but not "//…") is
// honored, anything else falls back to /tailor.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUserId } from "@/app/auth";
import { LOCALE_COOKIE, parseLocale, t } from "@/shared/lib/i18n";
import { SignInView } from "@/views/auth";
import { TopBar } from "@/widgets/top-bar";

const DEFAULT_REDIRECT = "/tailor";

/**
 * Resolve a safe post-auth destination from an untrusted callbackUrl param.
 * Only a same-origin relative path is accepted: it must start with a single
 * "/" and not "//" (protocol-relative) or "/\" — otherwise a caller could
 * craft `?callbackUrl=https://evil.example` or `//evil.example` and turn the
 * sign-in flow into an open redirect. Anything unsafe falls back to /tailor.
 */
function safeCallbackUrl(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return DEFAULT_REDIRECT;
  if (!value.startsWith("/")) return DEFAULT_REDIRECT;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_REDIRECT;
  return value;
}

export const metadata: Metadata = {
  title: t("ua").auth.signInTitle,
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited (page.js contract).
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  if ((await currentUserId()) !== null) redirect(callbackUrl);
  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar locale={locale} />
      <main className="flex flex-1 justify-center px-6 py-12">
        <SignInView locale={locale} redirectTo={callbackUrl} />
      </main>
    </div>
  );
}
