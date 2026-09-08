import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { GenerateButton } from "./GenerateButton";
import { ProviderSelector } from "./ProviderSelector";
import { RecentInboxesPanel } from "./RecentInboxesPanel";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { getGenerateShortcutSections } from "@/lib/shortcutsCatalog";
import type { ProviderId, RecentInboxRecord } from "@/types/inbox";

interface Props {
  onGenerate: (providerId: ProviderId) => void | Promise<void>;
  onResume: (id: string) => void;
  onForgetRecent: (id: string) => void;
  isTransitioning: boolean;
  recentInboxes: RecentInboxRecord[];
  selectedInboxId: string | null;
  notice?: ReactNode;
}

export function GenerateScreen({
  onGenerate,
  onResume,
  onForgetRecent,
  isTransitioning,
  recentInboxes,
  selectedInboxId,
  notice,
}: Props) {
  const provider: ProviderId = "emailnator";
  const [helpOpen, setHelpOpen] = useState(false);

  const shortcuts = useMemo(
    () => ({
      g: () => !isTransitioning && onGenerate(provider),
      n: () => !isTransitioning && onGenerate(provider),
      "?": () => setHelpOpen(true),
    }),
    [isTransitioning, onGenerate],
  );
  useKeyboardShortcuts(shortcuts, !helpOpen);

  const shortcutSections = useMemo(() => getGenerateShortcutSections(), []);

  return (
    <section
      className={`mx-auto flex h-full min-h-0 w-full max-w-[1760px] flex-col overflow-y-auto px-4 pb-2.5 pt-2 sm:px-7 sm:pb-3 sm:pt-2.5 xl:overflow-hidden ${isTransitioning ? "warp-out" : "fade-up"}`}
    >
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.9fr)] xl:items-stretch">
        <section
          className="panel corner-ticks relative min-h-0 overflow-hidden"
          aria-labelledby="create-inbox-title"
        >
          <div className="grid h-full min-h-0 content-start gap-3 overflow-y-auto px-4 pb-3.5 pt-4 sm:px-5 sm:pb-4 sm:pt-4 xl:px-5 xl:pb-4 xl:pt-4">
            <div className="pt-0.5">
              <div className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-signal sm:text-[12px]">
                &gt; Create inbox
              </div>
              <h1
                id="create-inbox-title"
                className="mt-2 max-w-[16ch] text-[2.35rem] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-[2.75rem] xl:text-[3.05rem]"
              >
                Open a temporary
                <br />
                <span className="text-signal">mailbox channel.</span>
              </h1>
              <p className="mt-2 max-w-2xl text-[0.98rem] leading-[1.42] text-muted-foreground sm:text-[1.03rem]">
                Generate a disposable address, receive signup emails, and complete verification
                using links or one-time codes.
              </p>
            </div>

            {notice ? <div>{notice}</div> : null}

            <ProviderSelector value={provider} onChange={() => undefined} />

            <GenerateButton onClick={() => onGenerate(provider)} loading={isTransitioning} />

            <div className="flex justify-end">
              <ShortcutsHelp
                open={helpOpen}
                onOpenChange={setHelpOpen}
                sections={shortcutSections}
              />
            </div>
          </div>
        </section>

        <RecentInboxesPanel
          items={recentInboxes}
          selectedInboxId={selectedInboxId}
          onOpen={onResume}
          onForget={onForgetRecent}
        />
      </div>
    </section>
  );
}
