import { useCallback } from "react";
import { CopyButton } from "./CopyButton";
import type { MessageRenderModel } from "@/lib/messageRenderModel";
import { ExternalLink, KeyRound, Link2 } from "lucide-react";

interface Props {
  model: MessageRenderModel;
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

export function VerificationActionBar({ model }: Props) {
  const openPrimaryLink = useCallback((url: string) => {
    openExternal(url);
  }, []);
  const visibleLinks = model.extractedLinks.slice(0, 3);
  const hiddenLinkCount = Math.max(0, model.extractedLinks.length - visibleLinks.length);

  if (!model.verificationCode && model.extractedLinks.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 grid gap-2 rounded-md border border-hairline/35 bg-background/18 px-3 py-2.5">
      {model.verificationCode ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-signal">
            <KeyRound className="size-4" aria-hidden /> Code detected
          </span>
          <span className="text-muted-foreground" aria-hidden>
            &middot;
          </span>
          <span className="whitespace-nowrap font-mono-tabular text-base tracking-[0.08em] text-foreground">
            {model.verificationCode}
          </span>
          <CopyButton
            value={model.verificationCode}
            label="Copy code"
            successMessage="Verification code copied"
            size="sm"
            className="ml-auto"
          />
        </div>
      ) : null}

      {visibleLinks.map((link) => (
        <div key={link.url} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-signal">
            <Link2 className="size-4" aria-hidden /> Link detected
          </span>
          <span className="text-muted-foreground" aria-hidden>
            &middot;
          </span>
          <span className="min-w-0 max-w-full truncate text-foreground sm:max-w-[24rem]">
            {link.hostname}
          </span>
          <div className="ml-auto flex shrink-0 flex-wrap gap-2">
            <CopyButton
              value={link.url}
              label="Copy link"
              successMessage="Verification link copied"
              size="sm"
            />
            <button
              type="button"
              onClick={() => openPrimaryLink(link.url)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-signal/35 bg-signal/8 px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:border-signal/70 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
            >
              Open
              <ExternalLink className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ))}

      {hiddenLinkCount > 0 ? (
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          +{hiddenLinkCount} more link{hiddenLinkCount === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}
