import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/esp/AppShell";
import { GenerateScreen } from "@/components/esp/GenerateScreen";
import { MailboxScreen } from "@/components/esp/MailboxScreen";
import { StatusBanner } from "@/components/esp/StatusBanner";
import { TransitionOverlay } from "@/components/esp/TransitionOverlay";
import { useInboxController, useInboxControllerState } from "@/hooks/useInboxController";
import type { InboxApiClientError } from "@/lib/inboxApiClient";
import type { ProviderId } from "@/types/inbox";

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

const MIN_TRANSITION_MS = 520;

type PanelMode = "auto" | "generate" | "mailbox";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRetrySuffix(error: InboxApiClientError | null): string {
  if (!error?.retryAfterSeconds) {
    return "";
  }

  return ` Retry after ${error.retryAfterSeconds}s.`;
}

function buildGenerateNotice(
  error: InboxApiClientError | null,
  sessionNotice: string | null,
  removalNotice: string | null,
  onRetry: () => void,
): ReactNode {
  if (error) {
    switch (error.kind) {
      case "activeInboxLimit":
        return (
          <StatusBanner
            tone="warning"
            title="Active inbox limit reached"
            description="Forget one of the recent browser-local inboxes before generating another."
          />
        );
      case "rateLimited":
        return (
          <StatusBanner
            tone="warning"
            title="Generation rate limited"
            description={`Too many creation requests were sent from this browser.${buildRetrySuffix(error)}`}
          />
        );
      case "providerDisabled":
        return (
          <StatusBanner
            tone="warning"
            title="Inbox provider paused"
            description="The provider kill switch is active. Try again later."
          />
        );
      case "providerUnavailable":
        return (
          <StatusBanner
            tone="error"
            title="Provider unavailable"
            description="The inbox provider is temporarily unavailable. No new inbox was created."
            actionLabel="Retry"
            onAction={onRetry}
          />
        );
      case "timeout":
        return (
          <StatusBanner
            tone="warning"
            title="Generation timed out"
            description="The inbox request took too long to complete."
            actionLabel="Retry"
            onAction={onRetry}
          />
        );
      case "offline":
        return (
          <StatusBanner
            tone="error"
            title="Offline or network blocked"
            description="The browser could not reach the same-origin API. Check the local server and try again."
            actionLabel="Retry"
            onAction={onRetry}
          />
        );
      default:
        return (
          <StatusBanner
            tone="error"
            title="Inbox generation failed"
            description={error.message}
            actionLabel="Retry"
            onAction={onRetry}
          />
        );
    }
  }

  if (removalNotice) {
    return <StatusBanner tone="success" title="Inbox forgotten" description={removalNotice} />;
  }

  if (sessionNotice) {
    return <StatusBanner title="Browser storage recovered" description={sessionNotice} />;
  }

  return null;
}

function buildMailboxNotice(
  error: InboxApiClientError | null,
  sessionNotice: string | null,
  removalNotice: string | null,
  onRetry: () => void,
): ReactNode {
  if (sessionNotice) {
    return <StatusBanner title="Inbox session updated" description={sessionNotice} />;
  }

  if (removalNotice) {
    return <StatusBanner tone="success" title="Inbox forgotten" description={removalNotice} />;
  }

  if (!error) {
    return null;
  }

  switch (error.kind) {
    case "rateLimited":
      return (
        <StatusBanner
          tone="warning"
          title="Read rate limited"
          description={`Too many refresh requests were sent for this inbox.${buildRetrySuffix(error)}`}
        />
      );
    case "refreshInProgress":
      return (
        <StatusBanner
          title="Refresh already running"
          description="The selected inbox is already being refreshed."
        />
      );
    case "providerDisabled":
      return (
        <StatusBanner
          tone="warning"
          title="Inbox provider paused"
          description="Automatic polling stopped because the provider is disabled. Manual retry stays available."
          actionLabel="Retry"
          onAction={onRetry}
        />
      );
    case "providerUnavailable":
      return (
        <StatusBanner
          tone="error"
          title="Provider unavailable"
          description="Automatic polling backed off after a transient provider failure."
          actionLabel="Retry"
          onAction={onRetry}
        />
      );
    case "timeout":
      return (
        <StatusBanner
          tone="warning"
          title="Refresh timed out"
          description="The selected inbox took too long to refresh. Automatic polling backed off safely."
          actionLabel="Retry"
          onAction={onRetry}
        />
      );
    case "offline":
      return (
        <StatusBanner
          tone="error"
          title="Offline or network blocked"
          description="The selected inbox could not reach the same-origin API."
          actionLabel="Retry"
          onAction={onRetry}
        />
      );
    default:
      return (
        <StatusBanner
          tone="error"
          title="Inbox refresh failed"
          description={error.message}
          actionLabel="Retry"
          onAction={onRetry}
        />
      );
  }
}

