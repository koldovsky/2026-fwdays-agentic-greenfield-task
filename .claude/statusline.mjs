#!/usr/bin/env node
// Claude Code statusLine: "[CAVEMAN]  <tokens>k (<pct>%)".
// The context meter (tokens in context / % of window) is computed from the transcript's
// last assistant usage. Reads the statusLine JSON payload on stdin. Must never throw —
// a crash would render as a broken status line — so everything is wrapped in try/catch.

import { readFileSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  caveman: '\x1b[38;5;172m',
};

// Caveman badge: read the plugin's mode flag and render "[CAVEMAN]" / "[CAVEMAN:LITE]".
// Mirrors caveman-statusline.sh hardening — refuse symlinks (a planted symlink could
// render ~/.ssh/id_rsa bytes), cap the read, strip to [a-z0-9-], whitelist the mode.
const MODES = new Set([
  'lite', 'full', 'ultra', 'wenyan-lite', 'wenyan', 'wenyan-full',
  'wenyan-ultra', 'commit', 'review', 'compress',
]);
const cavemanBadge = () => {
  const flag = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), '.caveman-active');
  try {
    if (lstatSync(flag).isSymbolicLink()) {
      return '';
    }
    const mode = readFileSync(flag, 'utf8').slice(0, 64).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (mode === 'off' || !MODES.has(mode)) {
      return '';
    }
    const label = mode === 'full' ? '[CAVEMAN]' : `[CAVEMAN:${mode.toUpperCase()}]`;
    return `${C.caveman}${label}${C.reset}`;
  } catch {
    return '';
  }
};

const readStdin = () => {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

// Context window per model: [1m] variants and the Claude 5 family (fable/mythos) get 1M,
// everything else the standard 200k.
const contextWindow = (modelId = '') =>
  /1m|fable|mythos/i.test(modelId) ? 1_000_000 : 200_000;

// Walk the transcript from the end; return the most recent assistant usage block.
const lastUsage = (transcriptPath) => {
  if (!transcriptPath) {
    return null;
  }
  let text;
  try {
    text = readFileSync(transcriptPath, 'utf8');
  } catch {
    return null;
  }
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line || !line.includes('"usage"')) {
      continue;
    }
    try {
      const usage = JSON.parse(line)?.message?.usage;
      if (usage) {
        return usage;
      }
    } catch {
      // partial / non-JSON line — keep scanning
    }
  }
  return null;
};

const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

const main = () => {
  let data = {};
  try {
    data = JSON.parse(readStdin() || '{}');
  } catch {
    data = {};
  }

  const parts = [];

  const badge = cavemanBadge();
  if (badge) {
    parts.push(badge);
  }

  const usage = lastUsage(data.transcript_path);
  if (usage) {
    const used =
      (usage.input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0);
    const window = contextWindow(data.model?.id);
    const pct = (used / window) * 100;
    const color = pct < 70 ? C.green : pct < 90 ? C.yellow : C.red;
    parts.push(`${C.bold}${color}${fmtK(used)}${C.reset} ${C.dim}(${pct.toFixed(1)}%)${C.reset}`);
  }

  process.stdout.write(parts.join(`${C.dim}  ${C.reset}`));
};

main();
