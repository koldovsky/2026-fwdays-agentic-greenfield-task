import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveAttachmentsConfig } from './attachments-config';

describe('resolveAttachmentsConfig', () => {
  const tempDir = join(
    tmpdir(),
    `servicedesk-attachments-config-${process.pid}`,
  );

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('fails fast in production without ATTACHMENTS_DIR (NFR-STOR-01, ADR-0005)', () => {
    expect(() => resolveAttachmentsConfig({ NODE_ENV: 'production' })).toThrow(
      /ATTACHMENTS_DIR/,
    );
  });

  it('uses the configured directory and creates it', () => {
    const config = resolveAttachmentsConfig({
      NODE_ENV: 'production',
      ATTACHMENTS_DIR: tempDir,
    });
    expect(config.dir).toBe(tempDir);
    expect(existsSync(tempDir)).toBe(true);
  });

  it('defaults to the git-ignored local folder outside production', () => {
    const config = resolveAttachmentsConfig({});
    expect(config.dir).toBe(join(process.cwd(), '.data/attachments'));
  });
});
