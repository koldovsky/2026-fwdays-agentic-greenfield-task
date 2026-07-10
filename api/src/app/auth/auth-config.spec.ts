import { resolveAuthConfig } from './auth-config';
import { DevSmsSender } from './sms/dev-sms-sender';
import { createSmsSender } from './sms/sms-sender.factory';
import { TurboSmsSender } from './sms/turbosms-sender';

const base = { AUTH_SECRET: 'test-secret' };

describe('resolveAuthConfig', () => {
  it('defaults to dev SMS mode outside production', () => {
    const config = resolveAuthConfig({ ...base });
    expect(config.smsMode).toBe('dev');
    expect(config.cookieSecure).toBe(false);
  });

  it('defaults to turbosms + Secure cookie in production', () => {
    const config = resolveAuthConfig({
      ...base,
      NODE_ENV: 'production',
      TURBOSMS_TOKEN: 't',
    });
    expect(config.smsMode).toBe('turbosms');
    expect(config.cookieSecure).toBe(true);
  });

  it('fails fast when turbosms mode has no token (ADR-0004)', () => {
    expect(() => resolveAuthConfig({ ...base, SMS_MODE: 'turbosms' })).toThrow(
      /TURBOSMS_TOKEN/,
    );
  });

  it('fails fast when production tries the dev fallback (ADR-0004)', () => {
    expect(() =>
      resolveAuthConfig({ ...base, NODE_ENV: 'production', SMS_MODE: 'dev' }),
    ).toThrow(/SMS_MODE=turbosms/);
  });

  it('fails fast without AUTH_SECRET', () => {
    expect(() => resolveAuthConfig({})).toThrow(/AUTH_SECRET/);
  });

  it('rejects unknown SMS_MODE values', () => {
    expect(() =>
      resolveAuthConfig({ ...base, SMS_MODE: 'carrier-pigeon' }),
    ).toThrow(/SMS_MODE/);
  });

  it('honors the COOKIE_SECURE override', () => {
    expect(
      resolveAuthConfig({ ...base, COOKIE_SECURE: 'true' }).cookieSecure,
    ).toBe(true);
  });
});

describe('createSmsSender', () => {
  it('selects the sender by smsMode', () => {
    const dev = resolveAuthConfig(base);
    const prod = resolveAuthConfig({
      ...base,
      SMS_MODE: 'turbosms',
      TURBOSMS_TOKEN: 't',
    });
    expect(createSmsSender(dev)).toBeInstanceOf(DevSmsSender);
    expect(createSmsSender(prod)).toBeInstanceOf(TurboSmsSender);
  });
});
