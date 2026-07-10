import { Provider } from '@nestjs/common';

export type SmsMode = 'turbosms' | 'dev';

export interface AuthConfig {
  /** HMAC key for OTP code hashes (design D3). */
  authSecret: string;
  smsMode: SmsMode;
  turbosmsToken?: string;
  turbosmsSender: string;
  /** `Secure` cookie flag — on in production, off on plain-HTTP localhost (D2). */
  cookieSecure: boolean;
  sessionTtlMs: number;
  otpTtlMs: number;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

// FR-AUTH-04: session lasts >= 30 days (fixed window, design D2)
const SESSION_TTL_DAYS = 30;
// FR-AUTH-02: OTP TTL <= 5 minutes
const OTP_TTL_MIN = 5;

// Resolved once at DI bootstrap: a misconfigured process must not start
// (ADR-0004 fail-fast — production never falls back to the dev SMS mode).
export function resolveAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const production = env.NODE_ENV === 'production';
  const smsMode = env.SMS_MODE ?? (production ? 'turbosms' : 'dev');
  if (smsMode !== 'turbosms' && smsMode !== 'dev') {
    throw new Error(`SMS_MODE must be "turbosms" or "dev", got "${smsMode}"`);
  }
  if (production && smsMode !== 'turbosms') {
    throw new Error(
      'production requires SMS_MODE=turbosms — the dev SMS fallback must never run in prod (ADR-0004)',
    );
  }
  const turbosmsToken = env.TURBOSMS_TOKEN || undefined;
  if (smsMode === 'turbosms' && !turbosmsToken) {
    throw new Error('SMS_MODE=turbosms requires TURBOSMS_TOKEN (ADR-0004)');
  }
  const authSecret = env.AUTH_SECRET;
  if (!authSecret) {
    throw new Error('AUTH_SECRET is required (OTP hash HMAC key, NFR-SEC-01)');
  }
  return {
    authSecret,
    smsMode,
    turbosmsToken,
    turbosmsSender: env.TURBOSMS_SENDER || 'Msg',
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : production,
    sessionTtlMs: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    otpTtlMs: OTP_TTL_MIN * 60 * 1000,
  };
}

export const authConfigProvider: Provider = {
  provide: AUTH_CONFIG,
  useFactory: (): AuthConfig => resolveAuthConfig(process.env),
};
