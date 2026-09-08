import assert from "node:assert/strict";
import test from "node:test";

import { getAppShellNotices } from "../../src/lib/appShellState.ts";
import { getDetectedCodePanelState } from "../../src/lib/detectedCodePanelState.ts";
import { PROVIDERS } from "../../src/lib/providerCatalog.ts";
import { getRecentInboxPanelState } from "../../src/lib/recentInboxPanelState.ts";
import {
  formatSafeMessageBlocks,
  paragraphizeMessageText,
  prepareSafeMessageText,
} from "../../src/lib/safeMessageText.ts";
import { getMailboxShortcutSections } from "../../src/lib/shortcutsCatalog.ts";
import { getSenderInitials } from "../../src/lib/senderInitials.ts";
import {
  getTransitionFooterState,
  getTransitionProgressState,
  getTransitionStatusText,
  TRANSITION_PROGRESS_STEPS,
} from "../../src/lib/transitionOverlayState.ts";
import {
  detectVerificationLink,
  getVerificationActionsPanelState,
} from "../../src/lib/verificationActions.ts";
import { createRecentInboxRecord } from "./test-helpers.ts";

function emptyTitle(input: Parameters<typeof getDetectedCodePanelState>[0]): string {
  const state = getDetectedCodePanelState(input);
  assert.equal(state.kind, "empty");
  return state.title;
}

test("app shell notices keep only the browser-storage label", () => {
  assert.deepEqual(getAppShellNotices(), ["Stored in this browser"]);
});

test("transition progress maps to actual address, connection, ready, and failure state", () => {
  assert.deepEqual(
    TRANSITION_PROGRESS_STEPS.map((step) => step.label),
    ["Address generated", "Mailbox connected", "Preparing message stream"],
  );

  const initial = getTransitionProgressState({
    hasAddress: false,
    mailboxConnected: false,
    ready: false,
    failed: false,
  });
  assert.deepEqual(
    initial.steps.map((step) => step.status),
    ["active", "pending", "pending"],
  );
  assert.doesNotMatch(
    getTransitionStatusText({
      providerId: "emailnator",
      hasAddress: false,
      mailboxConnected: false,
      ready: false,
    }),
    /ready/i,
  );

  const connected = getTransitionProgressState({
    hasAddress: true,
    mailboxConnected: true,
    ready: false,
    failed: false,
  });
  assert.deepEqual(
    connected.steps.map((step) => step.status),
    ["complete", "complete", "active"],
  );

  const ready = getTransitionProgressState({
    hasAddress: true,
    mailboxConnected: true,
    ready: true,
    failed: false,
  });
  assert.equal(ready.progressPercent, 100);
  assert.match(
    getTransitionStatusText({
      providerId: "emailnator",
      hasAddress: true,
      mailboxConnected: true,
      ready: true,
    }),
    /ready/i,
  );
  assert.deepEqual(getTransitionFooterState({ failed: false, ready: false }), {
    label: "Inbox ready soon",
    description: "You'll be taken to your mailbox automatically.",
  });

  const failed = getTransitionProgressState({
    hasAddress: false,
    mailboxConnected: false,
    ready: false,
    failed: true,
  });
  assert.equal(failed.steps[0]?.status, "error");
  assert.deepEqual(getTransitionFooterState({ failed: true, ready: false }), {
    label: "Inbox not opened",
    description: "No link or code was opened automatically.",
  });
});

test("recent inbox panel distinguishes empty and saved states and removes total copy", () => {
  const empty = getRecentInboxPanelState([], Date.parse("2026-07-06T12:30:00.000Z"));
  assert.equal(empty.kind, "empty");
  assert.equal(empty.savedCountLabel, null);

  const saved = getRecentInboxPanelState(
    [
      createRecentInboxRecord({
        address: "shadow.panel.001@gmail.com",
        createdAt: "2026-07-06T12:00:00.000Z",
      }),
      {
        ...createRecentInboxRecord({
          address: "shadow.panel.002@gmail.com",
          createdAt: "2026-07-06T12:10:00.000Z",
          capabilityToken: "BAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiI",
        }),
        lastMessageCount: 3,
      },
    ],
    Date.parse("2026-07-06T12:30:00.000Z"),
  );

  assert.equal(saved.kind, "saved");
  assert.equal(saved.savedCountLabel, "2 saved");
  assert.equal(saved.rows[0]?.messageBadgeLabel, "0 new");
  assert.equal(saved.rows[1]?.messageBadgeLabel, "3 messages");
  assert.equal(saved.rows[0]?.forgetLabel, "Forget recent inbox shadow.panel.001@gmail.com");
});

test("provider catalog keeps a consistent icon model and coming-soon badges", () => {
  assert.equal(
    PROVIDERS.every((provider) => provider.iconKind === "mail"),
    true,
  );
  assert.deepEqual(
    PROVIDERS.filter((provider) => !provider.available).map((provider) => provider.badge),
    ["Coming soon", "Coming soon"],
  );
});

test("mailbox shortcut sections include only reliable verification actions", () => {
  const withVerification = getMailboxShortcutSections({
    hasVerificationLink: true,
    hasVerificationCode: true,
  });
  const withoutVerification = getMailboxShortcutSections({
    hasVerificationLink: false,
    hasVerificationCode: false,
  });

  assert.equal(
    withVerification.some((section) => section.title === "Verification"),
    true,
  );
  assert.equal(
    withVerification.some((section) => section.items.some((item) => item.keys.includes("L"))),
    true,
  );
  assert.equal(
    withVerification.some((section) => section.items.some((item) => item.keys.includes("O"))),
    true,
  );
  assert.equal(
    withoutVerification.some((section) => section.title === "Verification"),
    false,
  );
});

