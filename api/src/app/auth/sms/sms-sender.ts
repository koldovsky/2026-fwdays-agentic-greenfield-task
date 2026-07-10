// SMS delivery abstraction (ADR-0004, design D7): TurboSMS in production,
// log-only fallback everywhere else. Selection happens in AuthModule by
// AuthConfig.smsMode.
export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSender {
  send(phone: string, code: string): Promise<void>;
}
