<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

// Primary = the single forest action ("Continue reading", "Connect"; doc/web/02,05).
// Secondary = bordered surface ("Offline", "Cancel", available-extension "Install"; doc/web/02,06).
export type ButtonVariant = 'primary' | 'secondary'

const {
  variant = 'primary',
  type = 'button',
  icon,
  disabled = false,
} = defineProps<{
  variant?: ButtonVariant
  type?: 'button' | 'submit' | 'reset'
  icon?: IconName
  disabled?: boolean
}>()

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong',
  secondary: 'bg-surface text-ink border border-line hover:bg-sunken',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="tap-target inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
    :class="VARIANT_CLASS[variant]"
  >
    <AppIcon v-if="icon" :name="icon" :size="16" />
    <slot />
  </button>
</template>
