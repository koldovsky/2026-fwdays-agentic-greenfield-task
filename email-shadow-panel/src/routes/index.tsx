import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/esp/AppShell";
import { GenerateScreen } from "@/components/esp/GenerateScreen";
import { MailboxScreen } from "@/components/esp/MailboxScreen";
import { StatusBanner } from "@/components/esp/StatusBanner";
import { TransitionOverlay } from "@/components/esp/TransitionOverlay";
import { useInboxController, useInboxControllerState } from "@/hooks/useInboxController";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
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
          "Generate a disposable inbox, receive messages, and act on verification links or one-time codes.",
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

  if (sessionNotice) {
    return <StatusBanner title="Browser storage recovered" description={sessionNotice} />;
  }

  return null;
}

function Index() {
  const controller = useInboxController();
  const state = useInboxControllerState(controller);
  const [panelMode, setPanelMode] = useState<PanelMode>("auto");
  const [transition, setTransition] = useState<{
    visible: boolean;
    providerId: ProviderId;
    ready: boolean;
    address: string | null;
    errorMessage: string | null;
    sourceInboxId: string | null;
  }>({
    visible: false,
    providerId: "emailnator",
    ready: false,
    address: null,
    errorMessage: null,
    sourceInboxId: null,
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

  useEffect(() => {
    if (
      !transition.visible ||
      transition.address ||
      transition.errorMessage ||
      !state.selectedInbox
    ) {
      return;
    }

    if (state.selectedInbox.id === transition.sourceInboxId) {
      return;
    }

    setTransition((current) =>
      current.visible && !current.address && !current.errorMessage
        ? { ...current, address: state.selectedInbox?.address ?? null }
        : current,
    );
  }, [
    state.selectedInbox,
    transition.address,
    transition.errorMessage,
    transition.sourceInboxId,
    transition.visible,
  ]);

  const handleGenerate = useCallback(async () => {
    if ((transition.visible && !transition.errorMessage) || state.generateStatus === "pending") {
      return;
    }

    const previousSelectedInboxId = state.selectedInboxId;
    setTransition({
      visible: true,
      providerId: "emailnator",
      ready: false,
      address: null,
      errorMessage: null,
      sourceInboxId: previousSelectedInboxId,
    });

    const minimumPromise = wait(MIN_TRANSITION_MS);
    await controller.generateInbox();
    const generatedState = controller.getState();
    const generatedInbox = generatedState.selectedInbox;
    const generationSucceeded =
      !generatedState.createError && generatedState.selectedInboxId !== previousSelectedInboxId;

    await minimumPromise;

    if (generationSucceeded && generatedInbox) {
      setTransition({
        visible: true,
        providerId: "emailnator",
        ready: true,
        address: generatedInbox.address,
        errorMessage: null,
        sourceInboxId: previousSelectedInboxId,
      });
      await wait(280);
      setTransition((current) => ({
        ...current,
        visible: false,
        ready: false,
        errorMessage: null,
      }));
      setPanelMode("mailbox");
      return;
    }

    setTransition((current) => ({
      ...current,
      visible: true,
      ready: false,
      errorMessage:
        generatedState.createError?.message ?? "Inbox generation did not return a usable mailbox.",
    }));
  }, [
    controller,
    state.generateStatus,
    state.selectedInboxId,
    transition.errorMessage,
    transition.visible,
  ]);

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

  const handleTransitionBack = useCallback(() => {
    setTransition((current) => ({
      ...current,
      visible: false,
      ready: false,
      errorMessage: null,
    }));
    setPanelMode("generate");
  }, []);

  const handleRefresh = useCallback(() => {
    void controller.refreshMessages();
  }, [controller]);

  const transitionShortcuts = useMemo(
    () => ({
      Escape: transition.visible ? () => handleTransitionBack() : undefined,
    }),
    [handleTransitionBack, transition.visible],
  );
  useKeyboardShortcuts(transitionShortcuts, transition.visible);

  const generateNotice = useMemo(
    () => buildGenerateNotice(state.createError, state.sessionNotice, handleGenerate),
    [handleGenerate, state.createError, state.sessionNotice],
  );

  const showMailbox = panelMode === "mailbox" && !!state.selectedInbox;

  return (
    <AppShell variant={showMailbox ? "mailbox" : "default"}>
      {showMailbox && state.selectedInbox ? (
        <MailboxScreen
          inbox={state.selectedInbox}
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
          onSelectMessage={(reference) => void controller.selectMessage(reference)}
        />
      ) : (
        <GenerateScreen
          onGenerate={() => void handleGenerate()}
          onResume={handleResume}
          onForgetRecent={(id) => controller.forgetRecentInbox(id)}
          isTransitioning={transition.visible}
          recentInboxes={state.recentInboxes}
          selectedInboxId={state.selectedInboxId}
          notice={generateNotice}
        />
      )}
      <TransitionOverlay
        visible={transition.visible}
        providerId={transition.providerId}
        address={transition.address}
        mailboxConnected={Boolean(transition.address) && state.messageListStatus !== "idle"}
        ready={transition.ready}
        errorMessage={transition.errorMessage}
        onRetry={() => void handleGenerate()}
        onBack={handleTransitionBack}
      />
    </AppShell>
  );
}
