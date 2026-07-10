import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeEmailHtml } from "../../src/lib/emailHtml.ts";
import {
  createMessageBodyRenderState,
  createMessageRenderModel,
} from "../../src/lib/messageRenderModel.ts";
import type { InboxMessageDetail, InboxMessageSummary } from "../../src/types/inbox.ts";

function createSummary(overrides?: Partial<InboxMessageSummary>): InboxMessageSummary {
  return {
    reference: "msg_validvalid1",
    from: "Example Sender",
    subject: "Verify your sign in",
    time: "Just now",
    preview: "Use the verification link below.",
    ...overrides,
  };
}

function createDetail(overrides?: Partial<InboxMessageDetail>): InboxMessageDetail {
  return {
    reference: "msg_validvalid1",
    contentType: "text/html; charset=UTF-8",
    bodyLength: 128,
    htmlBody: `<div onclick="alert(1)"><p>Hello operator.</p><p>Use code <strong>482731</strong> to continue.</p><p><a href="https://verify.example.test/session?token=abc">Verify sign in</a></p><img src="https://cdn.example.test/hero.png" alt="Hero image"></div><iframe src="https://evil.test/embed"></iframe><a href="javascript:alert(2)">bad</a>`,
    textBody:
      "Hello operator. Use code 482731 to continue. Verify sign in: https://verify.example.test/session?token=abc",
    text: "Hello operator. Use code 482731 to continue. Verify sign in: https://verify.example.test/session?token=abc",
    textPreview: "Use code 482731 to continue.",
    markerFound: true,
    ...overrides,
  };
}

test("email html sanitizer removes unsafe markup and blocks remote images by default", () => {
  const sanitized = sanitizeEmailHtml(createDetail().htmlBody ?? "");

  assert.match(sanitized.html, /verify\.example\.test/u);
  assert.match(sanitized.html, /remote image blocked from cdn\.example\.test/iu);
  assert.doesNotMatch(sanitized.html, /onclick=/u);
  assert.doesNotMatch(sanitized.html, /javascript:/u);
  assert.doesNotMatch(sanitized.html, /iframe/u);
  assert.equal(sanitized.hasBlockedRemoteImages, true);
  assert.equal(sanitized.blockedImageCount, 1);
  assert.deepEqual(
    sanitized.links.map((link) => link.hostname),
    ["verify.example.test"],
  );
});

test("email html sanitizer can allow remote images when explicitly requested", () => {
  const sanitized = sanitizeEmailHtml(createDetail().htmlBody ?? "", {
    allowRemoteImages: true,
  });

  assert.match(sanitized.html, /<img[^>]+cdn\.example\.test\/hero\.png/u);
  assert.equal(sanitized.hasBlockedRemoteImages, false);
  assert.equal(sanitized.blockedImageCount, 0);
});

test("email html sanitizer fails soft for malformed html, unsafe links, and mixed image sources", () => {
  const sanitized = sanitizeEmailHtml(
    '<html><body><div><a href="javascript:alert(1)">Bad</a><a href="https://safe.example.test/verify?token=abc">Verify</a><img src="not-a-url"><img src="https://images.example.test/pixel.png" alt="Pixel"><table><tr><td colspan="2">Cell',
  );

  assert.equal(typeof sanitized.html, "string");
  assert.match(sanitized.html, /safe\.example\.test/u);
  assert.doesNotMatch(sanitized.html, /javascript:/u);
  assert.equal(sanitized.hasBlockedRemoteImages, true);
  assert.equal(sanitized.blockedImageCount, 1);
  assert.deepEqual(
    sanitized.links.map((link) => link.hostname),
    ["safe.example.test"],
  );
});

