import type { SubmitResult } from "@/lib/booking/submit";

export type GuestContact = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

export type ScheduledJobStatus =
  | "waiting"
  | "ready"
  | "running"
  | "completed"
  | "failed";

export type ScheduledJob = {
  id: string;
  status: ScheduledJobStatus;
  residentId: string;
  targetDate: string;
  windowStart: string;
  windowEnd: string;
  courtPreference: string | null;
  slotLabel: string | null;
  opensAt: string;
  bookingDeadline: string;
  createdAt: string;
  lastAttemptAt?: string;
  attempts: number;
  bookingRequest: string;
  guestContact?: GuestContact;
  result?: SubmitResult;
  error?: string;
};

export type ScheduledJobInput = {
  residentId: string;
  targetDate: string;
  windowStart: string;
  windowEnd: string;
  courtPreference: string | null;
  slotLabel: string | null;
  bookingRequest: string;
  guestContact?: GuestContact;
};
