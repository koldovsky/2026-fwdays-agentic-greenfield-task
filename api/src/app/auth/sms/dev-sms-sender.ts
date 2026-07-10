import { Logger } from '@nestjs/common';
import { SmsSender } from './sms-sender';

// Dev fallback (ADR-0004): no SMS is sent, the code goes to the log. This
// full-phone/plain-code log line is the explicit non-production exception
// to NFR-SEC-01 — the sender cannot be selected when NODE_ENV=production
// (enforced in resolveAuthConfig).
export class DevSmsSender implements SmsSender {
  private readonly logger = new Logger('DevSms');

  async send(phone: string, code: string): Promise<void> {
    this.logger.log(`[dev] OTP for ${phone}: ${code}`);
  }
}
