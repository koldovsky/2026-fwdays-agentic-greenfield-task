<script setup lang="ts">
import { computed } from 'vue'
import type { Locator } from '@/core/model'

// The "CHAPTERS" section (doc/web/02): the label, the chapter count, and the numbered table-of-contents
// rows. The rows come from `Publication.toc`, which a FormatHandler populates (add-format-epub) — until
// then `toc` is empty and the section shows a graceful placeholder rather than broken rows. `chapterCount`
// is catalog metadata a connector can know before the book is opened, so the count can show meanwhile.
const { toc = [], chapterCount } = defineProps<{ toc?: Locator[]; chapterCount?: number }>()

const hasToc = computed(() => toc.length > 0)
</script>

<template>
  <section aria-labelledby="chapters-heading">
    <div class="flex items-baseline justify-between border-b border-line pb-2">
      <h2 id="chapters-heading" class="font-mono text-xs tracking-wider text-muted uppercase">
        Chapters
      </h2>
      <span v-if="chapterCount !== undefined" class="text-sm text-muted"
        >{{ chapterCount }} chapters</span
      >
    </div>

    <!-- Populated once a FormatHandler supplies Publication.toc (add-format-epub). -->
    <ol v-if="hasToc" class="mt-2">
      <li
        v-for="(item, index) in toc"
        :key="item.href"
        class="flex items-baseline gap-4 rounded-md px-3 py-2.5 hover:bg-sunken/50"
      >
        <span class="w-6 font-mono text-sm text-muted">{{ index + 1 }}</span>
        <span class="flex-1 font-display text-ink">{{ item.title }}</span>
      </li>
    </ol>

    <p v-else class="mt-4 text-sm text-muted">
      Chapters will be available once the book is opened…
    </p>
  </section>
</template>
