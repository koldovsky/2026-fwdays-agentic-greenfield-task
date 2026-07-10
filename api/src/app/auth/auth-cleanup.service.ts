import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OTP_DAILY_WINDOW_MS } from './otp.service';

export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Background cleanup of the transit store (ADR-0004, design D8). otp_code
// rows must survive a full 24h — they are the evidence for the daily send
// limit — so the cutoff is row age, not code expiry.
@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Interval(CLEANUP_INTERVAL_MS)
  async cleanup(): Promise<void> {
    const now = Date.now();
    const [otp, sessions] = await Promise.all([
      this.prisma.otpCode.deleteMany({
        where: { createdAt: { lt: new Date(now - OTP_DAILY_WINDOW_MS) } },
      }),
      this.prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date(now) } },
      }),
    ]);
    if (otp.count || sessions.count) {
      this.logger.log(
        `cleaned up ${otp.count} otp codes, ${sessions.count} expired sessions`,
      );
    }
  }
}
