<script setup lang="ts">
// Global loading indicator used while screens resolve data. Announces itself to assistive tech.
const { label = 'Loading…' } = defineProps<{ label?: string }>()
</script>

<template>
  <div class="inline-flex items-center gap-3 text-muted" role="status" aria-live="polite">
    <span
      class="size-5 animate-spin rounded-full border-2 border-line border-t-primary"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </div>
</template>
