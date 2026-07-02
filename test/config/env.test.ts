import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv } from '../../src/config/env.js';

const validEnv = {
  TELEGRAM_BOT_TOKEN: 'token',
  DATABASE_URL: 'postgres://localhost/db',
  ANTHROPIC_API_KEY: 'sk-ant-xxx',
} satisfies NodeJS.ProcessEnv;

describe('loadEnv', () => {
  it('rejects a missing required variable and names it', () => {
    const withoutToken: NodeJS.ProcessEnv = {
      DATABASE_URL: validEnv.DATABASE_URL,
      ANTHROPIC_API_KEY: validEnv.ANTHROPIC_API_KEY,
    };
    expect(() => loadEnv(withoutToken)).toThrowError(EnvValidationError);
    expect(() => loadEnv(withoutToken)).toThrowError(/TELEGRAM_BOT_TOKEN/);
  });

  it('rejects when DATABASE_URL or ANTHROPIC_API_KEY is missing', () => {
    expect(() => loadEnv({ TELEGRAM_BOT_TOKEN: 'token' })).toThrowError(EnvValidationError);
  });

  it('defaults PORT to 3000 when unset', () => {
    expect(loadEnv(validEnv).PORT).toBe(3000);
  });

  it('coerces a string PORT to a number', () => {
    expect(loadEnv({ ...validEnv, PORT: '8080' }).PORT).toBe(8080);
  });

  it('boots with all NOTION_* variables absent', () => {
    const env = loadEnv(validEnv);
    expect(env.NOTION_TOKEN).toBeUndefined();
    expect(env.TELEGRAM_BOT_TOKEN).toBe('token');
  });

  it('treats a blank NOTION_* line as absent (mirror off), not a validation error', () => {
    const env = loadEnv({
      ...validEnv,
      NOTION_TOKEN: '',
      NOTION_DB_FOODLOG_ID: '',
      NOTION_DB_REVIEWS_ID: '',
      NOTION_DB_METRICS_ID: '',
      NOTION_DB_FOODDB_ID: '',
    });
    expect(env.NOTION_TOKEN).toBeUndefined();
    expect(env.NOTION_DB_FOODLOG_ID).toBeUndefined();
  });

  it('keeps a populated NOTION_TOKEN', () => {
    expect(loadEnv({ ...validEnv, NOTION_TOKEN: 'secret_x' }).NOTION_TOKEN).toBe('secret_x');
  });

  it('returns a frozen config object', () => {
    expect(Object.isFrozen(loadEnv(validEnv))).toBe(true);
  });
});
