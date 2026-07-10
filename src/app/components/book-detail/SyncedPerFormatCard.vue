<script setup lang="ts">
import { AppIcon, BaseCard } from '@/app/components'

// The "SYNCED PER FORMAT" explainer (doc/web/02): surfaces core-domain-model's load-bearing invariant —
// reading positions are keyed per (sourceId, bookId, mediaType), so the same title as EPUB vs PDF keeps
// two separate places. The sentence is the maket's verbatim text. The literal-string interpolations keep
// the exact wording (and spaces around the bolded EPUB/PDF) regardless of template whitespace handling.
</script>

<template>
  <BaseCard>
    <p class="flex items-center gap-1.5 font-mono text-xs tracking-wider text-primary uppercase">
      <AppIcon name="sync" :size="14" />
      Synced per format
    </p>
    <p class="mt-3 text-sm leading-relaxed text-ink/80">
      {{ 'Your ' }}<strong class="font-medium text-ink">EPUB</strong
      >{{ ' position (Phone) and the ' }}<strong class="font-medium text-ink">PDF</strong
      >{{ ' (Desktop) keep separate places — progress is keyed per format.' }}
    </p>
  </BaseCard>
</template>
