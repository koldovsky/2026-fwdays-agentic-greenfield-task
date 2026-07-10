import { mkdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { Provider } from '@nestjs/common';

export interface AttachmentsConfig {
  /** Absolute path of the attachment storage root (ADR-0003, NFR-STOR-01). */
  dir: string;
}

export const ATTACHMENTS_CONFIG = Symbol('ATTACHMENTS_CONFIG');

// Local default for a zero-setup fresh clone; git-ignored. Production has no
// default — the Railway Volume mount path must be set explicitly.
const DEV_DEFAULT_DIR = '.data/attachments';

// Resolved once at DI bootstrap: a misconfigured process must not start
// (auth-config idiom, ADR-0005 fail-fast). Creating the directory here makes
// the storage failure mode a startup error, not a mid-request surprise.
export function resolveAttachmentsConfig(
  env: NodeJS.ProcessEnv,
): AttachmentsConfig {
  const production = env.NODE_ENV === 'production';
  const configured = env.ATTACHMENTS_DIR;
  if (production && !configured) {
    throw new Error(
      'production requires ATTACHMENTS_DIR — the Railway Volume mount path (NFR-STOR-01, ADR-0003)',
    );
  }
  const raw = configured || DEV_DEFAULT_DIR;
  const dir = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
  mkdirSync(dir, { recursive: true });
  return { dir };
}

export const attachmentsConfigProvider: Provider = {
  provide: ATTACHMENTS_CONFIG,
  useFactory: (): AttachmentsConfig => resolveAttachmentsConfig(process.env),
};
