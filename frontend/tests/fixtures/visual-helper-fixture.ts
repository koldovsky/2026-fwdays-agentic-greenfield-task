/**
 * visual-helper-fixture.ts — Playwright test fixture that auto-injects
 * the visual helper (`visual-helper.js`) into every test context.
 *
 * Usage — opt-in by replacing the base `test` import in the spec file:
 *
 *   // before
 *   import { test, expect } from '@playwright/test';
 *
 *   // after
 *   import { test, expect } from './fixtures/visual-helper-fixture';
 *
 * The fixture calls `context.addInitScript({ content: <wrapper> })`
 * in `beforeEach`. The wrapper injects the helper as an inline
 * `<script>` tag inside a `DOMContentLoaded` listener so the helper's
 * top-level `document.head` / `document.documentElement` calls
 * fire AFTER the parser has created the DOM nodes.
 *
 * Why a wrapper and not `addInitScript({ path: ... })` directly?
 *   `addInitScript({ path })` evaluates the script "after the
 *   document was created but before any of its scripts were run"
 *   (per Playwright docs). For some documents the parser has
 *   not yet reached `<head>` / `<html>` at that moment, so the
 *   helper IIFE's `document.head.appendChild(style)` and
 *   `document.documentElement.appendChild(cursor)` calls throw
 *   a TypeError. Playwright swallows the error silently. The
 *   cursor never appears. The fix is to defer injection until
 *   `DOMContentLoaded`, when the parser guarantees `<head>` and
 *   `<html>` exist.
 *
 * Reference: https://playwright.dev/docs/api/class-browsercontext
 *
 * Quick 20260711-0910: refactor the `document-bdd-feature` skill
 * to record mouse trail + focus outline. The helper JS lives at
 * `.agents/skills/document-bdd-feature/scripts/visual-helper.js`
 * (the skill directory — the helper is a recording artifact, not
 * frontend test code).
 *
 * Spike 007: the original `addInitScript({ path: ... })` recipe
 * (used in the Quick 20260711-0910 commit) silently failed because
 * the IIFE touches document before DOMContentLoaded. The cursor
 * never rendered. The deferred wrapper below fixes that.
 */
import { type BrowserContext, test as base } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

export { expect } from "@playwright/test";

const VISUAL_HELPER_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  ".agents",
  "skills",
  "document-bdd-feature",
  "scripts",
  "visual-helper.js",
);

const VISUAL_HELPER_SOURCE: string = fs.readFileSync(VISUAL_HELPER_PATH, "utf8");

export const test = base.extend({});

test.beforeEach(async ({ context }: { context: BrowserContext }) => {
  // Read the helper source once at fixture-load time (the file is
  // committed, so the content is stable for the lifetime of the
  // test run) and inject it on DOMContentLoaded. The wrapper
  // serializes the source as a JSON string so the IIFE survives
  // the JSON round-trip and any embedded quotes / newlines.
  const helperSourceJson = JSON.stringify(VISUAL_HELPER_SOURCE) as unknown as string;
  await context.addInitScript({
    content: `
      (function() {
        if (window.top !== window) return;
        document.addEventListener("DOMContentLoaded", function() {
          const s = document.createElement("script");
          s.textContent = ${helperSourceJson};
          (document.head || document.documentElement).appendChild(s);
        });
      })();
    `,
  });
});
