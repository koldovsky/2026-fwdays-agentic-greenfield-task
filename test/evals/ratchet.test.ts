import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/check-eval-ratchet.mjs';

const runRatchet = (args: string[]): number => {
  try {
    execFileSync('node', [SCRIPT, ...args], { stdio: 'pipe' });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? 1;
  }
};

describe('check-eval-ratchet', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evalratchet-'));

  it('exits 0 (graceful skip) when latest.json is absent', () => {
    expect(
      runRatchet(['--latest', join(dir, 'missing.json'), '--baseline', join(dir, 'b.json')]),
    ).toBe(0);
  });

  it('fails when a capability score regresses below baseline', () => {
    const latest = join(dir, 'latest-bad.json');
    const baseline = join(dir, 'baseline-bad.json');
    writeFileSync(latest, JSON.stringify({ 'router-intent': { intent: 0.5 } }));
    writeFileSync(baseline, JSON.stringify({ 'router-intent': { intent: 0.9 } }));

    expect(runRatchet(['--latest', latest, '--baseline', baseline])).toBe(1);
  });

  it('passes when latest meets or beats baseline', () => {
    const latest = join(dir, 'latest-ok.json');
    const baseline = join(dir, 'baseline-ok.json');
    writeFileSync(latest, JSON.stringify({ 'router-intent': { intent: 0.95 } }));
    writeFileSync(baseline, JSON.stringify({ 'router-intent': { intent: 0.9 } }));

    expect(runRatchet(['--latest', latest, '--baseline', baseline])).toBe(0);
  });
});
