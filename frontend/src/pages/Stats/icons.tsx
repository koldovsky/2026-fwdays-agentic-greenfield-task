// Inline SVG icons for the Stats screen (stroke 1.5, currentColor). NFR-DES-01:
// icons are SVG, never emoji. New Stats-owned file — the Timer icon set is not
// imported (cross-slice boundary). The delta arrows carry a `data-direction`
// attribute so the ScoreCard's up/down indicator is a testable, color-independent
// signal (DESIGN §11: deltas are never color-only).

export function IconArrowUp() {
  return (
    <svg
      data-direction="up"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 19V5M6 11l6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconArrowDown() {
  return (
    <svg
      data-direction="down"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M6 13l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconUndo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
