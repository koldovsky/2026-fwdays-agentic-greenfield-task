import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/esp/AppShell";
import { GenerateScreen } from "@/components/esp/GenerateScreen";
import { MailboxScreen } from "@/components/esp/MailboxScreen";
import { TransitionOverlay } from "@/components/esp/TransitionOverlay";
import { createInbox } from "@/services/inboxProvider";
import { saveSession } from "@/lib/localSessions";
import type { InboxSession, ProviderId } from "@/types/inbox";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Email Shadow Panel - temporary inbox control panel" },
      {
        name: "description",
        content:
          "A modern DOS-inspired control panel for generating temporary inboxes, reading incoming mail, and detecting verification codes at a glance.",
      },
      {
        property: "og:title",
        content: "Email Shadow Panel",
      },
      {
        property: "og:description",
        content:
          "Generate a disposable inbox, receive messages, and copy detected OTP codes - one focused control panel.",
      },
    ],
  }),
  component: Index,
});

type View =
  | { kind: "generate" }
  | { kind: "transitioning"; providerId: ProviderId; ready: boolean }
  | { kind: "mailbox"; session: InboxSession };

const MIN_TRANSITION_MS = 520;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function Index() {
  const [view, setView] = useState<View>({ kind: "generate" });

  const handleGenerate = useCallback(async (providerId: ProviderId) => {
    setView({ kind: "transitioning", providerId, ready: false });

    const sessionPromise = createInbox(providerId);
    const minimumPromise = wait(MIN_TRANSITION_MS);
    const session = await sessionPromise;
    setView({ kind: "transitioning", providerId, ready: true });
    await minimumPromise;

    saveSession(session);
    setView({ kind: "mailbox", session });
  }, []);

  const handleClose = useCallback(() => setView({ kind: "generate" }), []);
  const handleResume = useCallback((session: InboxSession) => {
    setView({ kind: "mailbox", session });
  }, []);

  return (
    <AppShell>
      {view.kind === "mailbox" ? (
        <MailboxScreen
          session={view.session}
          onClose={handleClose}
          onGenerateNew={handleGenerate}
        />
      ) : (
        <GenerateScreen
          onGenerate={handleGenerate}
          onResume={handleResume}
          isTransitioning={view.kind === "transitioning"}
        />
      )}
      <TransitionOverlay
        visible={view.kind === "transitioning"}
        providerId={view.kind === "transitioning" ? view.providerId : "emailnator"}
        ready={view.kind === "transitioning" ? view.ready : false}
      />
    </AppShell>
  );
}
