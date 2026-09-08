import { useCallback, type ReactNode } from "react";
import { CopyButton } from "./CopyButton";
import { EmptyState } from "./EmptyState";
import {
  getVerificationActionsPanelState,
  type MessageDetailStatus,
  type VerificationLink,
} from "@/lib/verificationActions";
import { ExternalLink, Info, KeyRound, Link2, ShieldCheck } from "lucide-react";

interface Props {
  code: string | null;
  link: VerificationLink | null;
  hasSelection: boolean;
  detailStatus: MessageDetailStatus;
  detailErrorMessage?: string | null;
}

function ActionCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline/55 bg-background/24 p-4 sm:p-5">
      {children}
    </div>
  );
}

function openExternal(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
  }
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
    if (!link) {
      return;
    }

    openExternal(link.url);
  }, [link]);

  return (
    <aside
      className="panel corner-ticks relative flex h-full flex-col overflow-hidden"
      aria-labelledby="verification-actions-title"
    >
      <div className="border-b border-hairline/45 px-5 py-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-signal" aria-hidden />
          <div>
            <h2
              id="verification-actions-title"
              className="text-[1.08rem] font-semibold text-foreground"
            >
              Verification actions
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Actions update with the selected message.
            </p>
          </div>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {link ? "Verification link detected." : ""} {code ? "Verification code detected." : ""}
      </div>

      {panelState.kind === "actions" ? (
        <div className="esp-scrollbar grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4 sm:p-5">
          {panelState.link ? (
            <ActionCard>
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-signal/18 bg-signal/10 text-signal">
                  <Link2 className="size-6" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3.5">
                  <div className="min-w-[11rem] flex-1">
                    <div className="text-[1rem] font-semibold leading-tight text-foreground">
                      Verification link
                    </div>
                    <div
                      className="mt-1 truncate text-sm text-muted-foreground"
                      title={panelState.link.hostname}
                    >
                      {panelState.link.hostname}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton
                      value={panelState.link.url}
                      label="Copy link"
                      successMessage="Verification link copied"
                    />
                    <button
                      type="button"
                      onClick={openLink}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-signal/35 bg-signal/10 px-3 text-sm font-semibold text-foreground transition-colors hover:border-signal/70 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Open link
                      <ExternalLink className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </ActionCard>
          ) : null}

          {panelState.code ? (
            <ActionCard>
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-signal/18 bg-signal/10 text-signal">
                  <KeyRound className="size-6" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3.5">
                  <div className="min-w-[11rem] flex-1">
                    <div className="text-[1rem] font-semibold leading-tight text-foreground">
                      One-time code
                    </div>
                    <div className="mt-2 font-mono-tabular text-[clamp(2rem,0.9vw+1.7rem,2.75rem)] leading-none tracking-[0.08em] text-signal">
                      {panelState.code}
                    </div>
                  </div>
                  <CopyButton
                    value={panelState.code}
                    label="Copy code"
                    successMessage="Verification code copied"
                  />
                </div>
              </div>
            </ActionCard>
          ) : null}

          <div className="mt-1 rounded-xl bg-background/22 p-4 text-sm leading-relaxed text-muted-foreground">
            <Info className="mr-2 inline size-4 text-signal" aria-hidden />
            Links open in a new tab with safe rel attributes. Codes and URLs are copied to your
            clipboard.
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-3 py-6">
          <EmptyState
            icon={<KeyRound className="size-4" />}
            title={panelState.title}
            description={panelState.description}
            className="py-10"
          />
        </div>
      )}
    </aside>
  );
}
