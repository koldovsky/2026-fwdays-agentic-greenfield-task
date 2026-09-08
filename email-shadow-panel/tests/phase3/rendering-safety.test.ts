import assert from "node:assert/strict";
import test from "node:test";

import { prepareSafeMessageText } from "../../src/lib/safeMessageText.ts";

const hostileText = `
<script>alert(1)</script>
<div onclick="alert(2)">click</div>
<iframe src="https://evil.test"></iframe>
<form action="https://evil.test"></form>
<object data="https://evil.test/payload"></object>
<embed src="https://evil.test/payload"></embed>
<img src="https://evil.test/pixel.png" />
<link rel="stylesheet" href="https://evil.test/site.css" />
<style>body{display:none}</style>
<a href="javascript:alert(3)">bad</a>
<a href="data:text/html;base64,PHNjcmlwdD4=">data</a>
`;

test("safe message preparation keeps hostile markup as inert text and never produces active elements", () => {
  const prepared = prepareSafeMessageText(hostileText, 50_000);

  assert.equal(typeof prepared.text, "string");
  assert.equal(prepared.truncated, false);
  assert.match(prepared.text, /<script>alert\(1\)<\/script>/u);
  assert.match(prepared.text, /javascript:alert\(3\)/u);
  assert.equal(prepared.text.includes(String.fromCharCode(0)), false);
});
