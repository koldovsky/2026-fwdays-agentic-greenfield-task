<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

// Pill / chip. `neutral` = metadata pills ("432 pages", doc/web/02); `capability` = the green
// capability chips with a check ("Progress sync", doc/web/05).
export type ChipVariant = 'neutral' | 'capability'

const {
  variant = 'neutral',
  icon,
  label,
} = defineProps<{ variant?: ChipVariant; icon?: IconName; label?: string }>()

const VARIANT_CLASS: Record<ChipVariant, string> = {
  neutral: 'bg-surface text-ink border border-line',
  capability: 'bg-active text-primary border border-transparent',
}

const leadingIcon = icon ?? (variant === 'capability' ? 'check' : undefined)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm leading-none"
    :class="VARIANT_CLASS[variant]"
  >
    <AppIcon v-if="leadingIcon" :name="leadingIcon" :size="14" />
    <slot>{{ label }}</slot>
  </span>
</template>
