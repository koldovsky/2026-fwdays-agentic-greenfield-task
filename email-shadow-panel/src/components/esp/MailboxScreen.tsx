import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { EmailAddressCard } from "./EmailAddressCard";
import { MessageList } from "./MessageList";
import { MessagePreview } from "./MessagePreview";
import { VerificationActionsPanel } from "./VerificationActionsPanel";
import { detectCode } from "@/lib/codeDetection";
import { detectVerificationLink } from "@/lib/verificationActions";
import { copyToClipboard } from "@/lib/clipboard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { InboxApiClientError } from "@/lib/inboxApiClient";
import type { InboxMessageDetail, InboxMessageSummary, RecentInboxRecord } from "@/types/inbox";

interface Props {
  inbox: RecentInboxRecord;
  recentInboxes: RecentInboxRecord[];
  selectedInboxId: string | null;
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
  onSelectInbox: (id: string) => void;
  onSelectMessage: (reference: string | null) => void;
  onRetryDetail: () => void;
  notice?: ReactNode;
}

function getDetectedCode(
  message: InboxMessageSummary | null,
  detail: InboxMessageDetail | null,
): string | null {
  if (detail?.text) {
    return detectCode(detail.text) ?? detectCode(detail.textPreview);
  }

  if (!message) {
    return null;
  }

  return detectCode(message.subject) ?? detectCode(message.preview);
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
  onRetryDetail,
  notice,
}: Props) {
  const selected = useMemo(
    () => messages.find((message) => message.reference === selectedMessageReference) ?? null,
    [messages, selectedMessageReference],
  );

  const detectedCode = useMemo(() => getDetectedCode(selected, detail), [detail, selected]);
  const detectedLink = useMemo(
    () => (detail?.text ? detectVerificationLink(detail.text) : null),
    [detail],
  );

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

  const copyDetectedCode = useCallback(() => {
    if (!detectedCode) return;
    void copyToClipboard(detectedCode, { success: "Verification code copied" });
  }, [detectedCode]);

  const shortcuts = useMemo(
    () => ({
      j: () => moveSelection(1),
      k: () => moveSelection(-1),
      ArrowDown: () => moveSelection(1),
      ArrowUp: () => moveSelection(-1),
      c: copyDetectedCode,
      g: onGenerateNew,
      n: onGenerateNew,
      Escape: onClose,
    }),
    [copyDetectedCode, moveSelection, onClose, onGenerateNew],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <section className="mx-auto max-w-[1500px] px-5 pb-10 pt-5 sm:px-8 warp-in">
      <div className="grid gap-4">
        {notice}

        <EmailAddressCard
          session={inbox}
          onRefresh={onRefresh}
          onForget={onForget}
          onClose={onClose}
          onGenerateNew={onGenerateNew}
          refreshing={messageListStatus === "refreshing" || messageListStatus === "loading"}
          removing={removalStatus === "pending"}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)_minmax(300px,340px)]">
          <div className="min-h-[320px] lg:h-[640px]">
            <MessageList
              messages={messages}
              selectedId={selectedMessageReference}
              onSelect={(message) => onSelectMessage(message.reference)}
              loading={messageListStatus === "loading"}
              refreshing={messageListStatus === "refreshing"}
              error={messageListError}
              onRetry={onRefresh}
            />
          </div>
          <div className="min-h-[420px] lg:h-[640px]">
            <MessagePreview
              message={selected}
              detail={detail}
              detailStatus={messageDetailStatus}
              detailError={messageDetailError}
              recipientAddress={inbox.address}
              onRetry={onRetryDetail}
            />
          </div>
          <div className="min-h-[300px] lg:h-[640px]">
            <VerificationActionsPanel
              code={detectedCode}
              link={detectedLink}
              hasSelection={!!selected}
              detailStatus={messageDetailStatus}
              detailErrorMessage={messageDetailError?.message}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
