<script setup lang="ts">
// Styled placeholder for routes whose content is owned by a later change. Renders in the design
// system (serif heading, monospace breadcrumb) so the shell is navigable end-to-end now.
const { title, subtitle } = defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <section class="mx-auto max-w-6xl px-8 py-10">
    <p v-if="subtitle" class="mb-2 font-mono text-xs tracking-wide text-muted">{{ subtitle }}</p>
    <h1 class="font-display text-4xl text-ink">{{ title }}</h1>
    <p class="mt-3 text-muted">This screen arrives in a later change.</p>
  </section>
</template>
