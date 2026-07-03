// /checkout route — thin App Router leaf (system-design 5.2): the payments
// emulator's local checkout screen (add-payments-emulator task 1.2). Dev/demo
// only: 404s outright when the emulator is disabled (production — the real MoR
// hosts its own checkout) or when the session token is missing/tampered. The
// token is verified server-side so the client only ever renders a session the
// server vouched for.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPaymentsWebhookSecret, isPaymentsEmulatorEnabled } from "@/shared/config";
import { t } from "@/shared/lib/i18n";
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
  const session = raw === "" ? null : verifyCheckoutToken(raw, getPaymentsWebhookSecret());
  if (session === null) notFound();

  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar />
      <main className="flex flex-1 justify-center px-6 py-12">
        <CheckoutView plan={session.plan} returnTo={session.returnTo} token={raw} />
      </main>
    </div>
  );
}
