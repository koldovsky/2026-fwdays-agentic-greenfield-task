import type { InboxApiClientError } from "@/lib/inboxApiClient";
import { prepareSafeMessageText } from "@/lib/safeMessageText";
import type { InboxMessageDetail, InboxMessageSummary } from "@/types/inbox";
import { FileWarning, Loader2, Mail, MoreHorizontal, RotateCcw, Star } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Props {
  message: InboxMessageSummary | null;
  detail: InboxMessageDetail | null;
  detailStatus: "idle" | "loading" | "loaded" | "error";
  detailError: InboxApiClientError | null;
  recipientAddress: string;
  onRetry?: () => void;
}

export function MessagePreview({
  message,
  detail,
  detailStatus,
  detailError,
  recipientAddress,
  onRetry,
}: Props) {
  if (!message) {
    return (
      <div className="panel flex h-full items-center justify-center">
        <EmptyState
          icon={<Mail className="size-5" />}
          title="No message selected"
          description="Pick a message from the list to read the inert email body here. Verification actions appear in the side panel."
        />
      </div>
    );
  }

  const prepared = detail ? prepareSafeMessageText(detail.text) : null;

  return (
    <article
      key={message.reference}
      className="panel flex h-full min-h-0 flex-col overflow-hidden warp-in"
      aria-labelledby="selected-message-subject"
    >
      <div className="border-b border-hairline px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="selected-message-subject"
              className="break-words text-2xl font-semibold leading-snug text-foreground"
            >
              {message.subject}
            </h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-hairline bg-muted/45 font-mono-tabular text-sm text-foreground">
                {message.from.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                <div className="break-words text-base font-semibold text-foreground">
                  {message.from}
                </div>
                <div className="break-all">To: {recipientAddress}</div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
            <span className="hidden text-sm sm:inline">{message.time}</span>
            <button type="button" aria-label="Star message" disabled className="opacity-45">
              <Star className="size-5" aria-hidden />
            </button>
            <button type="button" aria-label="More message actions" disabled className="opacity-45">
              <MoreHorizontal className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {detailStatus === "loading" && !detail ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-signal" aria-hidden />
            <p className="max-w-xs text-sm">Loading the safe text view for this message.</p>
          </div>
        ) : detailStatus === "error" && detailError ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <EmptyState
                icon={<FileWarning className="size-5" />}
                title="Message body unavailable"
                description={detailError.message}
              />
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface-raised px-3 py-2 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-signal/40 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <RotateCcw className="size-3.5" aria-hidden /> Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : prepared ? (
          <div className="rounded-md border border-hairline bg-background/35 p-6 shadow-[inset_0_1px_0_color-mix(in_oklab,white_4%,transparent)]">
            <pre className="whitespace-pre-wrap break-words font-sans text-base leading-8 text-foreground/90">
              {prepared.text}
            </pre>
            {prepared.truncated ? (
              <p className="mt-5 border-t border-hairline pt-4 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Very large message truncated for safe preview
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<Mail className="size-5" />}
            title="Awaiting message body"
            description="Select this message again or retry loading the detail view."
          />
        )}
      </div>
    </article>
  );
}
