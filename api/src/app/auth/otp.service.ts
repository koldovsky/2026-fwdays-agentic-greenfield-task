import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { UserModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_CONFIG, AuthConfig } from './auth-config';
import { AuthError } from './auth-errors';
import { KeyedMutex } from './keyed-mutex';
import { normalizePhone } from './phone';
import { SMS_SENDER, SmsSender } from './sms/sms-sender';

// FR-AUTH-03: at most 1 SMS per phone per 60s and 5 per 24h
export const OTP_MIN_INTERVAL_MS = 60 * 1000;
export const OTP_DAILY_LIMIT = 5;
export const OTP_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
// FR-AUTH-02: at most 5 failed attempts per code
export const OTP_MAX_ATTEMPTS = 5;

// OTP state machine (design D4): only the latest unconsumed, unexpired code
// per phone is valid; send limits are derived from otp_code rows (the table
// is the send log — no stored counters to drift, design D1). All limits are
// enforced here, server-side (NFR-SEC-02). Both flows are serialized per
// phone via KeyedMutex — concurrent requests must not race the rate-limit
// reads or the attempt counter (S-02 slice-review findings, ADR-0010).
@Injectable()
export class OtpService {
  private readonly phoneLocks = new KeyedMutex();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  private hashCode(phone: string, code: string): string {
    // HMAC keyed by AUTH_SECRET (design D3): stored rows are useless
    // without the env secret; the 5-attempt cap is the real control.
    return createHmac('sha256', this.config.authSecret)
      .update(`${phone}:${code}`)
      .digest('hex');
  }

  async requestOtp(rawPhone: string): Promise<{ devCode?: string }> {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      throw new AuthError('PHONE_INVALID', 'Phone must be a valid +380 number');
    }
    return this.phoneLocks.run(phone, () => this.requestOtpLocked(phone));
  }

  private async requestOtpLocked(phone: string): Promise<{ devCode?: string }> {
    const now = Date.now();
    const sentLastDay = await this.prisma.otpCode.findMany({
      where: { phone, createdAt: { gte: new Date(now - OTP_DAILY_WINDOW_MS) } },
      select: { createdAt: true },
    });
    if (sentLastDay.length >= OTP_DAILY_LIMIT) {
      throw new AuthError('RATE_LIMITED_DAILY', 'Daily SMS limit reached');
    }
    const lastSentAt = Math.max(
      0,
      ...sentLastDay.map((r) => r.createdAt.getTime()),
    );
    if (now - lastSentAt < OTP_MIN_INTERVAL_MS) {
      throw new AuthError('RATE_LIMITED_60S', 'Wait 60s before a new code');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    // Send before recording: a failed send must not consume the daily
    // budget or invalidate a still-working previous code.
    await this.sms.send(phone, code);
    await this.prisma.otpCode.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: new Date(now) },
    });
    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash: this.hashCode(phone, code),
        expiresAt: new Date(now + this.config.otpTtlMs),
      },
    });
    // ADR-0004: outside production the code is also returned so e2e tests
    // and local dev need no log scraping. DevSmsSender already logged it.
    return this.config.smsMode === 'dev' ? { devCode: code } : {};
  }

  async verifyOtp(rawPhone: string, code: string): Promise<UserModel> {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      throw new AuthError('PHONE_INVALID', 'Phone must be a valid +380 number');
    }
    return this.phoneLocks.run(phone, () => this.verifyOtpLocked(phone, code));
  }

  private async verifyOtpLocked(
    phone: string,
    code: string,
  ): Promise<UserModel> {
    const active = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!active || active.expiresAt.getTime() <= Date.now()) {
      throw new AuthError(
        'OTP_EXPIRED_OR_MISSING',
        'No active code — request a new one',
      );
    }

    const expected = Buffer.from(active.codeHash, 'hex');
    const actual = Buffer.from(
      this.hashCode(phone, /^\d{6}$/.test(code) ? code : ''),
      'hex',
    );
    if (!timingSafeEqual(expected, actual)) {
      // Atomic increment (not read-modify-write): concurrent guesses must
      // never under-count the cap that guards a 10^6-space code
      const updated = await this.prisma.otpCode.update({
        where: { id: active.id },
        data: { attempts: { increment: 1 } },
      });
      if (updated.attempts < OTP_MAX_ATTEMPTS) {
        throw new AuthError('OTP_INVALID', 'Wrong code');
      }
      // The 5th failure invalidates the code (FR-AUTH-02)
      await this.prisma.otpCode.update({
        where: { id: active.id },
        data: { consumedAt: new Date() },
      });
      throw new AuthError(
        'OTP_ATTEMPTS_EXCEEDED',
        'Too many attempts — request a new code',
      );
    }

    await this.prisma.otpCode.update({
      where: { id: active.id },
      data: { consumedAt: new Date() },
    });
    // First successful login creates the account (FR-AUTH-01): registration
    // and login are one code path.
    return this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });
  }
}
