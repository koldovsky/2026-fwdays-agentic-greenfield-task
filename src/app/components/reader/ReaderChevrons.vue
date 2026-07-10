<script setup lang="ts">
// The large edge prev/next chevrons hugging the spread (doc/web/03). Round, low-contrast controls that
// page the navigator; the view turns the page on click. Decorative `chevron-right` glyph, rotated for
// the previous control. Keyboard ←/→ are handled by the view (these are the pointer affordance).
//
// Floats directly over the reader "mat", so it uses the `--color-reader-chrome-*` tokens (main.css),
// not the app-wide `--color-surface`/`-muted`/`-ink` — otherwise it would stay bright over a dark mat
// (impeccable cycle 1: Theming polish).
import { AppIcon } from '@/app/components'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ prev: []; next: [] }>()
</script>

<template>
  <div class="reader-chrome pointer-events-none absolute inset-y-0 left-0 right-0">
    <button
      type="button"
      aria-label="Previous page"
      :disabled="disabled"
      class="pointer-events-auto absolute top-1/2 left-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-pill bg-[var(--color-reader-chrome-surface)]/70 text-[var(--color-reader-chrome-muted)] shadow-card transition-colors hover:bg-[var(--color-reader-chrome-surface)] hover:text-[var(--color-reader-chrome-ink)] disabled:opacity-40 md:left-4"
      @click="emit('prev')"
    >
      <span class="rotate-180">
        <AppIcon name="chevron-right" :size="22" />
      </span>
    </button>
    <button
      type="button"
      aria-label="Next page"
      :disabled="disabled"
      class="pointer-events-auto absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-pill bg-[var(--color-reader-chrome-surface)]/70 text-[var(--color-reader-chrome-muted)] shadow-card transition-colors hover:bg-[var(--color-reader-chrome-surface)] hover:text-[var(--color-reader-chrome-ink)] disabled:opacity-40 md:right-4"
      @click="emit('next')"
    >
      <AppIcon name="chevron-right" :size="22" />
    </button>
  </div>
</template>
