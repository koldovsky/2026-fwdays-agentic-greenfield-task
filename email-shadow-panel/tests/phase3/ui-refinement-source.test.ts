import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} not found`);
  assert.notEqual(end, -1, `${endMarker} not found`);
  return source.slice(start, end);
}

test("header and generate recent-inbox source no longer expose removed user-facing labels", () => {
  const appShell = readSource("src/components/esp/AppShell.tsx");
  const recentInboxesPanel = readSource("src/components/esp/RecentInboxesPanel.tsx");
  const generateScreen = readSource("src/components/esp/GenerateScreen.tsx");

  assert.doesNotMatch(appShell, /Service online/u);
  assert.doesNotMatch(appShell, /Recent inboxes"\s*\)/u);
  assert.match(appShell, /APP_SHELL_NOTICE/u);
  assert.match(appShell, /esp-header-divider/u);
  assert.match(appShell, /py-1\.5/u);
  assert.match(appShell, /Email Shadow Panel home/u);
  assert.match(appShell, /text-foreground">EMAIL/u);
  assert.match(appShell, /text-signal">SHADOW PANEL/u);
  assert.doesNotMatch(appShell, /rounded-2xl border border-signal/u);
  assert.doesNotMatch(appShell, /\bsticky\b/u);
  assert.doesNotMatch(recentInboxesPanel, /0 saved/u);
  assert.doesNotMatch(recentInboxesPanel, /Inbox address/u);
  assert.doesNotMatch(recentInboxesPanel, /Message count/u);
  assert.doesNotMatch(recentInboxesPanel, /Last used time/u);
  assert.doesNotMatch(generateScreen, /Your privacy is protected/u);
  assert.doesNotMatch(generateScreen, /esp-generate-privacy/u);
});

test("mailbox workspace source keeps direct toolbar controls and recent inbox removal confirmation", () => {
  const emailAddressCard = readSource("src/components/esp/EmailAddressCard.tsx");
  const recentInboxesPanel = readSource("src/components/esp/RecentInboxesPanel.tsx");
  const messagePreview = readSource("src/components/esp/MessagePreview.tsx");

  assert.doesNotMatch(emailAddressCard, /DropdownMenu/u);
  assert.match(emailAddressCard, /Forget this inbox\?/u);
  assert.match(emailAddressCard, /Inbox session/u);
  assert.match(emailAddressCard, /APP_SHELL_NOTICE/u);
  assert.doesNotMatch(emailAddressCard, /Saved on this device/u);
  assert.doesNotMatch(emailAddressCard, /\bLIVE\b/u);
  assert.doesNotMatch(emailAddressCard, /esp-live-dot/u);
  assert.doesNotMatch(emailAddressCard, /provider-side deletion/u);
  assert.match(recentInboxesPanel, /AlertDialog/u);
  assert.match(recentInboxesPanel, /Forget this inbox\?/u);
  assert.doesNotMatch(recentInboxesPanel, /onClick=\{\(\) => onForget\(row\.id\)\}/u);
  assert.doesNotMatch(messagePreview, /Star/u);
  assert.doesNotMatch(messagePreview, /MoreHorizontal/u);
  assert.doesNotMatch(messagePreview, /RotateCcw/u);
});

test("mailbox screen uses only inline verification actions in a two-column layout", () => {
  const mailboxScreen = readSource("src/components/esp/MailboxScreen.tsx");
  const messagePreview = readSource("src/components/esp/MessagePreview.tsx");

  assert.doesNotMatch(mailboxScreen, /VerificationActionsPanel/u);
  assert.match(mailboxScreen, /lg:grid-cols-\[clamp\(280px,25vw,420px\)_minmax\(0,1fr\)\]/u);
  assert.match(mailboxScreen, /grid-rows-\[auto_minmax\(0,1fr\)\]/u);
  assert.doesNotMatch(mailboxScreen, /notice\?:/u);
  assert.doesNotMatch(mailboxScreen, /\{notice\}/u);
  assert.doesNotMatch(mailboxScreen, /clamp\(300px,21vw,360px\)/u);
  assert.match(messagePreview, /VerificationActionBar/u);
  assert.doesNotMatch(messagePreview, /Message content/u);
  assert.doesNotMatch(messagePreview, /rounded-\[1\.1rem\].*border border-hairline\/35/u);
});

test("message list source prevents horizontal overflow and badge wrapping", () => {
  const messageList = readSource("src/components/esp/MessageList.tsx");

  assert.match(messageList, /shrink-0 whitespace-nowrap rounded-md/u);
  assert.match(messageList, /overflow-x-hidden overflow-y-auto/u);
  assert.match(messageList, /grid min-w-0 max-w-full gap-1\.5 overflow-hidden p-2/u);
  assert.match(messageList, /className="min-w-0 max-w-full overflow-hidden"/u);
  assert.match(
    messageList,
    /box-border flex min-h-\[88px\] w-full max-w-full min-w-0 items-start/u,
  );
  assert.match(messageList, /min-w-0 flex-1 overflow-hidden/u);
  assert.match(messageList, /truncate whitespace-nowrap text-\[0\.93rem\]/u);
  assert.match(messageList, /block truncate whitespace-nowrap text-\[0\.9rem\]/u);
  assert.match(messageList, /shrink-0 justify-self-end whitespace-nowrap/u);
  assert.match(messageList, /Last check failed/u);
  assert.doesNotMatch(messageList, /Refresh needs attention/u);
  assert.doesNotMatch(messageList, /text-destructive/u);
});

test("mailbox refresh and removal notices do not render disruptive global banners", () => {
  const indexRoute = readSource("src/routes/index.tsx");
  const generateNotice = sourceBetween(
    indexRoute,
    "function buildGenerateNotice",
    "function Index",
  );

  assert.doesNotMatch(indexRoute, /function buildMailboxNotice/u);
  assert.doesNotMatch(indexRoute, /mailboxNotice/u);
  assert.doesNotMatch(indexRoute, /notice=\{mailboxNotice\}/u);
  assert.doesNotMatch(indexRoute, /Inbox forgotten/u);
  assert.doesNotMatch(generateNotice, /removalNotice/u);
  assert.doesNotMatch(generateNotice, /Inbox forgotten/u);
});

test("email body styling removes app table gridlines and keeps blocked images compact", () => {
  const styles = readSource("src/styles.css");
  const emailStyles = sourceBetween(
    styles,
    ".esp-email-content {",
    ".esp-email-image-blocked figcaption",
  );

  assert.match(emailStyles, /border-collapse: separate/u);
  assert.match(emailStyles, /border: 0/u);
  assert.doesNotMatch(emailStyles, /border: 1px solid/u);
  assert.match(emailStyles, /min-height: 2\.75rem/u);
  assert.match(emailStyles, /data-esp-image-tiny="true"/u);
});

test("logo source uses the production mark asset with real split-color wordmark text", () => {
  const logo = readSource("src/components/esp/AppLogo.tsx");
  const appShell = readSource("src/components/esp/AppShell.tsx");
  const mark = readSource("public/brand/email-shadow-panel-mark.svg");

  assert.match(logo, /src="\/brand\/email-shadow-panel-mark\.svg"/u);
  assert.match(logo, /aria-hidden="true"/u);
  assert.match(logo, /alt=""/u);
  assert.match(appShell, /Email Shadow Panel home/u);
  assert.match(appShell, /text-foreground">EMAIL/u);
  assert.match(appShell, /text-signal">SHADOW PANEL/u);
  assert.match(mark, /viewBox="0 0 72 56"/u);
  assert.match(mark, /#38e0c4/u);
  assert.doesNotMatch(mark, /stroke-opacity|opacity|circle|Shadow|panel/u);
  assert.doesNotMatch(appShell, /rounded-2xl border border-signal/u);
});

test("root head wiring uses the brand favicon set without duplicate metadata", () => {
  const rootRoute = readSource("src/routes/__root.tsx");
  const favicon = readSource("public/favicon.svg");

  assert.match(rootRoute, /const faviconVersion = "esp-envelope-20260710"/u);
  assert.match(rootRoute, /\/favicon\.svg\?v=\$\{faviconVersion\}/u);
  assert.match(rootRoute, /\/favicon-32x32\.png\?v=\$\{faviconVersion\}/u);
  assert.match(rootRoute, /\/favicon-16x16\.png\?v=\$\{faviconVersion\}/u);
  assert.match(rootRoute, /\/favicon\.ico\?v=\$\{faviconVersion\}/u);
  assert.match(rootRoute, /favicon-32x32\.png/u);
  assert.match(rootRoute, /favicon-16x16\.png/u);
  assert.match(rootRoute, /favicon\.ico/u);
  assert.match(rootRoute, /apple-touch-icon\.png/u);
  assert.match(favicon, /viewBox="0 0 96 96"/u);
  assert.match(favicon, /#38e0c4/u);
  assert.doesNotMatch(favicon, /stroke-opacity|opacity|circle|Shadow|panel/u);
  assert.doesNotMatch(rootRoute, /alternate icon/u);
});

test("generation screen source keeps desktop layout viewport-fit hooks", () => {
  const generateScreen = readSource("src/components/esp/GenerateScreen.tsx");
  const recentInboxesPanel = readSource("src/components/esp/RecentInboxesPanel.tsx");

  assert.match(generateScreen, /xl:overflow-hidden/u);
  assert.match(generateScreen, /grid min-h-0 flex-1 gap-3/u);
  assert.match(generateScreen, /max-w-\[16ch\]/u);
  assert.doesNotMatch(generateScreen, /min-h-fit/u);
  assert.match(recentInboxesPanel, /justify-center gap-4/u);
  assert.match(recentInboxesPanel, /size-14/u);
  assert.match(recentInboxesPanel, /mt-2\.5 flex flex-wrap/u);
});

test("transition overlay source keeps the inbox-opening state compact", () => {
  const transitionOverlay = readSource("src/components/esp/TransitionOverlay.tsx");

  assert.match(transitionOverlay, /Opening inbox/u);
  assert.match(transitionOverlay, /text-\[2rem\] font-semibold leading-tight tracking-tight/u);
  assert.match(transitionOverlay, /grid size-7 place-items-center/u);
  assert.match(transitionOverlay, /h-2 flex-1 overflow-hidden/u);
  assert.match(transitionOverlay, /grid-cols-\[clamp\(280px,25vw,420px\)_minmax\(0,1fr\)\]/u);
  assert.doesNotMatch(transitionOverlay, /300px_minmax\(0,1fr\)_300px/u);
  assert.doesNotMatch(transitionOverlay, /text-\[clamp\(2rem,1vw\+1\.8rem,3rem\)\].*uppercase/u);
});

test("mailbox route hides the global shell header and both surfaces wire shortcuts help", () => {
  const indexRoute = readSource("src/routes/index.tsx");
  const generateScreen = readSource("src/components/esp/GenerateScreen.tsx");
  const mailboxScreen = readSource("src/components/esp/MailboxScreen.tsx");
  const shortcutsHook = readSource("src/hooks/useKeyboardShortcuts.ts");

  assert.match(indexRoute, /variant=\{showMailbox \? "mailbox" : "default"\}/u);
  assert.match(generateScreen, /ShortcutsHelp/u);
  assert.match(mailboxScreen, /ShortcutsHelp/u);
  assert.match(mailboxScreen, /lastCheckedAt=\{inbox\.lastCheckedAt\}/u);
  assert.match(shortcutsHook, /event\.defaultPrevented/u);
  assert.match(shortcutsHook, /hasActiveOverlay/u);
  assert.match(shortcutsHook, /role="dialog"/u);
});

test("email sanitizer source only traverses body descendants in the DOMParser path", () => {
  const emailHtml = readSource("src/lib/emailHtml.ts");

  assert.match(emailHtml, /body\.querySelectorAll\("\*"\)/u);
  assert.doesNotMatch(emailHtml, /documentRef\.querySelectorAll\("\*"\)/u);
});
