import type { InboxApiClientError } from "@/lib/inboxApiClient";
import { prepareSafeMessageText } from "@/lib/safeMessageText";
import type { InboxMessageDetail, InboxMessageSummary } from "@/types/inbox";
import { FileWarning, Loader2, Mail, RotateCcw } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Props {
  message: InboxMessageSummary | null;
  detail: InboxMessageDetail | null;
  detailStatus: "idle" | "loading" | "loaded" | "error";
  detailError: InboxApiClientError | null;
  onRetry?: () => void;
}

export function MessagePreview({ message, detail, detailStatus, detailError, onRetry }: Props) {
  if (!message) {
    return (
      <div className="panel flex h-full items-center justify-center">
        <EmptyState
          icon={<Mail className="size-5" />}
          title="No message selected"
          description="Pick a message from the list to preview inert text here. Detected verification codes appear in the side panel."
        />
      </div>
    );
  }

  const prepared = detail ? prepareSafeMessageText(detail.text) : null;

  return (
    <div
      key={message.reference}
      className="panel flex h-full min-h-0 flex-col overflow-hidden warp-in"
    >
      <div className="border-b border-hairline px-5 py-4">
        <div className="font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Message
        </div>
        <h2 className="mt-1 text-lg leading-snug text-foreground">{message.subject}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-tabular text-[11px] text-muted-foreground">
          <span className="text-foreground/80">{message.from}</span>
          <span aria-hidden>/</span>
          <span>{message.time}</span>
          {detail ? (
            <>
              <span aria-hidden>/</span>
              <span>{detail.contentType}</span>
              <span aria-hidden>/</span>
              <span>{detail.bodyLength} bytes</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {detailStatus === "loading" && !detail ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-signal" />
            <p className="max-w-xs text-sm">Loading the safe text view for this message.</p>
          </div>
        ) : detailStatus === "error" && detailError ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <EmptyState
                icon={<FileWarning className="size-5" />}
                title="Message detail unavailable"
                description={detailError.message}
              />
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface-raised px-3 py-2 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-signal/40 hover:text-signal"
                >
                  <RotateCcw className="size-3.5" /> Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : prepared ? (
          <div>
            <pre className="whitespace-pre-wrap break-words font-mono-tabular text-[13px] leading-relaxed text-foreground/90">
              {prepared.text}
            </pre>
            {prepared.truncated ? (
              <p className="mt-4 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                very large message truncated for safe preview
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<Mail className="size-5" />}
            title="Awaiting safe preview"
            description="Select this message again or retry loading the detail view."
          />
        )}
      </div>
    </div>
  );
}
