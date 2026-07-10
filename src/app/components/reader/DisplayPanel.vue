<script setup lang="ts">
// The Display preferences panel (doc/mobile/04-reading-themes-and-preferences.png) — a bottom sheet with
// THEME (4 "Aa" swatches), TYPEFACE (3 "Ag" swatches), TEXT SIZE (a point-labelled slider), LAYOUT
// (Paged/Scroll), and SPACING (3 densities). It is APP CHROME: built entirely from Tailwind design-system
// tokens, it NEVER touches readium-css. Every control is two-way bound to the reading-preferences store
// (read state to reflect the active selection, write via the store's validating setters); the BOOK is
// restyled only through the store -> navigator path (ReaderView's watch -> applyPreferences). The swatch
// colours here are a chrome PREVIEW that mirrors the book themes — both this panel and the authoritative
// reader-frame mapping (reader-css.ts) import the SAME `READING_THEME_COLORS` table (@/core/model), so
// the preview can never disagree with what the reader actually paints.
import { onMounted, onUnmounted } from 'vue'
import { AppIcon, SegmentedControl, type SegmentOption } from '@/app/components'
import { READING_THEME_COLORS } from '@/core/model/reading-theme-colors'
import {
  useReaderPreferencesStore,
  MIN_TEXT_SIZE_PT,
  MAX_TEXT_SIZE_PT,
  type ReadingTheme,
  type ReadingTypeface,
  type ReadingLayout,
  type ReadingSpacing,
} from '@/app/stores/readerPreferencesStore'

const emit = defineEmits<{ close: [] }>()

const store = useReaderPreferencesStore()

// Swatch colours are NOT redeclared here — they come from the same table `reader-css.ts` uses to paint
// the actual book, so the preview can never drift from what the reader renders (DESIGN.md "Don't define
// a reading-theme color in more than one place").
const THEME_OPTIONS: ReadonlyArray<{ value: ReadingTheme; label: string; bg: string; fg: string }> =
  [
    { value: 'light', label: 'Light', ...READING_THEME_COLORS.light },
    { value: 'sepia', label: 'Sepia', ...READING_THEME_COLORS.sepia },
    { value: 'dark', label: 'Dark', ...READING_THEME_COLORS.dark },
    { value: 'parchment', label: 'Parchment', ...READING_THEME_COLORS.parchment },
  ]

const TYPEFACE_OPTIONS: ReadonlyArray<{ value: ReadingTypeface; label: string; font: string }> = [
  { value: 'newsreader', label: 'Newsreader', font: "'Newsreader', ui-serif, Georgia, serif" },
  { value: 'literata', label: 'Literata', font: "'Literata', ui-serif, Georgia, serif" },
  { value: 'sans', label: 'Sans', font: 'ui-sans-serif, system-ui, sans-serif' },
]

const LAYOUT_OPTIONS: SegmentOption[] = [
  { value: 'paged', label: 'Paged' },
  { value: 'scroll', label: 'Scroll' },
]

// Density preview: the three stacked bars sit at increasing gaps (compact -> relaxed), as in the maket.
const SPACING_OPTIONS: ReadonlyArray<{ value: ReadingSpacing; label: string; gap: string }> = [
  { value: 'compact', label: 'Compact', gap: '0.15rem' },
  { value: 'cozy', label: 'Cozy', gap: '0.3rem' },
  { value: 'relaxed', label: 'Relaxed', gap: '0.45rem' },
]

function onSizeInput(event: Event): void {
  store.setTextSizePt(Number((event.target as HTMLInputElement).value))
}

