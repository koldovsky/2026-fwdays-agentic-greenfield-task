// /history/:id route — thin App Router leaf (system-design 5.2): re-open one
// stored tailoring (FR-HISTORY-02). Session + paid gate as on the list; the read
// is owner-scoped via getHistoryItem, so a tailoring the caller does not own
// (or a missing id) resolves to Next's 404 — existence is never disclosed
// (IDOR, NFR-SEC-02).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import { createSubscriptionRepo, createTailoringRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { LOCALE_COOKIE, parseLocale, t } from "@/shared/lib/i18n";
import { getHistoryItem } from "@/shared/lib/tailoring-history";
import { HistoryDetailView, HistoryLockedView } from "@/views/history";
import { TopBar } from "@/widgets/top-bar";

export const metadata: Metadata = {
  title: t("ua").history.title,
  robots: { index: false, follow: false },
};

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (!paid) {
    return (
      <div className="flex flex-1 flex-col bg-surface-warm font-body">
        <TopBar user={session?.user ?? null} locale={locale} />
        <HistoryLockedView locale={locale} />
      </div>
    );
  }

  const { id } = await params;
  let record: Awaited<ReturnType<typeof getHistoryItem>> = null;
  try {
    record = await getHistoryItem({ tailorings: createTailoringRepo(getDb()) }, userId, id);
  } catch (cause) {
    console.error("[history/:id] read failed", cause);
    notFound();
  }
  if (!record) notFound();

  return (
    <div className="flex flex-1 flex-col bg-surface-warm font-body">
      <TopBar user={session?.user ?? null} locale={locale} />
      <HistoryDetailView record={record} locale={locale} />
    </div>
  );
}
