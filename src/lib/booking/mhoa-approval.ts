/** MHOA post-submit failures we must not treat as success. */
const MHOA_REJECTION =
  /number of allowed appointments exceeded|appointments exceeded|already (?:booked|have a booking)|not available|slot (?:is )?(?:taken|unavailable)|invalid security code|incorrect security code|captcha.*(?:invalid|incorrect|wrong)/i;

/** Only this language appears on the real MHOA tennis confirmation page. */
const MHOA_TENNIS_APPROVED = /we have received your tennis court booking/i;

export type MhoaApprovalResult = {
  mhoaApproved: boolean;
  mhoaRejected: boolean;
  rejectionReason?: string;
  confirmationExcerpt: string;
};

export function detectMhoaApproval(body: string): MhoaApprovalResult {
  const normalized = body.replace(/\s+/g, " ").trim();

  const rejectionMatch = normalized.match(MHOA_REJECTION);
  if (rejectionMatch) {
    const rejectionReason = rejectionMatch[0];
    return {
      mhoaApproved: false,
      mhoaRejected: true,
      rejectionReason,
      confirmationExcerpt: "",
    };
  }

  const mhoaApproved = MHOA_TENNIS_APPROVED.test(normalized);
  const approvalExcerpt = mhoaApproved ? extractApprovalSentence(normalized) : "";

  return {
    mhoaApproved,
    mhoaRejected: false,
    confirmationExcerpt: approvalExcerpt,
  };
}

const MHOA_APPROVAL_PHRASE = /we have received your tennis court booking/i;

/** One clean sentence for audit logs — never the full page scrape. */
function extractApprovalSentence(normalized: string): string {
  const match = normalized.match(MHOA_APPROVAL_PHRASE);
  if (match?.index == null) {
    return "We have received your Tennis Court Booking.";
  }

  let sentence = normalized.slice(match.index);
  const end = sentence.search(/[.!?](?:\s|$)/);
  if (end !== -1) sentence = sentence.slice(0, end + 1);
  return sentence.trim() || "We have received your Tennis Court Booking.";
}

export type BookingAuditEvent = {
  event: "booking_confirmed" | "booking_stub" | "booking_rejected";
  runId: string;
  facility: string;
  date: string;
  slot: string;
  court: string;
  fullName: string;
  email: string;
  mhoaApproved: boolean;
  confirmedAt: string;
  rejectionReason?: string;
  confirmationExcerpt?: string;
};

export function logBookingAudit(entry: BookingAuditEvent): void {
  console.info(JSON.stringify(entry));
}
