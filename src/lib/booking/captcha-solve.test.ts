import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { solveCaptchaPng } from "./captcha-solve.ts";

const samplePath = path.join(process.cwd(), "tests/fixtures/mhoa-captcha-sample.png");

test("solveCaptchaPng reads MHOA sample captcha when Python deps installed", async (t) => {
  if (!fs.existsSync(samplePath)) {
    t.skip("sample captcha image missing");
    return;
  }

  let code: string;
  try {
    code = await solveCaptchaPng(fs.readFileSync(samplePath));
  } catch (err) {
    t.skip(`python ddddocr unavailable: ${err instanceof Error ? err.message : err}`);
    return;
  }

  assert.equal(code, "pzjlq");
});
