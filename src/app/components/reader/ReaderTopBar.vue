<script setup lang="ts">
// The Reader top bar (doc/web/03): a "← Library" back control at the left, the publication title in
// the serif display face with the author in small-caps beneath it centered, and a right-hand control
// cluster — table-of-contents, bookmark, and the "Aa" preferences trigger. TOC/bookmark/Aa are chrome
// hooks: the view wires them to chapter navigation, current-locator bookmarking, and the
// reading-preferences panel (owned by change 8) respectively — none reach into the renderer.
//
// Colours here are the `--color-reader-chrome-*` tokens (main.css), NOT the app-wide `--color-canvas`/
// `-ink`/`-muted`/`-line`/`-sunken` ones — this bar is part of the reader's own chrome, which tracks the
// active reading theme (light/sepia/dark/parchment) via the ancestor `[data-reader-theme]` attribute
// ReaderView.vue sets. `.reader-chrome` also picks up the theme-aware focus ring (main.css). Chrome
// tokens only — book typography stays readium-css, untouched here (impeccable cycle 1: Theming polish).
import { AppIcon } from '@/app/components'

defineProps<{
  title: string
  author?: string
  tocOpen?: boolean
  bookmarked?: boolean
  preferencesActive?: boolean
}>()

const emit = defineEmits<{
  back: []
  'toggle-toc': []
  'toggle-bookmark': []
  'open-preferences': []
}>()
</script>

<template>
  <header
    class="reader-chrome grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--color-reader-chrome-line)] bg-[var(--color-reader-chrome-bg)] px-4 py-2.5"
  >
    <div class="flex min-w-0 items-center">
      <button
        type="button"
        class="tap-target inline-flex shrink-0 items-center gap-2 rounded-control px-2 py-1.5 text-[var(--color-reader-chrome-ink)] hover:bg-[var(--color-reader-chrome-sunken)]"
        @click="emit('back')"
      >
        <AppIcon name="arrow-left" :size="18" />
        <span class="text-sm font-medium">Library</span>
      </button>
    </div>

    <div class="min-w-0 text-center">
      <h1
        class="truncate font-display text-lg leading-tight text-[var(--color-reader-chrome-ink)]"
        data-testid="reader-title"
      >
        {{ title }}
      </h1>
      <p
        v-if="author"
        class="truncate font-mono text-[0.6875rem] tracking-[0.18em] text-[var(--color-reader-chrome-muted)] uppercase"
      >
        {{ author }}
      </p>
    </div>

    <div class="flex items-center justify-end gap-1">
      <button
        type="button"
        aria-label="Table of contents"
        :aria-pressed="tocOpen"
        class="tap-target inline-flex items-center justify-center rounded-control p-2 hover:bg-[var(--color-reader-chrome-sunken)]"
        :class="
          tocOpen
            ? 'bg-[var(--color-reader-chrome-sunken)] text-[var(--color-reader-chrome-ink)]'
            : 'text-[var(--color-reader-chrome-muted)] hover:text-[var(--color-reader-chrome-ink)]'
        "
        @click="emit('toggle-toc')"
      >
        <AppIcon name="list" :size="18" />
      </button>
      <button
        type="button"
        aria-label="Bookmark this position"
        :aria-pressed="bookmarked"
        class="tap-target inline-flex items-center justify-center rounded-control p-2 hover:bg-[var(--color-reader-chrome-sunken)]"
        :class="
          bookmarked
            ? 'bg-[var(--color-reader-chrome-sunken)] text-[var(--color-reader-chrome-primary)]'
            : 'text-[var(--color-reader-chrome-muted)] hover:text-[var(--color-reader-chrome-ink)]'
        "
        @click="emit('toggle-bookmark')"
      >
        <AppIcon name="bookmark" :size="18" />
      </button>
      <button
        type="button"
        aria-label="Reading preferences"
        :aria-pressed="preferencesActive"
        class="tap-target inline-flex items-center justify-center rounded-control px-3 py-1.5 font-display text-base leading-none"
        :class="
          preferencesActive
            ? 'bg-[var(--color-reader-chrome-sunken)] text-[var(--color-reader-chrome-ink)]'
            : 'text-[var(--color-reader-chrome-muted)] hover:bg-[var(--color-reader-chrome-sunken)] hover:text-[var(--color-reader-chrome-ink)]'
        "
        @click="emit('open-preferences')"
      >
        Aa
      </button>
    </div>
  </header>
</template>
