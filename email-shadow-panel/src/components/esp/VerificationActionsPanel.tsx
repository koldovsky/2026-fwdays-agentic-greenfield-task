import { useCallback, type ReactNode } from "react";
import { CopyButton } from "./CopyButton";
import { EmptyState } from "./EmptyState";
import {
  getVerificationActionsPanelState,
  type MessageDetailStatus,
  type VerificationLink,
} from "@/lib/verificationActions";
import { cn } from "@/lib/utils";
import { ExternalLink, Info, KeyRound, Link2, ShieldCheck } from "lucide-react";

interface Props {
  code: string | null;
  link: VerificationLink | null;
  hasSelection: boolean;
  detailStatus: MessageDetailStatus;
  detailErrorMessage?: string | null;
}

function ActionCard({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-hairline bg-background/30 p-4">{children}</div>;
}

export function VerificationActionsPanel({
  code,
  link,
  hasSelection,
  detailStatus,
  detailErrorMessage,
}: Props) {
  const panelState = getVerificationActionsPanelState({
    code,
    link,
    hasSelection,
    detailStatus,
    detailErrorMessage,
  });

  const openLink = useCallback(() => {
    if (!link || typeof window === "undefined") {
      return;
    }

    const opened = window.open(link.url, "_blank", "noopener,noreferrer");
    if (opened) {
      opened.opener = null;
    }
  }, [link]);

  return (
    <aside
      className="panel corner-ticks relative flex h-full flex-col overflow-hidden"
      aria-labelledby="verification-actions-title"
    >
      <div className="border-b border-hairline px-5 py-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-signal" aria-hidden />
          <div>
            <h2 id="verification-actions-title" className="text-lg font-semibold text-foreground">
              Verification actions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Actions update with the selected message.
            </p>
          </div>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {link ? "Verification link detected." : ""} {code ? "Verification code detected." : ""}
      </div>

      {panelState.kind === "actions" ? (
        <div className="grid flex-1 content-start gap-4 p-5">
          {panelState.link ? (
            <ActionCard>
              <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-signal/20 bg-signal/10 text-signal">
                  <Link2 className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    Verification link
                    <span className="size-2 rounded-full bg-signal" aria-hidden />
                  </div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {panelState.link.hostname}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openLink}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-signal/35 bg-signal/10 px-3 text-sm font-semibold text-foreground transition-colors hover:border-signal/70 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Open link
                  <ExternalLink className="size-4" aria-hidden />
                </button>
              </div>
            </ActionCard>
          ) : null}

          {panelState.code ? (
            <ActionCard>
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-signal/20 bg-signal/10 text-signal">
                  <KeyRound className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    One-time code
                    <span className="size-2 rounded-full bg-signal" aria-hidden />
                  </div>
                  <div className="mt-1 select-all break-all font-mono-tabular text-2xl text-signal">
                    {panelState.code}
                  </div>
                </div>
                <CopyButton
                  value={panelState.code}
                  label="Copy code"
                  successMessage="Verification code copied"
                />
              </div>
            </ActionCard>
          ) : null}

          <div className="mt-1 rounded-md border border-hairline bg-background/25 p-4 text-sm leading-relaxed text-muted-foreground">
            <Info className="mr-2 inline size-4" aria-hidden />
            Links open in a new tab. Codes are copied to your clipboard.
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-1">
          <EmptyState
            icon={<KeyRound className="size-4" />}
            title={panelState.title}
            description={panelState.description}
          />
        </div>
      )}
    </aside>
  );
}
