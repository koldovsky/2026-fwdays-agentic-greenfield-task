import { CopyButton } from "./CopyButton";
import { EmptyState } from "./EmptyState";
import { KeyRound, ShieldCheck } from "lucide-react";

interface Props {
  code: string | null;
  hasSelection: boolean;
}

export function DetectedCodeCard({ code, hasSelection }: Props) {
  return (
    <div className="panel corner-ticks relative flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Detected code
        </div>
        {code && (
          <span className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-signal">
            match / high
          </span>
        )}
      </div>

      {code ? (
        <div key={code} className="flex flex-1 flex-col justify-center p-5 fade-up">
          <div
            className="select-all py-3 text-center font-mono-tabular text-4xl tracking-[0.18em] text-signal sm:text-5xl"
            style={{
              textShadow: "0 0 24px color-mix(in oklab, var(--signal) 55%, transparent)",
            }}
          >
            {code.split("").map((c, i) => (
              <span key={`${c}-${i}`} className="inline-block px-0.5">
                {c}
              </span>
            ))}
          </div>
          <p className="mt-1 text-center font-mono-tabular text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Detected from selected message
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <CopyButton value={code} label="Copy code" successMessage="Detected code copied" />
            <span className="inline-flex h-10 items-center rounded-md border border-hairline bg-background/35 px-3 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              C shortcut
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<KeyRound className="size-4" />}
            title={hasSelection ? "No code found" : "Awaiting selection"}
            description={
              hasSelection
                ? "This message doesn't look like it contains a verification code."
                : "Select an OTP or verification email to extract a code."
            }
          />
        </div>
      )}
    </div>
  );
}
