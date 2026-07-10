<script setup lang="ts">
import { computed } from 'vue'
import { AppIcon } from '@/app/components'

// The detail header row (doc/web/02): ← Back, a monospace breadcrumb of the book's browse location, and
// share + "…" more controls at the right edge. Back returns to the originating browse context (the view
// wires it to router.back()). Share/more are the maket's affordances; their behaviour arrives later.
const { breadcrumb = [] } = defineProps<{ breadcrumb?: string[] }>()
const emit = defineEmits<{ back: [] }>()

const trail = computed(() => breadcrumb.join(' / '))
</script>

<template>
  <header class="flex items-center justify-between gap-4 border-b border-line px-8 py-3">
    <div class="flex min-w-0 items-center gap-4">
      <button
        type="button"
        class="tap-target inline-flex shrink-0 items-center gap-2 rounded-control px-2 py-1.5 text-ink hover:bg-sunken"
        @click="emit('back')"
      >
        <AppIcon name="arrow-left" :size="18" />
        <span class="text-sm font-medium">Back</span>
      </button>
      <nav
        v-if="trail"
        aria-label="Breadcrumb"
        class="truncate font-mono text-sm text-muted"
        data-testid="breadcrumb"
      >
        {{ trail }}
      </nav>
    </div>

    <div class="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Share"
        class="tap-target inline-flex items-center justify-center rounded-control p-2 text-muted hover:bg-sunken hover:text-ink"
      >
        <AppIcon name="share" :size="18" />
      </button>
      <button
        type="button"
        aria-label="More options"
        class="tap-target inline-flex items-center justify-center rounded-control p-2 text-muted hover:bg-sunken hover:text-ink"
      >
        <AppIcon name="more" :size="18" />
      </button>
    </div>
  </header>
</template>
