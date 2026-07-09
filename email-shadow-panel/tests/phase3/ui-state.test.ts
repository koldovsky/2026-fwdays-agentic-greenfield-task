import assert from "node:assert/strict";
import test from "node:test";

import { getDetectedCodePanelState } from "../../src/lib/detectedCodePanelState.ts";
import { getRecentInboxPanelState } from "../../src/lib/recentInboxPanelState.ts";
import {
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

  const failed = getTransitionProgressState({
    hasAddress: false,
    mailboxConnected: false,
    ready: false,
    failed: true,
  });
  assert.equal(failed.steps[0]?.status, "error");
});

test("recent inbox panel distinguishes empty and saved states without synthetic inbox records", () => {
  const empty = getRecentInboxPanelState([], Date.parse("2026-07-06T12:30:00.000Z"));
  assert.equal(empty.kind, "empty");
  assert.equal(empty.savedCountLabel, "0 saved");

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
  assert.equal(saved.rows[1]?.messageBadgeLabel, "3 total");
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

test("verification actions panel covers both, link-only, code-only, empty, loading, and error states", () => {
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
  assert.equal(
    getVerificationActionsPanelState({
      code: null,
      link: null,
      hasSelection: true,
      detailStatus: "loaded",
    }).kind,
    "empty",
  );
  assert.equal(
    getVerificationActionsPanelState({
      code: null,
      link: null,
      hasSelection: true,
      detailStatus: "loading",
    }).kind,
    "empty",
  );
  assert.equal(
    getVerificationActionsPanelState({
      code: null,
      link: null,
      hasSelection: true,
      detailStatus: "error",
      detailErrorMessage: "Detail failed.",
    }).kind,
    "empty",
  );
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
