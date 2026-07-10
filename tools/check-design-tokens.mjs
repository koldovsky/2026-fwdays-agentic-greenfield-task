#!/usr/bin/env node
// Design check (В-04, process track §3 of docs/mvp-capability-plan.md):
// UI code must use Material theme tokens (var(--mat-sys-*)) instead of
// hardcoded color literals. Scans web/src *.scss files and inline `styles`
// of *.ts components for hex/rgb()/hsl() color values. Part of
// `npm run verify` (blocking). Sizes/spacing are intentionally NOT policed —
// layout needs rem/px; the token rule is about colors and typography roles.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const WEB_SRC = join(ROOT, 'web', 'src');

// The theme entry point may configure palettes via Material APIs; color
// literals are still banned there — extend this list only with a reason.
const ALLOW = new Set([]);

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\(/g;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

// For .ts files only the `styles:`/`styleUrls` component metadata matters;
// checking whole files would false-positive on hex strings in logic. The
// heuristic: template literals assigned to `styles` (string or array).
function styleBlocks(source) {
  const blocks = [];
  const re = /styles:\s*(?:\[)?\s*`([\s\S]*?)`/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    blocks.push({ text: match[1], offset: match.index });
  }
  return blocks;
}

function lineOf(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

const violations = [];
for (const path of walk(WEB_SRC)) {
  const rel = relative(ROOT, path);
  if (ALLOW.has(rel)) continue;
  if (path.endsWith('.scss')) {
    const source = readFileSync(path, 'utf8');
    for (const match of source.matchAll(COLOR_RE)) {
      violations.push(`${rel}:${lineOf(source, match.index)} → ${match[0]}`);
    }
  } else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
    const source = readFileSync(path, 'utf8');
    for (const block of styleBlocks(source)) {
      for (const match of block.text.matchAll(COLOR_RE)) {
        violations.push(
          `${rel}:${lineOf(source, block.offset + match.index)} → ${match[0]}`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    'Design check failed (В-04): hardcoded colors in UI code — use Material theme tokens var(--mat-sys-*) instead:',
  );
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('Design check passed: no hardcoded colors in web/src styles.');