test("message render model prefers sanitized html, falls back to formatted plain text, and extracts links and codes", () => {
  const htmlModel = createMessageRenderModel(createSummary(), createDetail());
  assert.ok(htmlModel);
  assert.equal(htmlModel?.subject, "Verify your sign in");
  assert.equal(htmlModel?.sender, "Example Sender");
  assert.equal(htmlModel?.verificationCode, "482731");
  assert.equal(htmlModel?.verificationLink?.hostname, "verify.example.test");
  assert.match(htmlModel?.rawPayload ?? "", /<strong>482731<\/strong>/u);

  const htmlState = createMessageBodyRenderState(htmlModel!);
  assert.equal(htmlState.kind, "html");
  if (htmlState.kind === "html") {
    assert.doesNotMatch(htmlState.html.html, /raw provider json/i);
  }

  const plainTextModel = createMessageRenderModel(
    createSummary({ preview: "Fallback plain text" }),
    createDetail({
      contentType: "text/plain",
      htmlBody: null,
      textBody:
        "Hello there. Thanks for joining.\n\nVisit https://example.test/verify to continue.\n\n- Bring your ID\n- Save this code",
      text: "Hello there. Thanks for joining.\n\nVisit https://example.test/verify to continue.\n\n- Bring your ID\n- Save this code",
      textPreview: "Visit https://example.test/verify to continue.",
      markerFound: false,
    }),
  );

  assert.ok(plainTextModel);
  assert.equal(plainTextModel?.htmlBody, null);
  assert.deepEqual(
    plainTextModel?.extractedLinks.map((link) => link.hostname),
    ["example.test"],
  );

  const plainTextState = createMessageBodyRenderState(plainTextModel!);
  assert.equal(plainTextState.kind, "text");
  if (plainTextState.kind === "text") {
    assert.equal(plainTextState.text.blocks[0]?.kind, "paragraph");
    assert.equal(plainTextState.text.blocks[2]?.kind, "list");
    assert.deepEqual(plainTextState.text.blocks[2]?.items, ["Bring your ID", "Save this code"]);
  }
});

test("message render model ignores stale detail from a different selected message", () => {
  const model = createMessageRenderModel(
    createSummary({
      reference: "msg_currentcurrent1",
      subject: "Status update",
      preview: "No verification action in this summary.",
    }),
    createDetail({
      reference: "msg_otherother1",
      htmlBody: "<p>Use code 918273 and visit https://stale.example.test</p>",
      textBody: "Use code 918273 and visit https://stale.example.test",
      text: "Use code 918273 and visit https://stale.example.test",
      textPreview: "Use code 918273 and visit https://stale.example.test",
    }),
  );

  assert.ok(model);
  assert.equal(model?.htmlBody, null);
  assert.equal(model?.textBody, null);
  assert.equal(model?.verificationCode, null);
  assert.equal(model?.verificationLink, null);
  assert.deepEqual(model?.extractedLinks, []);
});

test("message body render state stays empty instead of crashing when the selected message has no usable body", () => {
  const model = createMessageRenderModel(
    createSummary({ preview: "No body available." }),
    createDetail({
      htmlBody: null,
      textBody: null,
      text: "   ",
      textPreview: "   ",
    }),
  );

  assert.ok(model);
  const renderState = createMessageBodyRenderState(model!);
  assert.equal(renderState.kind, "empty");
  if (renderState.kind === "empty") {
    assert.match(renderState.title, /message body is not available/i);
  }
});

test("message body render state keeps remote image blocking and malformed html from crashing the preview", () => {
  const model = createMessageRenderModel(
    createSummary({ preview: "HTML fallback" }),
    createDetail({
      htmlBody:
        '<html><body><div><a href="https://verify.example.test/path">Verify</a><img src="cid:embedded"><img src="https://cdn.example.test/banner.png" alt="Banner"><img src="https://broken.example.test"><span><em>Open tags',
      textBody: null,
      text: "",
      textPreview: "",
    }),
  );

  assert.ok(model);
  const renderState = createMessageBodyRenderState(model!);
  assert.equal(renderState.kind, "html");
  if (renderState.kind === "html") {
    assert.equal(renderState.html.hasBlockedRemoteImages, true);
    assert.equal(renderState.html.blockedImageCount, 2);
    assert.match(renderState.html.html, /remote image blocked from cdn\.example\.test/iu);
    assert.match(renderState.html.html, /verify\.example\.test/u);
  }
});
