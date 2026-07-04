import Link from "next/link";

import { ScheduledJobsPanel } from "@/components/booking/scheduled-jobs-panel";
import { SiteHeaderWithAuth } from "@/components/shell/site-header-auth";

export default function ScheduledPage() {
  return (
    <>
      <SiteHeaderWithAuth active="scheduled" />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950">
              Scheduled bookings
            </h1>
            <p className="mt-2 text-zinc-600">
              Queued for dates outside MHOA&apos;s 7-day window. Cron submits when each date
              opens.
            </p>
          </div>
          <Link
            href="/book"
            className="rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            New booking
          </Link>
        </div>
        <ScheduledJobsPanel variant="page" />
      </main>
    </>
  );
}