// A modal sheet closes on Escape (accessibility) as well as the × control and a backdrop tap.
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="absolute inset-0 z-30 flex flex-col justify-end"
    role="dialog"
    aria-modal="true"
    aria-label="Display preferences"
    data-testid="display-panel"
  >
    <!-- Backdrop: a decorative dismiss layer (the × button is the labelled close control). -->
    <div class="absolute inset-0 bg-ink/25" aria-hidden="true" @click="emit('close')" />

    <section
      class="relative mx-auto w-full max-w-md rounded-t-card bg-surface px-5 pt-3 pb-6 shadow-card"
    >
      <div class="mx-auto mb-3 h-1.5 w-10 rounded-pill bg-line" aria-hidden="true" />

      <header class="mb-5 flex items-center justify-between">
        <h2 class="font-display text-xl text-ink">Display</h2>
        <button
          type="button"
          aria-label="Close preferences"
          class="tap-target inline-flex items-center justify-center rounded-control p-1.5 text-muted hover:bg-sunken hover:text-ink"
          @click="emit('close')"
        >
          <AppIcon name="close" :size="18" />
        </button>
      </header>

      <!-- THEME -->
      <section class="mb-5">
        <h3
          class="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-muted uppercase"
        >
          Theme
        </h3>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="t in THEME_OPTIONS"
            :key="t.value"
            type="button"
            :aria-label="t.label"
            :aria-pressed="store.theme === t.value"
            class="flex flex-col items-center gap-1.5 rounded-control p-1 transition-colors"
            @click="store.setTheme(t.value)"
          >
            <span
              class="grid h-12 w-full place-items-center rounded-control border font-display text-lg ring-primary ring-offset-2 ring-offset-surface transition-shadow"
              :class="store.theme === t.value ? 'border-transparent ring-2' : 'border-line'"
              :style="{ background: t.bg, color: t.fg }"
            >
              Aa
            </span>
            <span class="text-xs text-muted">{{ t.label }}</span>
          </button>
        </div>
      </section>

      <!-- TYPEFACE -->
      <section class="mb-5">
        <h3
          class="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-muted uppercase"
        >
          Typeface
        </h3>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="f in TYPEFACE_OPTIONS"
            :key="f.value"
            type="button"
            :aria-label="f.label"
            :aria-pressed="store.typeface === f.value"
            class="flex flex-col items-center gap-1.5 rounded-control border bg-canvas p-2 transition-colors"
            :class="
              store.typeface === f.value
                ? 'border-transparent ring-2 ring-primary'
                : 'border-line hover:bg-sunken'
            "
            @click="store.setTypeface(f.value)"
          >
            <span class="text-2xl leading-none text-ink" :style="{ fontFamily: f.font }">Ag</span>
            <span class="text-xs text-muted">{{ f.label }}</span>
          </button>
        </div>
      </section>

      <!-- TEXT SIZE -->
      <section class="mb-5">
        <h3
          class="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-muted uppercase"
        >
          Text size
        </h3>
        <div class="flex items-center gap-3">
          <span class="font-display text-sm text-muted" aria-hidden="true">A</span>
          <input
            type="range"
            class="h-1.5 flex-1 cursor-pointer accent-primary"
            aria-label="Text size"
            :min="MIN_TEXT_SIZE_PT"
            :max="MAX_TEXT_SIZE_PT"
            :value="store.textSizePt"
            @input="onSizeInput"
          />
          <span class="font-display text-xl text-ink" aria-hidden="true">A</span>
          <span
            class="w-10 text-right font-mono text-xs text-muted tabular-nums"
            data-testid="text-size-label"
          >
            {{ store.textSizePt }}pt
          </span>
        </div>
      </section>

      <!-- LAYOUT + SPACING -->
      <div class="grid grid-cols-2 gap-4">
        <section>
          <h3
            class="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-muted uppercase"
          >
            Layout
          </h3>
          <SegmentedControl
            :model-value="store.layout"
            :options="LAYOUT_OPTIONS"
            aria-label="Layout"
            @update:model-value="store.setLayout($event as ReadingLayout)"
          />
        </section>

        <section>
          <h3
            class="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-muted uppercase"
          >
            Spacing
          </h3>
          <div
            class="inline-flex gap-1.5 rounded-control bg-sunken p-0.5"
            role="group"
            aria-label="Spacing"
          >
            <button
              v-for="s in SPACING_OPTIONS"
              :key="s.value"
              type="button"
              :aria-label="s.label"
              :aria-pressed="store.spacing === s.value"
              class="tap-target grid h-9 w-9 place-items-center rounded-[calc(var(--radius-control)-0.25rem)] transition-colors"
              :class="
                store.spacing === s.value
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-ink'
              "
              @click="store.setSpacing(s.value)"
            >
              <span class="flex flex-col" :style="{ gap: s.gap }" aria-hidden="true">
                <span class="block h-0.5 w-4 rounded-pill bg-current" />
                <span class="block h-0.5 w-4 rounded-pill bg-current" />
                <span class="block h-0.5 w-4 rounded-pill bg-current" />
              </span>
            </button>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