test("verification link detection only returns explicit http or https candidates", () => {
  assert.deepEqual(
    detectVerificationLink(
      'Please verify your email <a href="https://accounts.service.test/verify?token=abc&amp;next=ok">Verify</a>',
    ),
    {
      url: "https://accounts.service.test/verify?token=abc&next=ok",
      hostname: "accounts.service.test",
    },
  );
  assert.equal(detectVerificationLink('Bad link <a href="javascript:alert(1)">verify</a>'), null);
  assert.equal(detectVerificationLink("No action in this newsletter."), null);
});

test("verification actions panel covers both, link-only, code-only, empty, loading, and unavailable states", () => {
  const link = { url: "https://accounts.service.test/verify", hostname: "accounts.service.test" };

  assert.deepEqual(
    getVerificationActionsPanelState({
      code: "481-902",
      link,
      hasSelection: true,
      detailStatus: "loaded",
    }),
    { kind: "actions", code: "481-902", link },
  );
  assert.equal(
    getVerificationActionsPanelState({
      code: null,
      link,
      hasSelection: true,
      detailStatus: "loaded",
    }).kind,
    "actions",
  );
  assert.equal(
    getVerificationActionsPanelState({
      code: "481-902",
      link: null,
      hasSelection: true,
      detailStatus: "loading",
    }).kind,
    "actions",
  );

  const noSelection = getVerificationActionsPanelState({
    code: null,
    link: null,
    hasSelection: false,
    detailStatus: "idle",
  });
  assert.deepEqual(noSelection, {
    kind: "empty",
    title: "Select a message",
    description: "Select a message to see verification actions.",
  });

  const unavailable = getVerificationActionsPanelState({
    code: null,
    link: null,
    hasSelection: true,
    detailStatus: "error",
    detailErrorMessage: "The inbox provider is temporarily unavailable.",
  });
  assert.deepEqual(unavailable, {
    kind: "empty",
    title: "Message content is not available for verification",
    description: "Message content is not available for verification.",
  });

  const notReady = getVerificationActionsPanelState({
    code: null,
    link: null,
    hasSelection: true,
    detailStatus: "idle",
  });
  assert.deepEqual(notReady, {
    kind: "empty",
    title: "Message content is not available for verification",
    description: "Message content is not available for verification.",
  });

  const noAction = getVerificationActionsPanelState({
    code: null,
    link: null,
    hasSelection: true,
    detailStatus: "loaded",
  });
  assert.deepEqual(noAction, {
    kind: "empty",
    title: "No verification action detected",
    description: "This message does not contain a clear verification link or one-time code.",
  });
});

test("detected-code panel distinguishes loading, error, unavailable, and true no-code states", () => {
  assert.equal(
    emptyTitle({
      code: null,
      hasSelection: true,
      detailStatus: "loading",
    }),
    "Checking message detail",
  );
  assert.equal(
    emptyTitle({
      code: null,
      hasSelection: true,
      detailStatus: "error",
      detailErrorMessage: "Detail request failed.",
    }),
    "Code check unavailable",
  );
  assert.equal(
    emptyTitle({
      code: null,
      hasSelection: true,
      detailStatus: "idle",
    }),
    "Awaiting safe preview",
  );
  assert.equal(
    emptyTitle({
      code: null,
      hasSelection: true,
      detailStatus: "loaded",
    }),
    "No code found",
  );
});

test("detected-code panel keeps a detected summary code visible while detail is pending", () => {
  assert.deepEqual(
    getDetectedCodePanelState({
      code: "sample-code",
      hasSelection: true,
      detailStatus: "loading",
    }),
    { kind: "code" },
  );
});

test("sender initials stay consistent across acronym, multi-word, and single-word names", () => {
  assert.equal(getSenderInitials("AI TOOLS"), "AI");
  assert.equal(getSenderInitials("Service Team"), "ST");
  assert.equal(getSenderInitials("GitHub"), "GI");
  assert.equal(getSenderInitials("'Customer-Success' <support@example.test>"), "CS");
});

test("safe message formatting groups metadata, paragraphs, lists, and inert urls cleanly", () => {
  const body = [
    "From: Example <noreply@example.test> Subject: Welcome Time: 11:42 AM Hello there! Thanks for joining. Please keep this email for your records. Use code 481-902 to continue.",
    "",
    "- Bring your ID",
    "- Save this code",
    "",
    "Visit https://example.test/verify to continue.",
  ].join("\n");

  const blocks = formatSafeMessageBlocks(body);
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ["metadata", "paragraph", "paragraph", "list", "paragraph"],
  );
  assert.match(blocks[0]?.text ?? "", /From:/u);
  assert.match(blocks[0]?.text ?? "", /Subject:/u);
  assert.match(blocks[0]?.text ?? "", /Time:/u);
  assert.deepEqual(blocks[3]?.items, ["Bring your ID", "Save this code"]);
  assert.match(blocks[4]?.text ?? "", /https:\/\/example\.test\/verify/u);

  const paragraphs = paragraphizeMessageText(body);
  assert.ok(paragraphs.length >= 4);
  assert.match(paragraphs.join(" "), /https:\/\/example\.test\/verify/u);

  const prepared = prepareSafeMessageText("First line\nSecond line", 8);
  assert.equal(prepared.truncated, true);
  assert.match(prepared.text, /message truncated for safe preview/u);
  assert.ok(prepared.paragraphs.length >= 1);
});
