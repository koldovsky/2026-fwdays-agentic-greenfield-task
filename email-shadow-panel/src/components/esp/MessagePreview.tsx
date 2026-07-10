import type { InboxApiClientError } from "@/lib/inboxApiClient";
import type { MessageRenderModel } from "@/lib/messageRenderModel";
import { getSenderInitials } from "@/lib/senderInitials";
import type { InboxMessageSummary } from "@/types/inbox";
import { Loader2, Mail } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { MessageBodyRenderer } from "./MessageBodyRenderer";
import { VerificationActionBar } from "./VerificationActionBar";

interface Props {
  message: InboxMessageSummary | null;
  renderModel: MessageRenderModel | null;
  detailStatus: "idle" | "loading" | "loaded" | "error";
  detailError: InboxApiClientError | null;
  recipientAddress: string;
}

export function MessagePreview({
  message,
  renderModel,
  detailStatus,
  detailError,
  recipientAddress,
}: Props) {
  if (!message || !renderModel) {
    return (
      <div className="panel flex h-full items-center justify-center">
        <EmptyState
          icon={<Mail className="size-5" />}
          title="No message selected"
          description="Pick a message from the list to read the email body here. Verification actions appear with the message."
        />
      </div>
    );
  }

  const showNeutralEmptyState =
    detailStatus === "error" || detailStatus === "loaded" || detailStatus === "idle";
  const neutralDescription = detailError
    ? "Message body is not available. Refresh the inbox to check again."
    : "This message does not include usable HTML or text yet. Refresh the inbox to check again.";
  const hasBody = Boolean(renderModel.htmlBody || renderModel.textBody);

  return (
    <article
      key={message.reference}
      className="panel flex h-full min-h-0 flex-col overflow-hidden warp-in"
      aria-labelledby="selected-message-subject"
    >
      <div className="border-b border-hairline/35 px-4 py-4 sm:px-5 sm:py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <h2
              id="selected-message-subject"
              className="break-words text-[clamp(1.22rem,0.52vw+1.08rem,1.85rem)] font-semibold leading-[1.14] text-foreground"
            >
              {renderModel.subject}
            </h2>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-hairline/45 bg-muted/40 font-mono-tabular text-sm text-foreground">
                {getSenderInitials(renderModel.sender)}
              </span>
              <div className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                <div className="break-words text-[0.98rem] font-semibold text-foreground">
                  {renderModel.sender}
                </div>
                <div className="break-all text-[0.95rem]">To: {recipientAddress}</div>
                {renderModel.badges.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {renderModel.badges.map((badge) => (
                      <span
                        key={badge.label}
                        className={
                          badge.tone === "signal"
                            ? "rounded-full border border-signal/18 bg-signal/10 px-2.5 py-1 font-mono-tabular text-[11px] uppercase tracking-[0.15em] text-signal"
                            : "rounded-full border border-hairline/45 bg-background/30 px-2.5 py-1 font-mono-tabular text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
                        }
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="pt-0.5 text-sm text-muted-foreground">{renderModel.receivedAt}</div>
        </div>
      </div>

      <div className="esp-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {detailStatus === "loading" && !hasBody ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-signal" aria-hidden />
            <p className="max-w-xs text-sm">Loading the safe email body for this message.</p>
          </div>
        ) : hasBody ? (
          <div className="mx-auto grid w-full max-w-[94ch] gap-4 px-1 py-1 sm:px-2">
            <VerificationActionBar model={renderModel} />
            <MessageBodyRenderer model={renderModel} />
          </div>
        ) : showNeutralEmptyState ? (
          <EmptyState
            icon={<Mail className="size-5" />}
            title="Message body is not available"
            description={neutralDescription}
          />
        ) : null}
      </div>
    </article>
  );
}
