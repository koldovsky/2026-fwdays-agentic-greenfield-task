// /account/profile route — thin App Router leaf (system-design 5.2): session
// gate + one view slice. Mirrors /account/billing: session resolved server-side,
// anonymous visitors sent to sign-in, subscription snapshot read here so the
// view renders pure state. An unreadable subscription degrades to Free — calm,
// never granting access it can't verify (NFR-OBS-01).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import type { SubscriptionAccess } from "@/entities/subscription";
import { t } from "@/shared/lib/i18n";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { AccountProfileView } from "@/views/account-profile";
import { TopBar } from "@/widgets/top-bar";

export const metadata: Metadata = {
  title: t("ua").profile.title,
  robots: { index: false, follow: false },
};

export default async function AccountProfilePage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (userId === null) redirect("/sign-in");

  let subscription: SubscriptionAccess | null = null;
  try {
    subscription = await createSubscriptionRepo(getDb()).get(userId);
  } catch {
    subscription = null;
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar user={session?.user ?? null} />
      <AccountProfileView user={session?.user ?? { email: null }} subscription={subscription} />
    </div>
  );
}
