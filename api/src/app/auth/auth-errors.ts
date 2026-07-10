import { HttpException, HttpStatus } from '@nestjs/common';

// Machine-readable error contract (design D6): the API stays locale-free,
// the SPA maps codes to Ukrainian messages. e2e asserts codes, not copy.
export type AuthErrorCode =
  | 'PHONE_INVALID'
  | 'PROFILE_INVALID'
  | 'RATE_LIMITED_60S'
  | 'RATE_LIMITED_DAILY'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED_OR_MISSING'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'UNAUTHENTICATED';

const STATUS_BY_CODE: Record<AuthErrorCode, HttpStatus> = {
  PHONE_INVALID: HttpStatus.BAD_REQUEST,
  PROFILE_INVALID: HttpStatus.BAD_REQUEST,
  RATE_LIMITED_60S: HttpStatus.TOO_MANY_REQUESTS,
  RATE_LIMITED_DAILY: HttpStatus.TOO_MANY_REQUESTS,
  OTP_INVALID: HttpStatus.BAD_REQUEST,
  OTP_EXPIRED_OR_MISSING: HttpStatus.BAD_REQUEST,
  OTP_ATTEMPTS_EXCEEDED: HttpStatus.BAD_REQUEST,
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
};

export class AuthError extends HttpException {
  constructor(code: AuthErrorCode, message: string) {
    super({ code, message }, STATUS_BY_CODE[code]);
  }
}
