<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

// Global empty state — e.g. the empty library inviting the user to add a source. Styled in the
// design system (never a bare unstyled page). Pass a call-to-action via the `action` slot.
const {
  title,
  message,
  icon = 'leaf',
} = defineProps<{
  title: string
  message?: string
  icon?: IconName
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <span
      class="flex size-14 items-center justify-center rounded-full border border-line bg-surface text-muted"
    >
      <AppIcon :name="icon" :size="26" />
    </span>
    <h2 class="font-display text-2xl text-ink">{{ title }}</h2>
    <p v-if="message" class="max-w-md text-muted">{{ message }}</p>
    <div v-if="$slots.action" class="mt-1">
      <slot name="action" />
    </div>
  </div>
</template>
