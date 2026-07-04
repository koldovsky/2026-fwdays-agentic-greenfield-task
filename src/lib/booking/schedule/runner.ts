import { parseResidentIds } from "@/lib/booking/parse-residents";
import { parseBookingRequest } from "@/lib/booking/parse";
import { getResidentById } from "@/lib/booking/residents";
import type { ScheduledJob, ScheduledJobInput } from "@/lib/booking/schedule/types";
import {
  getBookingDeadline,
  getOpensAt,
  isWithinBookingWindow,
} from "@/lib/booking/tennis-window";
import { pickDefaultSlot } from "@/lib/booking/availability";
import { fetchTennisAvailability } from "@/lib/booking/availability-server";
import { normalizeSlotLabels } from "@/lib/booking/mhoa-tennis-scraper";
import { intakeFromResident } from "@/lib/booking/residents";
import { submitBooking, type BookingSelection } from "@/lib/booking/submit";
import type { BookingIntake } from "@/lib/booking/types";
import {
  addScheduledJobs,
  listScheduledJobs,
  upsertScheduledJobs,
} from "@/lib/booking/schedule/store";
import { recordConfirmedFromSuccess } from "@/lib/booking/confirmed/store";

export function buildScheduledJobs(
  bookingRequest: string,
  referenceDate: Date = new Date(),
  overrides?: {
    residentIds?: string[];
    targetDate?: string;
    slotLabel?: string | null;
    court?: string | null;
  },
): ScheduledJob[] {
  const parsed = parseBookingRequest(bookingRequest, "tennis", referenceDate);
  const residentIds =
    overrides?.residentIds && overrides.residentIds.length > 0
      ? overrides.residentIds
      : parseResidentIds(bookingRequest);
  const ids = residentIds.length > 0 ? residentIds : ["max"];
  const targetDate = overrides?.targetDate ?? parsed.date;
  const jobCount = Math.max(ids.length, parsed.slotsRequested);
  const opensAt = getOpensAt(targetDate);
  const bookingDeadline = getBookingDeadline(targetDate);
  const now = new Date();
  const status = isWithinBookingWindow(targetDate, referenceDate)
    ? "ready"
    : now >= opensAt
      ? "ready"
      : "waiting";

  return Array.from({ length: jobCount }, (_, i) => ({
    id: crypto.randomUUID(),
    status,
    residentId: ids[i % ids.length]!,
    targetDate,
    windowStart: parsed.windowStart,
    windowEnd: parsed.windowEnd,
    courtPreference: overrides?.court ?? parsed.courtOrSite,
    slotLabel: overrides?.slotLabel ?? null,
    opensAt: opensAt.toISOString(),
    bookingDeadline: bookingDeadline.toISOString(),
    createdAt: now.toISOString(),
    attempts: 0,
    bookingRequest,
  }));
}

export function createJobsFromInput(
  inputs: ScheduledJobInput[],
  referenceDate: Date = new Date(),
): ScheduledJob[] {
  return inputs.map((input) => {
    const opensAt = getOpensAt(input.targetDate);
    const bookingDeadline = getBookingDeadline(input.targetDate);
    const now = new Date();
    const status =
      isWithinBookingWindow(input.targetDate, referenceDate) || now >= opensAt
        ? "ready"
        : "waiting";

    return {
      id: crypto.randomUUID(),
      status,
      residentId: input.residentId,
      targetDate: input.targetDate,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      courtPreference: input.courtPreference,
      slotLabel: input.slotLabel,
      opensAt: opensAt.toISOString(),
      bookingDeadline: bookingDeadline.toISOString(),
      createdAt: now.toISOString(),
      attempts: 0,
      bookingRequest: input.bookingRequest,
      guestContact: input.guestContact,
    };
  });
}

export async function queueScheduledBooking(
  bookingRequest: string,
  referenceDate: Date = new Date(),
  overrides?: Parameters<typeof buildScheduledJobs>[2],
): Promise<ScheduledJob[]> {
  const jobs = buildScheduledJobs(bookingRequest, referenceDate, overrides);
  return addScheduledJobs(jobs);
}

async function intakeFromJob(job: ScheduledJob): Promise<BookingIntake | null> {
  if (job.residentId === "other") {
    if (!job.guestContact) return null;
    return {
      provider: "mahogany-hoa",
      facility: "tennis",
      fullName: job.guestContact.fullName,
      email: job.guestContact.email,
      phone: job.guestContact.phone,
      address: job.guestContact.address,
      bookingRequest: job.bookingRequest,
      attestationAccepted: true,
    };
  }

  const resident = getResidentById(job.residentId);
  if (!resident) return null;

  return intakeFromResident(resident, {
    facility: "tennis",
    bookingRequest: job.bookingRequest,
    attestationAccepted: true,
  });
}

