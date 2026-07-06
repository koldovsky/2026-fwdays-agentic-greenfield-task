"use client";

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
//
// This container is a scrollable region whenever its content overflows
// `maxHeightPx` — `tabIndex={0}` + `role="region"`/`aria-label` make it
// reachable and operable by keyboard (Tab, then arrow/Page keys to scroll),
// fixing axe's `scrollable-region-focusable` violation on the S3 populated
// dashboard (a mouse-only scrollable div is otherwise unreachable without a
// pointer).
//
// Vision-judge readability fix (S3 re-verify): a clipped last line at rest
// used to read as BROKEN, not scrollable — modern browsers' overlay
// scrollbars are invisible until hovered/dragged, so a boundary that lands
// mid-content looked like a rendering bug rather than "more below." Two
// always-on cues fix that without lifting the bound: (1) `.bounded-text-scroll`
// (globals.css) forces a persistent thin scrollbar in both engines instead
// of relying on the OS's hover-only overlay one; (2) whenever content
// actually overflows (detected via `scrollHeight`/`clientHeight`, real DOM
// measurement — never guessed from character count), a bottom fade + "ще ↓"
// cue renders OUTSIDE the scrollable div (a sibling overlay, never inside
// it, so it never pollutes `textContent`) and disappears once scrolled to
// the true end, so the ending always reads as "scrollable," never "cut off."

import { useEffect, useRef, useState } from "react";

export interface BoundedTextProps {
  text: string;
  maxHeightPx?: number;
  mono?: boolean;
  /** The CSS custom property (e.g. "--surface-hover") that THIS instance's
   *  actual visual parent paints as its background — the bottom fade blends
   *  into that exact color so it reads as a clean fade, not a mismatched
   *  seam. Defaults to "--surface", the page's own base surface. */
  fadeSurfaceVar?: string;
}

export const DEFAULT_BOUNDED_TEXT_MAX_HEIGHT_PX = 96;

export function BoundedText({
  text,
  maxHeightPx = DEFAULT_BOUNDED_TEXT_MAX_HEIGHT_PX,
  mono = false,
  fadeSurfaceVar = "--surface",
}: BoundedTextProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el === null) return;
    const updateOverflow = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      setHasMoreBelow(remaining > 1);
    };
    updateOverflow();
    el.addEventListener("scroll", updateOverflow);
    window.addEventListener("resize", updateOverflow);
    return () => {
      el.removeEventListener("scroll", updateOverflow);
      window.removeEventListener("resize", updateOverflow);
    };
    // Re-measure whenever the text/bound changes (a new field value can
    // flip a previously-fitting brief into an overflowing one, or vice
    // versa).
  }, [text, maxHeightPx]);

  return (
    <div className="relative w-full max-w-full min-w-0">
      <div
        ref={scrollRef}
        data-testid="bounded-text"
        role="region"
        aria-label="Текст, що прокручується"
        tabIndex={0}
        className={`bounded-text-scroll w-full max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words text-sm text-text ${mono ? "font-mono" : ""}`}
        style={{ maxHeight: `${maxHeightPx}px`, overflowY: "auto", overflowX: "hidden" }}
      >
        {text}
      </div>
      {hasMoreBelow ? (
        <div
          aria-hidden="true"
          data-testid="bounded-text-more-cue"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-7 items-end justify-center pb-0.5 text-[10px] font-medium text-text-muted"
          style={{ background: `linear-gradient(to top, var(${fadeSurfaceVar}) 25%, transparent 100%)` }}
        >
          ще ↓
        </div>
      ) : null}
    </div>
  );
}
