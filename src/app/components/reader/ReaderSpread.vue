<script setup lang="ts">
// The two-page parchment spread frame (doc/web/03). A warm aged-paper "sheet" centered on the
// parchment canvas, split by a center gutter into two facing pages, with decorative running heads
// (book title · chapter) and per-page folios. The foliate Navigator mounts into the default slot (a
// raw <div> the VIEW owns and hands to useNavigator) and paginates into the sheet's column area;
// foliate owns that subtree, so Vue renders no children there. The running heads/folios reflect real
// data (title, current chapter, page numbers) — exact strings differ from the maket's mock prose, the
// layout matches. App chrome only (Tailwind); the book's typography is readium-css.
//
// The canvas + "sheet" gradient use `--color-reader-chrome-*` (main.css), NOT `--color-canvas`/`-line`
// directly — this is the "mat" the audit flagged as staying bright parchment under a Dark reading theme;
// it now tracks the active theme via the ancestor `[data-reader-theme]` attribute (impeccable cycle 1).
defineProps<{
  bookTitle: string
  chapterLabel?: string
  leftFolio?: number
  rightFolio?: number
}>()
</script>

<template>
  <div
    class="reader-chrome relative flex flex-1 items-stretch justify-center overflow-hidden bg-[var(--color-reader-chrome-bg)] px-6 py-6"
  >
    <div class="reader-sheet relative w-full max-w-5xl rounded-card">
      <!-- Running heads: book title over the left page, current chapter over the right page. -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-2 gap-12 px-10 pt-6 font-mono text-[0.625rem] tracking-[0.18em] text-[var(--color-reader-chrome-muted)]/80 uppercase"
      >
        <span class="truncate">{{ bookTitle }}</span>
        <span class="truncate text-right">{{ chapterLabel }}</span>
      </div>

      <!-- The center gutter dividing the two facing pages. -->
      <div
        class="pointer-events-none absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-[var(--color-reader-chrome-line)]/70"
      />

      <!-- foliate's <foliate-view> mounts into the slotted raw element and fills this column area. -->
      <div class="h-full px-10 pt-12 pb-12">
        <slot />
      </div>

      <!-- Per-page folios (page numbers). -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-2 gap-12 px-10 pb-5 font-mono text-xs text-[var(--color-reader-chrome-muted)]/80"
      >
        <span class="text-center">{{ leftFolio }}</span>
        <span class="text-center">{{ rightFolio }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Aged-paper sheet — a warm surface lifted off the surrounding chrome (doc/web/03). The 3 gradient
   stops are reader-chrome tokens (main.css) so the "mat" itself tracks the active reading theme, not
   just its surround — the audit's finding was that ~3/4 of the reader stayed bright in Dark mode. */
.reader-sheet {
  background: radial-gradient(
    120% 80% at 50% 0%,
    var(--color-reader-chrome-mat-1) 0%,
    var(--color-reader-chrome-mat-2) 55%,
    var(--color-reader-chrome-mat-3) 100%
  );
  box-shadow:
    0 1px 2px rgb(44 42 37 / 0.06),
    0 12px 30px rgb(44 42 37 / 0.12);
}
</style>
