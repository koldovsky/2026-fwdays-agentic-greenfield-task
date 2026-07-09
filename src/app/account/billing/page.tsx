// /account/billing route — thin App Router leaf (system-design 5.2): session
// gate + one view slice (add-payments-emulator tasks 3.1–3.3, FR-BILLING-01).
// The session is resolved server-side like /tailor; an anonymous visitor is
// sent to sign-in. The subscription snapshot is read here (app layer) so the
// widget below renders pure state. A failed read degrades to the Free view —
// calm, and never grants access it can't verify (NFR-OBS-01).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import type { SubscriptionAccess } from "@/entities/subscription";
import { t } from "@/shared/lib/i18n";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { AccountBillingView } from "@/views/account-billing";
import { TopBar } from "@/widgets/top-bar";

export const metadata: Metadata = {
  title: t("ua").billing.title,
  robots: { index: false, follow: false },
};

export default async function AccountBillingPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (userId === null) redirect("/sign-in");

  let subscription: SubscriptionAccess | null = null;
  try {
    subscription = await createSubscriptionRepo(getDb()).get(userId);
  } catch {
    // Unreadable state renders as Free — the strict default, never partial
    // access (FR-BILLING-03 discipline); no raw failure page (NFR-OBS-01).
    subscription = null;
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar user={session?.user ?? null} />
      <AccountBillingView subscription={subscription} />
    </div>
  );
}
