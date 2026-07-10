import { AlertTriangle, ArrowLeft, Check, Loader2, Mail, Radio, RotateCcw } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  getTransitionFooterState,
  getTransitionProgressState,
  getTransitionProviderLabel,
  getTransitionStatusText,
  type TransitionStepStatus,
} from "@/lib/transitionOverlayState";
import { cn } from "@/lib/utils";
import type { ProviderId } from "@/types/inbox";

interface Props {
  visible: boolean;
  providerId?: ProviderId;
  address?: string | null;
  mailboxConnected?: boolean;
  ready?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

function StepIcon({
  status,
  reducedMotion,
}: {
  status: TransitionStepStatus;
  reducedMotion: boolean;
}) {
  if (status === "complete") {
    return <Check className="size-4" strokeWidth={3} aria-hidden />;
  }

  if (status === "error") {
    return <AlertTriangle className="size-4" aria-hidden />;
  }

  if (status === "active") {
    return reducedMotion ? (
      <Radio className="size-4" aria-hidden />
    ) : (
      <Loader2 className="size-4 animate-spin" aria-hidden />
    );
  }

  return <span className="size-2 rounded-full bg-muted-foreground/45" aria-hidden />;
}

export function TransitionOverlay({
  visible,
  providerId = "emailnator",
  address,
  mailboxConnected = false,
  ready = false,
  errorMessage,
  onRetry,
  onBack,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const hasAddress = Boolean(address);
  const failed = Boolean(errorMessage);
  const providerLabel = getTransitionProviderLabel(providerId);
  const progress = getTransitionProgressState({
    hasAddress,
    mailboxConnected,
    ready,
    failed,
  });
  const statusText = getTransitionStatusText({
    providerId,
    hasAddress,
    mailboxConnected,
    ready,
    failed,
  });
  const footer = getTransitionFooterState({ failed, ready });

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-0 z-40 grid place-items-center px-4 py-4 transition-opacity duration-200 sm:px-6 sm:py-6",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="absolute inset-0 bg-background/82 backdrop-blur-sm" />
      <div aria-hidden className="absolute inset-0 grid-lines opacity-25" />
      <div
        aria-hidden
        className="absolute inset-x-8 top-24 hidden max-w-[1760px] grid-cols-[clamp(280px,25vw,420px)_minmax(0,1fr)] gap-4 opacity-20 xl:grid"
      >
        <div className="panel h-[460px]" />
        <div className="panel h-[460px]" />
      </div>

      <section
        aria-labelledby="handoff-title"
        className="panel corner-ticks relative flex max-h-[calc(100dvh-1.5rem)] w-[min(660px,94vw)] flex-col overflow-hidden border-signal/35 p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--signal)_16%,transparent),0_26px_80px_-52px_var(--signal)] sm:p-5"
      >
        <div role="status" aria-live="polite" className="sr-only">
          {statusText}
        </div>

        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] text-signal/80">
          &gt; Shadow handoff
        </div>
        <h2
          id="handoff-title"
          className="mt-2 text-[2rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2.35rem]"
        >
          Opening inbox
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {failed
            ? "The mailbox could not be prepared. You can retry generation or return to the control panel."
            : "Generating your address and preparing the mailbox view."}
        </p>

        <div className="mt-3 rounded-xl border border-hairline bg-background/35 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-signal/25 bg-signal/10 text-signal">
              <Mail className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="truncate font-mono-tabular text-[1.08rem] font-semibold text-foreground sm:text-[1.28rem]">
                {address ?? "Preparing temporary address"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-signal" aria-hidden />
                Temporary address <span aria-hidden>/</span>{" "}
                {hasAddress ? "Created just now" : providerLabel}
              </div>
            </div>
          </div>
        </div>

        <ol className="mt-3 grid gap-3">
          {progress.steps.map((step, index) => (
            <li key={step.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
              <div className="relative flex justify-center">
                {index < progress.steps.length - 1 ? (
                  <span aria-hidden className="absolute bottom-[-18px] top-7 w-px bg-signal/24" />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 grid size-7 place-items-center rounded-full border",
                    step.status === "complete" && "border-signal bg-signal text-primary-foreground",
                    step.status === "active" && "border-signal bg-signal/10 text-signal",
                    step.status === "pending" &&
                      "border-hairline bg-background text-muted-foreground",
                    step.status === "error" &&
                      "border-destructive bg-destructive/15 text-destructive",
                    step.status === "active" &&
                      !reducedMotion &&
                      "shadow-[0_0_16px_-8px_var(--signal)]",
                  )}
                >
                  <StepIcon status={step.status} reducedMotion={reducedMotion} />
                </span>
              </div>
              <div className="pt-0.5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono-tabular text-[10px] font-semibold text-signal sm:text-xs">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.95rem] font-semibold text-foreground sm:text-base">
                    {step.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground sm:text-[13px]">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {failed ? (
          <div className="mt-3 rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm leading-relaxed text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full border border-signal/20 bg-signal/10">
            <div
              className="h-full rounded-full bg-signal transition-[width] duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono-tabular text-xs text-signal">
            {progress.progressPercent}%
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-hairline pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <span className="inline-flex items-center gap-2 font-semibold text-signal">
              <Radio
                className={cn("size-4", !reducedMotion && !failed && "animate-pulse")}
                aria-hidden
              />
              {footer.label}
            </span>
            <span aria-hidden className="hidden h-4 w-px bg-hairline sm:inline-block" />
            <span>{footer.description}</span>
          </div>
          {failed ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline bg-background/35 px-3 text-xs text-foreground transition-colors hover:border-signal/40 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70"
              >
                <ArrowLeft className="size-4" aria-hidden /> Back
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-signal/45 bg-signal/10 px-3 text-xs font-semibold text-foreground transition-colors hover:border-signal/70 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70"
              >
                <RotateCcw className="size-4" aria-hidden /> Retry
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
