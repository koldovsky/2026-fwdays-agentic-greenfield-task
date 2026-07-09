import { useMemo } from "react";
import type { ReactNode } from "react";
import { ProviderSelector } from "./ProviderSelector";
import { GenerateButton } from "./GenerateButton";
import { RecentInboxesPanel } from "./RecentInboxesPanel";
import type { ProviderId, RecentInboxRecord } from "@/types/inbox";
import { ShieldCheck } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface Props {
  onGenerate: (providerId: ProviderId) => void | Promise<void>;
  onResume: (id: string) => void;
  isTransitioning: boolean;
  recentInboxes: RecentInboxRecord[];
  selectedInboxId: string | null;
  notice?: ReactNode;
}

export function GenerateScreen({
  onGenerate,
  onResume,
  isTransitioning,
  recentInboxes,
  selectedInboxId,
  notice,
}: Props) {
  const provider: ProviderId = "emailnator";

  const shortcuts = useMemo(
    () => ({
      g: () => !isTransitioning && onGenerate(provider),
      n: () => !isTransitioning && onGenerate(provider),
    }),
    [isTransitioning, onGenerate],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <section
      className={`mx-auto max-w-[1500px] px-5 pb-12 pt-6 sm:px-8 ${isTransitioning ? "warp-out" : "fade-up"}`}
    >
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1fr)]">
        <section
          className="panel corner-ticks relative overflow-hidden"
          aria-labelledby="create-inbox-title"
        >
          <div className="grid h-full content-start gap-6 p-5 sm:p-7 lg:p-9">
            <div>
              <div className="font-mono-tabular text-[12px] uppercase tracking-[0.24em] text-signal">
                &gt; Create inbox
              </div>
              <h1
                id="create-inbox-title"
                className="mt-6 text-4xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-5xl"
              >
                Open a temporary
                <br />
                <span className="text-signal">mailbox channel.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Generate a disposable address, receive signup emails, and complete verification
                using links or one-time codes.
              </p>
            </div>

            {notice ? <div>{notice}</div> : null}

            <ProviderSelector value={provider} onChange={() => undefined} />

            <GenerateButton onClick={() => onGenerate(provider)} loading={isTransitioning} />

            <div className="mt-auto rounded-md border border-hairline bg-background/30 p-4">
              <div className="flex items-start gap-4 text-sm leading-relaxed text-muted-foreground">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-signal/25 bg-signal/10 text-signal">
                  <ShieldCheck className="size-5" aria-hidden />
                </span>
                <p>
                  <span className="text-foreground">Your privacy is protected.</span> Recent inbox
                  access stays in this browser. Provider cookies, message bodies, and verification
                  data are never stored locally.
                </p>
              </div>
            </div>
          </div>
        </section>

        <RecentInboxesPanel
          items={recentInboxes}
          selectedInboxId={selectedInboxId}
          onOpen={onResume}
        />
      </div>
    </section>
  );
}
