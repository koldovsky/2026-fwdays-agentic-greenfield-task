import Link from "next/link";

import { ConfirmedBookingsList } from "@/components/booking/confirmed-bookings-list";
import { SiteHeaderWithAuth } from "@/components/shell/site-header-auth";

export default function BookingsPage() {
  return (
    <>
      <SiteHeaderWithAuth active="bookings" />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950">My bookings</h1>
            <p className="mt-2 text-zinc-600">
              Confirmed MHOA reservations. Entries disappear automatically after the slot ends.
            </p>
          </div>
          <Link
            href="/book"
            className="rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            New booking
          </Link>
        </div>
        <ConfirmedBookingsList />
        <p className="mt-8 text-center text-xs text-zinc-500">
          To cancel a reservation, contact MHOA directly —{" "}
          <a className="text-violet-700 underline" href="mailto:reception@mahoganyhoa.com">
            reception@mahoganyhoa.com
          </a>
        </p>
      </main>
    </>
  );
}
