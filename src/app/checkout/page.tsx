// /checkout route — thin App Router leaf (system-design 5.2): the payments
// emulator's local checkout screen (add-payments-emulator task 1.2). Dev/demo
// only: 404s outright when the emulator is disabled (production — the real MoR
// hosts its own checkout) or when the session token is missing/tampered. The
// token is verified server-side so the client only ever renders a session the
// server vouched for.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/app/auth";
import { getPaymentsWebhookSecret, isPaymentsEmulatorEnabled } from "@/shared/config";
import { LOCALE_COOKIE, parseLocale, t } from "@/shared/lib/i18n";
import { verifyCheckoutToken } from "@/shared/lib/payments";
import { CheckoutView } from "@/views/checkout";
import { TopBar } from "@/widgets/top-bar";

export const metadata: Metadata = {
  title: t("ua").checkout.title,
  robots: { index: false, follow: false },
};

interface CheckoutPageProps {
  readonly searchParams: Promise<{ token?: string | string[] }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  if (!isPaymentsEmulatorEnabled()) notFound();

  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : "";
  // A misconfigured PAYMENTS_WEBHOOK_SECRET must 404 like any other invalid
  // token, never a raw 500 (NFR-OBS-01) — mirrors the route handlers' guard.
  let session: ReturnType<typeof verifyCheckoutToken> = null;
  if (raw !== "") {
    try {
      session = verifyCheckoutToken(raw, getPaymentsWebhookSecret());
    } catch {
      session = null;
    }
  }
  if (session === null) notFound();

  // Resolve locale only once past the 404 guards (no cookie read on 404 paths).
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  // Resolve the session like the sibling app-layer routes (/tailor,
  // /account/billing) so the top bar shows signed-in vs anonymous state
  // instead of always falling back to the anonymous "Sign in" branch. This is
  // display-only: the write path still trusts the HMAC-signed token, so no
  // blocking token-vs-session IDOR check is added here (a hard check would
  // regress completion when the auth cookie is absent). Follow-up noted.
  const authSession = await auth();
  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar user={authSession?.user ?? null} locale={locale} />
      <main className="flex flex-1 justify-center px-6 py-12">
        <CheckoutView locale={locale} plan={session.plan} returnTo={session.returnTo} token={raw} />
      </main>
    </div>
  );
}
