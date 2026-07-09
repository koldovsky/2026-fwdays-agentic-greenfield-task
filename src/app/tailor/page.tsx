// /tailor route — thin App Router leaf (system-design 5.2): renders exactly one
// view slice plus the shell top bar. TailorWorkspace is a client component that
// owns the interactive state; this page stays a server component. The session
// is read here (app layer) and passed down so the top bar shows signed-in vs
// anonymous state — but the route itself is NOT gated: an anonymous visitor
// completes one full tailoring, sign-in appears only at export (FR-ONBOARD-01).
//
// Paid entitlement (add-payments-emulator task 2.1, FR-PAYWALL-01/03) is also
// resolved here, server-side, from the subscription state the webhook synced —
// so returning from a successful checkout (full page load) re-renders the
// workspace unlocked. An unreadable subscription degrades to the stricter
// Free gate, never a failure page (NFR-OBS-01).
import { cookies } from "next/headers";

import { auth } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import { LOCALE_COOKIE, parseLocale } from "@/shared/lib/i18n";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { TailorWorkspace } from "@/views/tailor-workspace";
import { TopBar } from "@/widgets/top-bar";

// Render per-request, never from a cached prerender: this route reflects
// paid entitlement synced by the payments webhook (FR-PAYWALL-03), so a
// visitor returning from a successful checkout must see the freshly unlocked
// state, not a stale pre-payment render. Cache Components is not enabled, so
// the classic route-segment directive applies (next 16.2.9,
// caching-without-cache-components#route-segment-config).
export const dynamic = "force-dynamic";

export default async function TailorPage() {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let paid = false;
  if (userId !== null) {
    try {
      const subscription = await createSubscriptionRepo(getDb()).get(userId);
      paid = hasPaidAccess(subscription, new Date().toISOString());
    } catch {
      paid = false;
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar user={session?.user ?? null} locale={locale} />
      <main className="flex flex-1 justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <TailorWorkspace paid={paid} locale={locale} />
        </div>
      </main>
    </div>
  );
}
