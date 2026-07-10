import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createMessageBodyRenderState, type MessageRenderModel } from "@/lib/messageRenderModel";
import { type PreparedMessageBlock } from "@/lib/safeMessageText";
import { ImageOff, TriangleAlert } from "lucide-react";

interface Props {
  model: MessageRenderModel;
}

function RenderTextBlock({ block }: { block: PreparedMessageBlock }) {
  if (block.kind === "metadata") {
    return (
      <div className="rounded-lg bg-background/38 px-3.5 py-3 font-mono-tabular text-[11px] leading-6 text-muted-foreground">
        {block.text}
      </div>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="space-y-2 pl-5 text-[0.99rem] leading-8 text-foreground/92">
        {block.items?.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`} className="list-disc marker:text-signal">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return <p className="text-[0.99rem] leading-8 text-foreground/92">{block.text}</p>;
}

export function MessageBodyRenderer({ model }: Props) {
  const [allowRemoteImages, setAllowRemoteImages] = useState(false);

  useEffect(() => {
    setAllowRemoteImages(false);
  }, [model.reference]);

  const renderState = useMemo(() => {
    try {
      return createMessageBodyRenderState(model, { allowRemoteImages });
    } catch {
      return {
        kind: "empty" as const,
        title: "Message preview is unavailable",
        description:
          "We could not safely render this message body. Refresh the inbox to try again.",
      };
    }
  }, [allowRemoteImages, model]);

  if (renderState.kind === "html") {
    return (
      <div className="space-y-4">
        {renderState.html.hasBlockedRemoteImages ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline/40 bg-background/32 px-3.5 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ImageOff className="size-4 text-signal" aria-hidden />
              Remote images are blocked by default for privacy.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-signal/30 bg-signal/8 text-foreground hover:border-signal/60 hover:text-signal"
              onClick={() => setAllowRemoteImages(true)}
            >
              Load images
            </Button>
          </div>
        ) : null}

        <div
          className="esp-email-content text-[0.99rem] leading-7 text-foreground/92"
          dangerouslySetInnerHTML={{ __html: renderState.html.html }}
        />
      </div>
    );
  }

  if (renderState.kind === "text") {
    return (
      <div className="space-y-4">
        {renderState.text.blocks.map((block, index) => (
          <RenderTextBlock key={`${model.reference}-${block.kind}-${index}`} block={block} />
        ))}
        {renderState.text.truncated ? (
          <p className="rounded-md bg-background/28 px-3.5 py-2 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Very large message truncated for safe preview
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline/40 bg-background/28 px-4 py-4 text-sm text-muted-foreground">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
        <div>
          <p className="font-medium text-foreground">{renderState.title}</p>
          <p className="mt-1 leading-relaxed">{renderState.description}</p>
        </div>
      </div>
    </div>
  );
}
