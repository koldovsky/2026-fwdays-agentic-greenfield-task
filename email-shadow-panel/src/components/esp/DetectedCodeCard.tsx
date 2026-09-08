import { CopyButton } from "./CopyButton";
import { EmptyState } from "./EmptyState";
import { getDetectedCodePanelState, type MessageDetailStatus } from "@/lib/detectedCodePanelState";
import { KeyRound, ShieldCheck } from "lucide-react";

interface Props {
  code: string | null;
  hasSelection: boolean;
  detailStatus: MessageDetailStatus;
  detailErrorMessage?: string | null;
}

export function DetectedCodeCard({ code, hasSelection, detailStatus, detailErrorMessage }: Props) {
  const panelState = getDetectedCodePanelState({
    code,
    hasSelection,
    detailStatus,
    detailErrorMessage,
  });

  return (
    <div className="panel corner-ticks relative flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" /> Detected code
        </div>
        {code ? (
          <span className="shrink-0 font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-signal">
            heuristic / high
          </span>
        ) : null}
      </div>

      {code ? (
        <div key={code} className="flex min-w-0 flex-1 flex-col justify-center p-5 fade-up">
          <div
            className="max-w-full select-all break-all py-3 text-center font-mono-tabular text-3xl tracking-[0.12em] text-signal sm:text-4xl lg:text-5xl"
            style={{
              textShadow: "0 0 24px color-mix(in oklab, var(--signal) 55%, transparent)",
            }}
          >
            {code.split("").map((character, index) => (
              <span key={`${character}-${index}`} className="inline-block px-0.5">
                {character}
              </span>
            ))}
          </div>
          <p className="mt-1 text-center font-mono-tabular text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Detected from inert message text
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <CopyButton value={code} label="Copy code" successMessage="Detected code copied" />
            <span className="inline-flex h-10 items-center rounded-md border border-hairline bg-background/35 px-3 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              C shortcut
            </span>
          </div>
          <p className="mt-4 text-center font-mono-tabular text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            heuristic only / never stored
          </p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-1">
          <EmptyState
            icon={<KeyRound className="size-4" />}
            title={panelState.kind === "empty" ? panelState.title : "Detected code"}
            description={panelState.kind === "empty" ? panelState.description : undefined}
          />
        </div>
      )}
    </div>
  );
}
