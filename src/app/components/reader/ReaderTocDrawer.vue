<script setup lang="ts">
// The table-of-contents drawer: lists the publication's chapters (Publication.tableOfContents) and
// navigates the renderer to the selected entry's locator (Navigator.goTo). A chrome control over the
// domain model — it never reaches into foliate. Hidden by default (doc/web/03 shows it closed); the
// top-bar TOC control toggles it.
import type { Locator } from '@/core/model'
import { AppIcon } from '@/app/components'

defineProps<{ open: boolean; toc: readonly Locator[] }>()
const emit = defineEmits<{ navigate: [locator: Locator]; close: [] }>()
</script>

<template>
  <div v-if="open" class="absolute inset-0 z-20 flex" role="dialog" aria-label="Table of contents">
    <!-- Scrim: click to dismiss. -->
    <button
      type="button"
      aria-label="Close table of contents"
      class="absolute inset-0 bg-ink/20"
      @click="emit('close')"
    />
    <nav
      class="relative ml-auto flex h-full w-80 max-w-[85vw] flex-col border-l border-line bg-surface shadow-card"
    >
      <header class="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 class="font-display text-lg text-ink">Contents</h2>
        <button
          type="button"
          aria-label="Close"
          class="tap-target rounded-control p-1.5 text-muted hover:bg-sunken hover:text-ink"
          @click="emit('close')"
        >
          <AppIcon name="close" :size="18" />
        </button>
      </header>

      <ol v-if="toc.length" class="flex-1 overflow-y-auto py-2">
        <li v-for="(item, index) in toc" :key="`${item.href}:${index}`">
          <button
            type="button"
            class="block w-full truncate px-5 py-2 text-left text-sm text-ink hover:bg-sunken"
            @click="emit('navigate', item)"
          >
            {{ item.title ?? item.href }}
          </button>
        </li>
      </ol>
      <p v-else class="px-5 py-6 text-sm text-muted">This book has no table of contents.</p>
    </nav>
  </div>
</template>
