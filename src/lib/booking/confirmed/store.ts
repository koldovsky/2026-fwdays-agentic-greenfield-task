import fs from "node:fs/promises";
import path from "node:path";

import type { SubmitSuccess } from "@/lib/booking/submit";
import { listScheduledJobs } from "@/lib/booking/schedule/store";

import { confirmedBookingFromSuccess } from "./record";
import { isBookingExpired } from "./expiry";
import type { ConfirmedBooking } from "./types";

const DATA_DIR = process.env.COLIBRI_DATA_DIR ?? path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "confirmed-bookings.json");

async function readStore(): Promise<ConfirmedBooking[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as ConfirmedBooking[];
  } catch {
    return [];
  }
}

async function writeStore(bookings: ConfirmedBooking[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

async function syncFromCompletedScheduledJobs(
  existing: ConfirmedBooking[],
): Promise<ConfirmedBooking[]> {
  const knownRunIds = new Set(existing.map((b) => b.runId));
  const jobs = await listScheduledJobs();
  const additions: ConfirmedBooking[] = [];

  for (const job of jobs) {
    if (job.status !== "completed" || !job.result || job.result.status !== "success") continue;
    if (knownRunIds.has(job.result.runId)) continue;

    additions.push(
      confirmedBookingFromSuccess(job.result as SubmitSuccess, {
        residentId: job.residentId === "other" ? null : job.residentId,
        source: "scheduled",
      }),
    );
    knownRunIds.add(job.result.runId);
  }

  if (additions.length === 0) return existing;
  return [...existing, ...additions];
}

function sortBookings(bookings: ConfirmedBooking[]): ConfirmedBooking[] {
  return [...bookings].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.slot.localeCompare(b.slot);
  });
}

export async function recordConfirmedBooking(booking: ConfirmedBooking): Promise<void> {
  const all = await readStore();
  if (all.some((b) => b.runId === booking.runId)) return;
  all.push(booking);
  await writeStore(all);
}

export async function recordConfirmedFromSuccess(
  success: SubmitSuccess,
  meta: Parameters<typeof confirmedBookingFromSuccess>[1],
): Promise<ConfirmedBooking | null> {
  if (success.status !== "success" || !success.mhoaApproved) return null;

  const all = await readStore();
  if (all.some((b) => b.runId === success.runId)) {
    return all.find((b) => b.runId === success.runId) ?? null;
  }

  const booking = confirmedBookingFromSuccess(success, meta);
  all.push(booking);
  await writeStore(all);
  return booking;
}

/** Active (non-expired) bookings; drops expired entries from the store. */
export async function listActiveConfirmedBookings(
  now: Date = new Date(),
): Promise<ConfirmedBooking[]> {
  let all = await readStore();
  all = await syncFromCompletedScheduledJobs(all);

  const active = all.filter((b) => !isBookingExpired(b, now));
  if (active.length !== all.length) {
    await writeStore(active);
  }

  return sortBookings(active);
}
