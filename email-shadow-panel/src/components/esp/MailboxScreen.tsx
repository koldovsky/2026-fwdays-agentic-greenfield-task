import { useCallback, useMemo, useState } from "react";
import { EmailAddressCard } from "./EmailAddressCard";
import { MessageList } from "./MessageList";
import { MessagePreview } from "./MessagePreview";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { copyToClipboard } from "@/lib/clipboard";
import type { InboxApiClientError } from "@/lib/inboxApiClient";
import { createMessageRenderModel } from "@/lib/messageRenderModel";
import { getMailboxShortcutSections } from "@/lib/shortcutsCatalog";
import type { InboxMessageDetail, InboxMessageSummary, RecentInboxRecord } from "@/types/inbox";

interface Props {
  inbox: RecentInboxRecord;
  messages: InboxMessageSummary[];
  selectedMessageReference: string | null;
  detail: InboxMessageDetail | null;
  messageListStatus: "idle" | "loading" | "refreshing" | "error";
  messageListError: InboxApiClientError | null;
  messageDetailStatus: "idle" | "loading" | "loaded" | "error";
  messageDetailError: InboxApiClientError | null;
  removalStatus: "idle" | "pending";
  onClose: () => void;
  onGenerateNew: () => void;
  onRefresh: () => void;
  onForget: () => void;
  onSelectMessage: (reference: string | null) => void;
}

function openExternalLink(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
  }
}

export function MailboxScreen({
  inbox,
  messages,
  selectedMessageReference,
  detail,
  messageListStatus,
  messageListError,
  messageDetailStatus,
  messageDetailError,
  removalStatus,
  onClose,
  onGenerateNew,
  onRefresh,
  onForget,
  onSelectMessage,
}: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmForgetOpen, setConfirmForgetOpen] = useState(false);

  const selected = useMemo(
    () => messages.find((message) => message.reference === selectedMessageReference) ?? null,
    [messages, selectedMessageReference],
  );
  const selectedDetail = useMemo(
    () => (selected && detail?.reference === selected.reference ? detail : null),
    [detail, selected],
  );

  const renderModel = useMemo(
    () => createMessageRenderModel(selected, selectedDetail),
    [selected, selectedDetail],
  );
  const detectedCode = renderModel?.verificationCode ?? null;
  const detectedLink = renderModel?.verificationLink ?? null;

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (messages.length === 0) return;
      const currentIndex = Math.max(
        0,
        messages.findIndex((message) => message.reference === selectedMessageReference),
      );
      const nextIndex = Math.min(messages.length - 1, Math.max(0, currentIndex + direction));
      onSelectMessage(messages[nextIndex]?.reference ?? null);
    },
    [messages, onSelectMessage, selectedMessageReference],
  );

  const copyInboxAddress = useCallback(() => {
    void copyToClipboard(inbox.address, { success: "Inbox address copied" });
  }, [inbox.address]);

  const copyDetectedCode = useCallback(() => {
    if (!detectedCode) return;
    void copyToClipboard(detectedCode, { success: "Verification code copied" });
  }, [detectedCode]);

  const openDetectedLink = useCallback(() => {
    if (!detectedLink) {
      return;
    }

    openExternalLink(detectedLink.url);
  }, [detectedLink]);

  const shortcutSections = useMemo(
    () =>
      getMailboxShortcutSections({
        hasVerificationLink: Boolean(detectedLink),
        hasVerificationCode: Boolean(detectedCode),
      }),
    [detectedCode, detectedLink],
  );

  const shortcuts = useMemo(
    () => ({
      j: () => moveSelection(1),
      k: () => moveSelection(-1),
      ArrowDown: () => moveSelection(1),
      ArrowUp: () => moveSelection(-1),
      r: onRefresh,
      c: copyInboxAddress,
      o: detectedCode ? copyDetectedCode : undefined,
      l: detectedLink ? openDetectedLink : undefined,
      g: onGenerateNew,
      n: onGenerateNew,
      Delete: () => setConfirmForgetOpen(true),
      Backspace: () => setConfirmForgetOpen(true),
      "?": () => setHelpOpen(true),
      Escape: onClose,
    }),
    [
      copyDetectedCode,
      copyInboxAddress,
      detectedCode,
      detectedLink,
      moveSelection,
      onClose,
      onGenerateNew,
      onRefresh,
      openDetectedLink,
    ],
  );
  useKeyboardShortcuts(shortcuts, !helpOpen && !confirmForgetOpen);

  return (
    <section className="mx-auto flex h-full max-w-[1760px] flex-col overflow-y-auto px-4 pb-3 pt-2 sm:px-8 sm:pb-4 sm:pt-3 warp-in">
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2.5 lg:overflow-hidden">
        <EmailAddressCard
          session={inbox}
          onRefresh={onRefresh}
          onForget={onForget}
          onClose={onClose}
          onGenerateNew={onGenerateNew}
          refreshing={messageListStatus === "refreshing" || messageListStatus === "loading"}
          removing={removalStatus === "pending"}
          confirmForgetOpen={confirmForgetOpen}
          onConfirmForgetOpenChange={setConfirmForgetOpen}
          auxiliaryActions={
            <ShortcutsHelp
              open={helpOpen}
              onOpenChange={setHelpOpen}
              sections={shortcutSections}
              className="h-10 px-3.5 text-sm font-medium text-foreground"
            />
          }
        />

        <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[clamp(280px,25vw,420px)_minmax(0,1fr)] lg:overflow-hidden">
          <div className="min-h-[300px] min-w-0 lg:min-h-0">
            <MessageList
              messages={messages}
              selectedId={selectedMessageReference}
              onSelect={(message) => onSelectMessage(message.reference)}
              loading={messageListStatus === "loading"}
              refreshing={messageListStatus === "refreshing"}
              error={messageListError}
              lastCheckedAt={inbox.lastCheckedAt}
              onRetry={onRefresh}
            />
          </div>
          <div className="min-h-[360px] min-w-0 lg:min-h-0">
            <MessagePreview
              message={selected}
              renderModel={renderModel}
              detailStatus={messageDetailStatus}
              detailError={messageDetailError}
              recipientAddress={inbox.address}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
