// apps/dashboard/components/ds — BoundedText (dashboard tasks.md §6.5,
// baseline spec's "Oversized and atypical field content" requirement).
// Shared by `RequestCard`/`LessonBrief`/the pending queue's brief preview:
// a fixed-height, scrollable, word-breaking container so a lead's
// multi-thousand-character answer NEVER grows its own card's bounding box
// and NEVER causes the page to gain a horizontal scrollbar — the full text
// stays reachable by scrolling this one container.
//
// `maxHeightPx` is a literal inline style (not just a Tailwind class) on
// purpose: it gives `RequestCard.test.tsx`'s oversized-content test a
// concrete, content-independent value to assert against (the container's
// own `style.maxHeight` is identical whether the text is 10 characters or
// 10,000).

export interface BoundedTextProps {
  text: string;
  maxHeightPx?: number;
  mono?: boolean;
}

export const DEFAULT_BOUNDED_TEXT_MAX_HEIGHT_PX = 96;

export function BoundedText({ text, maxHeightPx = DEFAULT_BOUNDED_TEXT_MAX_HEIGHT_PX, mono = false }: BoundedTextProps) {
  return (
    <div
      data-testid="bounded-text"
      className={`w-full max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words text-sm text-text ${mono ? "font-mono" : ""}`}
      style={{ maxHeight: `${maxHeightPx}px`, overflowY: "auto", overflowX: "hidden" }}
    >
      {text}
    </div>
  );
}
