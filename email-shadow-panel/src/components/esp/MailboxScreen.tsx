import { useCallback, useEffect, useMemo, useState } from "react";
import { EmailAddressCard } from "./EmailAddressCard";
import { MessageList } from "./MessageList";
import { MessagePreview } from "./MessagePreview";
import { DetectedCodeCard } from "./DetectedCodeCard";
import { detectCode } from "@/lib/codeDetection";
import { copyToClipboard } from "@/lib/clipboard";
import { refreshMessages } from "@/services/inboxProvider";
import { updateSession } from "@/lib/localSessions";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { InboxMessage, InboxSession, ProviderId } from "@/types/inbox";

interface Props {
  session: InboxSession;
  onClose: () => void;
  onGenerateNew: (providerId: ProviderId) => void | Promise<void>;
}

function getDetectedCode(message: InboxMessage | null): string | null {
  if (!message) return null;
  return detectCode(message.bodyText) ?? detectCode(message.subject) ?? detectCode(message.preview);
}

export function MailboxScreen({ session, onClose, onGenerateNew }: Props) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);
      try {
        const msgs = await refreshMessages(session.providerId, session.id);
        setMessages(msgs);
        updateSession(session.id, { messageCount: msgs.length });
        setSelectedId((cur) => {
          if (cur && msgs.some((m) => m.id === cur)) return cur;
          const first = msgs.find((m) => !m.isRead) ?? msgs[0];
          return first?.id ?? null;
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.id, session.providerId],
  );

  useEffect(() => {
    let cancelled = false;
    void load(true);
    const t = setTimeout(() => {
      if (!cancelled) void load(false);
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [load]);

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId],
  );

  useEffect(() => {
    if (!selected || selected.isRead) return;
    setMessages((ms) => ms.map((m) => (m.id === selected.id ? { ...m, isRead: true } : m)));
  }, [selected]);

  const detectedCode = useMemo(() => getDetectedCode(selected), [selected]);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (messages.length === 0) return;
      const currentIndex = Math.max(
        0,
        messages.findIndex((m) => m.id === selectedId),
      );
      const nextIndex = Math.min(messages.length - 1, Math.max(0, currentIndex + direction));
      setSelectedId(messages[nextIndex]?.id ?? null);
    },
    [messages, selectedId],
  );

  const copyDetectedCode = useCallback(() => {
    if (!detectedCode) return;
    void copyToClipboard(detectedCode, { success: "Detected code copied" });
  }, [detectedCode]);

  const generateNew = useCallback(() => {
    void onGenerateNew("emailnator");
  }, [onGenerateNew]);

  const shortcuts = useMemo(
    () => ({
      j: () => moveSelection(1),
      k: () => moveSelection(-1),
      ArrowDown: () => moveSelection(1),
      ArrowUp: () => moveSelection(-1),
      c: copyDetectedCode,
      g: generateNew,
      n: generateNew,
      Escape: onClose,
    }),
    [copyDetectedCode, generateNew, moveSelection, onClose],
  );
  useKeyboardShortcuts(shortcuts);

  const handleSelect = (m: InboxMessage) => setSelectedId(m.id);

  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-16 pt-4 sm:px-8 warp-in">
      <div className="grid gap-4 lg:gap-5">
        <EmailAddressCard
          session={session}
          onRefresh={() => void load(false)}
          onClose={onClose}
          onGenerateNew={generateNew}
          refreshing={refreshing}
        />

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(280px,320px)]">
          <div className="min-h-[320px] lg:h-[640px]">
            <MessageList
              messages={messages}
              selectedId={selectedId}
              onSelect={handleSelect}
              loading={loading}
              refreshing={refreshing}
            />
          </div>
          <div className="min-h-[360px] lg:h-[640px]">
            <MessagePreview message={selected} />
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
