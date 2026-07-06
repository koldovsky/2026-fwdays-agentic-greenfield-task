import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { EmailAddressCard } from "./EmailAddressCard";
import { MessageList } from "./MessageList";
import { MessagePreview } from "./MessagePreview";
import { DetectedCodeCard } from "./DetectedCodeCard";
import { RecentSessions } from "./RecentSessions";
import { detectCode } from "@/lib/codeDetection";
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
  recentInboxes,
  selectedInboxId,
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
  onSelectInbox,
  onSelectMessage,
  onRetryDetail,
  notice,
}: Props) {
  const selected = useMemo(
    () => messages.find((message) => message.reference === selectedMessageReference) ?? null,
    [messages, selectedMessageReference],
  );

  const detectedCode = useMemo(() => getDetectedCode(selected, detail), [detail, selected]);

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
    void copyToClipboard(detectedCode, { success: "Detected code copied" });
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
    <section className="mx-auto max-w-[1400px] px-5 pb-16 pt-4 sm:px-8 warp-in">
      <div className="grid gap-4 lg:gap-5">
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

        {recentInboxes.length > 1 ? (
          <RecentSessions
            items={recentInboxes}
            selectedInboxId={selectedInboxId}
            onSelect={onSelectInbox}
          />
        ) : null}

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(280px,320px)]">
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
          <div className="min-h-[360px] lg:h-[640px]">
            <MessagePreview
              message={selected}
              detail={detail}
              detailStatus={messageDetailStatus}
              detailError={messageDetailError}
              onRetry={onRetryDetail}
            />
          </div>
          <div className="min-h-[260px] lg:h-[640px]">
            <DetectedCodeCard code={detectedCode} hasSelection={!!selected} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
          <span className="rounded-sm border border-hairline bg-background/35 px-2.5 py-1.5">
            J/K or arrows: select
          </span>
          <span className="rounded-sm border border-hairline bg-background/35 px-2.5 py-1.5">
            C: copy code
          </span>
          <span className="rounded-sm border border-hairline bg-background/35 px-2.5 py-1.5">
            G/N: new inbox
          </span>
          <span className="rounded-sm border border-hairline bg-background/35 px-2.5 py-1.5">
            Esc: control panel
          </span>
        </div>
      </div>
    </section>
  );
}
