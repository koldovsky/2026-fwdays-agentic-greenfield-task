import { AuthConfig } from '../auth-config';
import { DevSmsSender } from './dev-sms-sender';
import { SmsSender } from './sms-sender';
import { TurboSmsSender } from './turbosms-sender';

export function createSmsSender(config: AuthConfig): SmsSender {
  return config.smsMode === 'turbosms'
    ? new TurboSmsSender(config)
    : new DevSmsSender();
}
