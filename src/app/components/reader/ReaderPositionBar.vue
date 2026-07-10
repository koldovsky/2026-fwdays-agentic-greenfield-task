<script setup lang="ts">
// The bottom reading-position bar (doc/web/03): a chapter label, a draggable scrubber reflecting total
// progression, and a "p. 1–2 / 432 · 6 min left in chapter" read-out. The scrubber is a native range
// input (keyboard-accessible, draggable) — dragging it seeks the publication. Page/total come from the
// navigator; the time-left is a reader-side estimate (design Open Question) — a precise per-chapter
// source can replace MINUTES_PER_PAGE later without changing this surface.
//
// Colours are the `--color-reader-chrome-*` tokens (main.css) so this footer tracks the active reading
// theme, same as the top bar — see ReaderTopBar.vue's header comment (impeccable cycle 1: Theming polish).
import { computed } from 'vue'

const props = defineProps<{
  chapterLabel: string
  /** Current page (1-based), or undefined before the first relocate. */
  page?: number
  /** Total pages in the current layout. */
  pageCount?: number
  /** Total progression across the publication (0..1) — the scrubber value. */
  totalProgression: number
  /** True when two pages are visible (desktop spread) → the read-out shows a page range. */
  spread?: boolean
}>()

const emit = defineEmits<{ seek: [fraction: number] }>()

// Reader-side reading-time estimate: ~1.1 min per page of remaining reading (design Open Question).
const MINUTES_PER_PAGE = 1.1

const readout = computed(() => {
  const { page, pageCount, spread } = props
  if (page === undefined || pageCount === undefined || pageCount <= 0) return ''
  const right = spread && page < pageCount ? page + 1 : undefined
  const range = right ? `${page}–${right}` : `${page}`
  const minutesLeft = Math.max(1, Math.round((pageCount - page) * MINUTES_PER_PAGE))
  return `p. ${range} / ${pageCount} · ${minutesLeft} min left in chapter`
})

function onInput(event: Event): void {
  const value = Number.parseFloat((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value)) emit('seek', value)
}
</script>

<template>
  <footer
    class="reader-chrome flex items-center gap-4 border-t border-[var(--color-reader-chrome-line)] bg-[var(--color-reader-chrome-bg)] px-5 py-3"
  >
    <span
      class="shrink-0 text-sm text-[var(--color-reader-chrome-muted)]"
      data-testid="reader-chapter"
      >{{ chapterLabel }}</span
    >

    <input
      class="reader-scrubber min-w-0 flex-1"
      type="range"
      min="0"
      max="1"
      step="0.001"
      :value="totalProgression"
      aria-label="Reading position"
      :aria-valuetext="readout || undefined"
      @input="onInput"
    />

    <span
      v-if="readout"
      class="shrink-0 font-mono text-xs whitespace-nowrap text-[var(--color-reader-chrome-muted)]"
      data-testid="reader-readout"
      >{{ readout }}</span
    >
  </footer>
</template>

<style scoped>
/* A thin parchment track with a small forest handle — app chrome, matching doc/web/03. Reader-chrome
   tokens (not the app-wide --color-sunken/-primary/-surface) so the track/thumb track the reading theme. */
.reader-scrubber {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--color-reader-chrome-sunken);
  cursor: pointer;
}

/*
 * Coarse-pointer (touch) drag target: a native <input type=range> is draggable across its whole
 * rendered box, not just the visible thumb, so growing the box's HEIGHT genuinely grows the tap/drag
 * target (impeccable cycle 2 — the audit's "position slider thumb" sweep item). The visible track stays
 * the same 4px band: `background` is a solid-color gradient painted at a fixed `4px` size, centered, so
 * only the middle of the taller box is ever colored — the thumb (unchanged 14x14 below) still renders
 * centered in the box. `@media (pointer: coarse)` never matches in the Playwright gates (every project
 * uses `devices['Desktop Chrome']`, `hasTouch: false`), so this never moves a desktop/golden pixel; on a
 * real phone the footer legitimately gains some vertical room around the bar for a workable thumb.
 *
 * KNOWN PRE-EXISTING LIMIT (not introduced or fixed by this rule): at narrow phone widths with a long
 * chapter title, the footer's two `shrink-0` labels (chapter name + the "p. N / total · M min left"
 * readout) can alone exceed the viewport, leaving zero free space for this `flex-1` element — its
 * rendered width (and therefore this whole hit-area fix) collapses to 0 regardless of pointer type.
 * Confirmed present identically before this change (measured live: the same collapse happens under
 * `pointer: fine`, where this media query is inert). That is the audit's separate P3 "reader footer
 * off-ramp" finding, owned by `/impeccable polish src/app/components/reader` — a footer-content/wrap
 * problem, not a touch-target-sizing one — so it is out of scope here and left for that pass.
 */
@media (pointer: coarse) {
  .reader-scrubber {
    height: 44px;
    background: linear-gradient(
        var(--color-reader-chrome-sunken),
        var(--color-reader-chrome-sunken)
      )
      no-repeat center / 100% 4px;
  }
}
.reader-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 14px;
  width: 14px;
  border-radius: var(--radius-pill);
  background: var(--color-reader-chrome-primary);
  border: 2px solid var(--color-reader-chrome-surface);
}
.reader-scrubber::-moz-range-thumb {
  height: 14px;
  width: 14px;
  border-radius: var(--radius-pill);
  background: var(--color-reader-chrome-primary);
  border: 2px solid var(--color-reader-chrome-surface);
}
.reader-scrubber:focus-visible {
  outline: 2px solid var(--color-reader-chrome-primary);
  outline-offset: 3px;
}
</style>
