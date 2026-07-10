import { Logger } from '@nestjs/common';
import { AuthConfig } from '../auth-config';
import { maskPhone } from '../phone';
import { SmsSender } from './sms-sender';

export const TURBOSMS_SEND_URL = 'https://api.turbosms.ua/message/send.json';

interface TurboSmsResponse {
  response_code?: number;
  response_status?: string;
}

// TurboSMS HTTP API v2: success responses carry a response_status starting
// with SUCCESS (e.g. SUCCESS_MESSAGE_ACCEPTED, response_code 800); anything
// else is a delivery failure.
function isTurboSmsSuccess(
  httpOk: boolean,
  body: TurboSmsResponse | null,
): boolean {
  if (!httpOk || !body) return false;
  const status = body.response_status ?? '';
  return status.startsWith('SUCCESS') || body.response_code === 800;
}

export class TurboSmsSender implements SmsSender {
  private readonly logger = new Logger('TurboSms');

  constructor(
    private readonly config: Pick<
      AuthConfig,
      'turbosmsToken' | 'turbosmsSender'
    >,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send(phone: string, code: string): Promise<void> {
    const response = await this.fetchFn(TURBOSMS_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.turbosmsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // TurboSMS expects recipients without the leading "+"
        recipients: [phone.slice(1)],
        sms: {
          sender: this.config.turbosmsSender,
          text: `Ваш код входу: ${code}`,
        },
      }),
    });
    const body: TurboSmsResponse | null = await response
      .json()
      .catch(() => null);
    if (!isTurboSmsSuccess(response.ok, body)) {
      // No code and no full phone in logs (NFR-SEC-01)
      this.logger.error(
        `send to ${maskPhone(phone)} failed: HTTP ${response.status}, ` +
          `response_code ${body?.response_code ?? 'n/a'} (${body?.response_status ?? 'no body'})`,
      );
      throw new Error('TurboSMS send failed');
    }
    // Success is logged too — NFR-OBS-01 lists OTP sends, not just failures
    this.logger.log(`sent to ${maskPhone(phone)}`);
  }
}
