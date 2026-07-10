<script setup lang="ts">
// On/off switch — extension enable toggles (doc/web/06). v-model'd boolean; ARIA switch role.
const {
  modelValue,
  label,
  disabled = false,
} = defineProps<{ modelValue: boolean; label?: string; disabled?: boolean }>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    class="tap-target inline-flex h-6 w-10 shrink-0 items-center rounded-pill p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="modelValue ? 'bg-primary' : 'bg-sunken'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="size-5 rounded-full bg-on-primary shadow-sm transition-transform"
      :class="modelValue ? 'translate-x-4' : 'translate-x-0'"
    />
  </button>
</template>
