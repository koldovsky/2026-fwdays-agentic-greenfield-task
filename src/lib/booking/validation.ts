import type { BookingIntake, FacilityType } from "./types";

export type IntakeField =
  | "fullName"
  | "email"
  | "phone"
  | "address"
  | "bookingRequest"
  | "attestationAccepted";

export type IntakeErrors = Partial<Record<IntakeField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_RE = /\D/g;

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(PHONE_DIGITS_RE, "");
}

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validateFullName(fullName: string): string | undefined {
  const trimmed = fullName.trim();
  if (!trimmed) return "Full name is required.";
  if (trimmed.length < 2) return "Enter your first and last name.";
  return undefined;
}

export function validateAddress(address: string): string | undefined {
  const trimmed = address.trim();
  if (!trimmed) return "Mahogany resident address is required.";
  if (trimmed.length < 5) return "Enter your street address in Mahogany.";
  return undefined;
}

export function validatePhone(phone: string, facility: FacilityType): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return "Phone number is required.";

  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 10 || digits.length > 11) {
    return facility === "picnic"
      ? "Use format (000) 000-0000."
      : "Use a 10-digit North American phone number.";
  }

  return undefined;
}

export function validateBookingRequest(bookingRequest: string): string | undefined {
  const trimmed = bookingRequest.trim();
  if (!trimmed) return "Describe when and what you want to book.";
  if (trimmed.length < 10) return "Add a bit more detail (at least 10 characters).";
  return undefined;
}

export function validateAttestation(accepted: boolean): string | undefined {
  if (!accepted) {
    return "Confirm that you accept MHOA rules and automation disclosure.";
  }
  return undefined;
}

export function validateIntake(intake: BookingIntake): IntakeErrors {
  const errors: IntakeErrors = {};

  const fullName = validateFullName(intake.fullName);
  if (fullName) errors.fullName = fullName;

  const email = validateEmail(intake.email);
  if (email) errors.email = email;

  const phone = validatePhone(intake.phone, intake.facility);
  if (phone) errors.phone = phone;

  const address = validateAddress(intake.address);
  if (address) errors.address = address;

  const bookingRequest = validateBookingRequest(intake.bookingRequest);
  if (bookingRequest) errors.bookingRequest = bookingRequest;

  const attestation = validateAttestation(intake.attestationAccepted);
  if (attestation) errors.attestationAccepted = attestation;

  return errors;
}

export function firstErrorField(errors: IntakeErrors): IntakeField | undefined {
  const order: IntakeField[] = [
    "fullName",
    "email",
    "phone",
    "address",
    "bookingRequest",
    "attestationAccepted",
  ];
  return order.find((field) => errors[field]);
}
