// /history route — thin App Router leaf (system-design 5.2): session gate + the
// paid gate + one view slice. History is a paid feature (FR-TAILOR-04): an
// anonymous visitor is sent to sign-in; a signed-in free user sees the upgrade
// surface; a paid user sees their list. Summaries are read server-side via the
// history service (same code the API route uses). An unreadable subscription
// degrades to the free (locked) surface, never a failure page (NFR-OBS-01).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import { createSubscriptionRepo, createTailoringRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { LOCALE_COOKIE, parseLocale, t } from "@/shared/lib/i18n";
import { listHistory } from "@/shared/lib/tailoring-history";
import { HistoryListView, HistoryLockedView } from "@/views/history";
import { TopBar } from "@/widgets/top-bar";

export const metadata: Metadata = {
  title: t("ua").history.title,
  robots: { index: false, follow: false },
};

export default async function HistoryPage() {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (userId === null) redirect("/sign-in");

  let paid = false;
  try {
    const subscription = await createSubscriptionRepo(getDb()).get(userId);
    paid = hasPaidAccess(subscription, new Date().toISOString());
  } catch {
    paid = false;
  }

  let content = <HistoryLockedView locale={locale} />;
  if (paid) {
    let summaries: Awaited<ReturnType<typeof listHistory>> = [];
    try {
      summaries = await listHistory({ tailorings: createTailoringRepo(getDb()) }, userId);
    } catch (cause) {
      // Calm degradation (NFR-OBS-01): render the empty list rather than crash;
      // the cause is logged server-side only.
      console.error("[history] list failed", cause);
    }
    content = <HistoryListView summaries={summaries} locale={locale} />;
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar user={session?.user ?? null} locale={locale} />
      {content}
    </div>
  );
}