function slotOnCourt(
  courts: { court: string; slots: string[] }[],
  court: string,
  slotLabel: string,
): boolean {
  const entry = courts.find((c) => c.court === court);
  if (!entry) return false;
  const normalized = normalizeSlotLabels([slotLabel])[0];
  return normalizeSlotLabels(entry.slots).includes(normalized);
}

async function tryBookJob(job: ScheduledJob): Promise<ScheduledJob> {
  const intake = await intakeFromJob(job);
  if (!intake) {
    const reason =
      job.residentId === "other"
        ? "Missing guest contact on scheduled job."
        : `Unknown resident: ${job.residentId}`;
    return { ...job, status: "failed", error: reason };
  }

  const parsed = parseBookingRequest(job.bookingRequest, "tennis");
  parsed.date = job.targetDate;
  parsed.windowStart = job.windowStart;
  parsed.windowEnd = job.windowEnd;
  if (job.courtPreference) parsed.courtOrSite = job.courtPreference;

  const avail = await fetchTennisAvailability(job.targetDate);
  let selection: BookingSelection | undefined;

  if (avail.status === "ok") {
    if (
      job.slotLabel &&
      job.courtPreference &&
      slotOnCourt(avail.courts, job.courtPreference, job.slotLabel)
    ) {
      selection = { court: job.courtPreference, slotLabel: job.slotLabel };
    } else {
      const pick = pickDefaultSlot(
        avail.courts,
        job.windowStart,
        job.windowEnd,
        job.courtPreference,
      );
      if (pick) {
        selection = { court: pick.court, slotLabel: pick.slot };
        job = { ...job, slotLabel: pick.slot, courtPreference: pick.court };
      }
    }
  }

  if (!selection) {
    return {
      ...job,
      status: "ready",
      attempts: job.attempts + 1,
      lastAttemptAt: new Date().toISOString(),
      error: "No matching slot on MHOA yet — will retry.",
    };
  }

  const result = await submitBooking(intake, parsed, selection);
  const now = new Date().toISOString();

  if (result.status === "success" && result.mhoaApproved) {
    return {
      ...job,
      status: "completed",
      attempts: job.attempts + 1,
      lastAttemptAt: now,
      result,
      error: undefined,
    };
  }

  const errMsg = result.status === "error" ? result.reason : "MHOA did not confirm";
  const failed = /exceeded|household|limit/i.test(errMsg);
  return {
    ...job,
    status: failed ? "failed" : "ready",
    attempts: job.attempts + 1,
    lastAttemptAt: now,
    result,
    error: errMsg,
  };
}

export type RunScheduleResult = {
  processed: number;
  completed: number;
  failed: number;
  waiting: number;
  jobs: ScheduledJob[];
};

export async function runScheduledBookings(now: Date = new Date()): Promise<RunScheduleResult> {
  const jobs = await listScheduledJobs();
  const updated: ScheduledJob[] = [];
  let completed = 0;
  let failed = 0;
  let waiting = 0;

  for (const job of jobs) {
    if (job.status === "completed" || job.status === "failed") {
      updated.push(job);
      if (job.status === "failed") failed++;
      if (job.status === "completed") completed++;
      continue;
    }

    if (now > new Date(job.bookingDeadline)) {
      updated.push({
        ...job,
        status: "failed",
        error: "Booking deadline passed (11:59 PM night before).",
      });
      failed++;
      continue;
    }

    const opens = new Date(job.opensAt);
    let current = { ...job };

    if (current.status === "waiting" && now >= opens) {
      current = { ...current, status: "ready" };
    }

    if (current.status === "waiting") {
      waiting++;
      updated.push(current);
      continue;
    }

    if (!isWithinBookingWindow(current.targetDate, now) && now < opens) {
      waiting++;
      updated.push(current);
      continue;
    }

    current = { ...current, status: "running" };
    const outcome = await tryBookJob(current);
    if (outcome.status === "completed" && outcome.result?.status === "success") {
      await recordConfirmedFromSuccess(outcome.result, {
        residentId: outcome.residentId === "other" ? null : outcome.residentId,
        source: "scheduled",
      });
    }
    updated.push(outcome);
    if (outcome.status === "completed") completed++;
    else if (outcome.status === "failed") failed++;
    else waiting++;
  }

  await upsertScheduledJobs(updated);
  return {
    processed: jobs.length,
    completed,
    failed,
    waiting,
    jobs: updated,
  };
}