function Index() {
  const controller = useInboxController();
  const state = useInboxControllerState(controller);
  const [panelMode, setPanelMode] = useState<PanelMode>("auto");
  const [transition, setTransition] = useState<{
    visible: boolean;
    providerId: ProviderId;
    ready: boolean;
  }>({
    visible: false,
    providerId: "emailnator",
    ready: false,
  });

  useEffect(() => {
    if (!state.initialized) {
      return;
    }

    if (panelMode === "auto") {
      setPanelMode(state.selectedInbox ? "mailbox" : "generate");
      return;
    }

    if (panelMode === "mailbox" && !state.selectedInbox) {
      setPanelMode("generate");
    }
  }, [panelMode, state.initialized, state.selectedInbox]);

  const handleGenerate = useCallback(async () => {
    if (transition.visible || state.generateStatus === "pending") {
      return;
    }

    const previousSelectedInboxId = state.selectedInboxId;
    setTransition({ visible: true, providerId: "emailnator", ready: false });
    const minimumPromise = wait(MIN_TRANSITION_MS);
    await controller.generateInbox();
    const generatedState = controller.getState();
    const generationSucceeded =
      !generatedState.createError && generatedState.selectedInboxId !== previousSelectedInboxId;
    if (generationSucceeded) {
      setTransition({ visible: true, providerId: "emailnator", ready: true });
    }
    await minimumPromise;
    setTransition((current) => ({ ...current, visible: false, ready: false }));
    if (generationSucceeded) {
      setPanelMode("mailbox");
    }
  }, [controller, state.generateStatus, state.selectedInboxId, transition.visible]);

  const handleResume = useCallback(
    (id: string) => {
      setPanelMode("mailbox");
      void controller.selectInbox(id);
    },
    [controller],
  );

  const handleClose = useCallback(() => {
    setPanelMode("generate");
  }, []);

  const handleRefresh = useCallback(() => {
    void controller.refreshMessages();
  }, [controller]);

  const handleRetryDetail = useCallback(() => {
    if (!state.selectedMessageReference) {
      return;
    }

    void controller.selectMessage(state.selectedMessageReference);
  }, [controller, state.selectedMessageReference]);

  const generateNotice = useMemo(
    () =>
      buildGenerateNotice(
        state.createError,
        state.sessionNotice,
        state.removalNotice,
        handleGenerate,
      ),
    [handleGenerate, state.createError, state.removalNotice, state.sessionNotice],
  );

  const mailboxNotice = useMemo(
    () =>
      buildMailboxNotice(
        state.messageListError,
        state.sessionNotice,
        state.removalNotice,
        handleRefresh,
      ),
    [handleRefresh, state.messageListError, state.removalNotice, state.sessionNotice],
  );

  const showMailbox = panelMode === "mailbox" && !!state.selectedInbox;

  return (
    <AppShell>
      {showMailbox && state.selectedInbox ? (
        <MailboxScreen
          inbox={state.selectedInbox}
          recentInboxes={state.recentInboxes}
          selectedInboxId={state.selectedInboxId}
          messages={state.messages}
          selectedMessageReference={state.selectedMessageReference}
          detail={state.selectedMessageDetail}
          messageListStatus={state.messageListStatus}
          messageListError={state.messageListError}
          messageDetailStatus={state.messageDetailStatus}
          messageDetailError={state.messageDetailError}
          removalStatus={state.removalStatus}
          onClose={handleClose}
          onGenerateNew={handleGenerate}
          onRefresh={handleRefresh}
          onForget={() => void controller.forgetSelectedInbox()}
          onSelectInbox={handleResume}
          onSelectMessage={(reference) => void controller.selectMessage(reference)}
          onRetryDetail={handleRetryDetail}
          notice={mailboxNotice}
        />
      ) : (
        <GenerateScreen
          onGenerate={() => void handleGenerate()}
          onResume={handleResume}
          isTransitioning={transition.visible}
          recentInboxes={state.recentInboxes}
          selectedInboxId={state.selectedInboxId}
          notice={generateNotice}
        />
      )}
      <TransitionOverlay
        visible={transition.visible}
        providerId={transition.providerId}
        ready={transition.ready}
      />
    </AppShell>
  );
}
