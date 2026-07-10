<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

// Segmented toggle — grid/list switch (doc/web/01) and Paged/Scroll (doc/mobile/04). v-model'd.
export interface SegmentOption {
  value: string
  label: string
  icon?: IconName
}

const { modelValue, options, ariaLabel } = defineProps<{
  modelValue: string
  options: SegmentOption[]
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div
    class="inline-flex gap-0.5 rounded-control bg-sunken p-0.5"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="option.value === modelValue"
      :aria-label="option.icon ? option.label : undefined"
      class="tap-target inline-flex items-center gap-1.5 rounded-[calc(var(--radius-control)-0.25rem)] px-3 py-1.5 text-sm transition-colors"
      :class="
        option.value === modelValue ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
      "
      @click="emit('update:modelValue', option.value)"
    >
      <AppIcon v-if="option.icon" :name="option.icon" :size="16" />
      <span v-if="option.icon" class="sr-only">{{ option.label }}</span>
      <span v-else>{{ option.label }}</span>
    </button>
  </div>
</template>
