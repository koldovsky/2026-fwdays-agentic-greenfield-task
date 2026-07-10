<script setup lang="ts">
import AppIcon from './AppIcon.vue'

// Horizontal step indicator — the "Address → Detected → Sign in" flow (doc/web/05).
// `current` is the 1-based active step; earlier steps render done, later ones upcoming.
const { steps, current } = defineProps<{ steps: string[]; current: number }>()

function statusOf(index: number): 'done' | 'active' | 'upcoming' {
  const step = index + 1
  if (step < current) return 'done'
  if (step === current) return 'active'
  return 'upcoming'
}
</script>

<template>
  <ol class="flex items-center gap-3">
    <li
      v-for="(label, i) in steps"
      :key="label"
      class="flex items-center gap-3"
      :class="i < steps.length - 1 ? 'flex-1' : ''"
    >
      <span class="flex items-center gap-2">
        <span
          class="flex size-6 items-center justify-center rounded-full text-xs font-medium"
          :class="{
            'bg-primary text-on-primary': statusOf(i) === 'done',
            'border-2 border-primary text-primary': statusOf(i) === 'active',
            'border border-line text-muted': statusOf(i) === 'upcoming',
          }"
          :aria-current="statusOf(i) === 'active' ? 'step' : undefined"
        >
          <AppIcon v-if="statusOf(i) === 'done'" name="check" :size="14" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="text-sm" :class="statusOf(i) === 'upcoming' ? 'text-muted' : 'text-ink'">{{
          label
        }}</span>
      </span>
      <span v-if="i < steps.length - 1" class="h-px flex-1 bg-line" />
    </li>
  </ol>
</template>
