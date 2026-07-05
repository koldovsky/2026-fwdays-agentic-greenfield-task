import type { InboxMessage } from "@/types/inbox";
import { Mail } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Props {
  message: InboxMessage | null;
}

export function MessagePreview({ message }: Props) {
  if (!message) {
    return (
      <div className="panel flex h-full items-center justify-center">
        <EmptyState
          icon={<Mail className="size-5" />}
          title="No message selected"
          description="Pick a message from the list to preview it here. Detected verification codes appear in the side panel."
        />
      </div>
    );
  }

  return (
    <div key={message.id} className="panel flex h-full min-h-0 flex-col overflow-hidden warp-in">
      <div className="border-b border-hairline px-5 py-4">
        <div className="font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Message
        </div>
        <h2 className="mt-1 text-lg leading-snug text-foreground">{message.subject}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-tabular text-[11px] text-muted-foreground">
          <span className="text-foreground/80">{message.sender}</span>
          {message.senderAddress && (
            <span className="break-all text-muted-foreground/80">
              &lt;{message.senderAddress}&gt;
            </span>
          )}
          <span aria-hidden>/</span>
          <span>{new Date(message.receivedAt).toLocaleString()}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <pre className="whitespace-pre-wrap break-words font-mono-tabular text-[13px] leading-relaxed text-foreground/90">
          {message.bodyText}
        </pre>
      </div>
    </div>
  );
}
