export type ConfirmedBookingSource = "wizard" | "scheduled";

export type ConfirmedBooking = {
  id: string;
  residentId: string | null;
  fullName: string;
  email: string;
  facility: string;
  date: string;
  court: string;
  slot: string;
  confirmedAt: string;
  expiresAt: string;
  runId: string;
  source: ConfirmedBookingSource;
  mhoaApproved: boolean;
};
