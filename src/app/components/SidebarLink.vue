<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon, { type IconName } from './AppIcon.vue'

// One sidebar nav row. Uses RouterLink's custom slot so we own the active styling and set
// aria-current="page" on the exact-active route (accessibility + the maket's active wash).
const { to, icon, badge } = defineProps<{ to: string; icon: IconName; badge?: number }>()
</script>

<template>
  <RouterLink v-slot="{ href, navigate, isExactActive }" :to="to" custom>
    <a
      :href="href"
      :aria-current="isExactActive ? 'page' : undefined"
      class="tap-target flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors"
      :class="isExactActive ? 'bg-active font-medium text-primary' : 'text-ink hover:bg-surface'"
      @click="navigate"
    >
      <AppIcon :name="icon" :size="18" />
      <span class="truncate"><slot /></span>
      <span
        v-if="badge !== undefined"
        class="ml-auto rounded-md bg-sunken px-1.5 py-0.5 font-mono text-xs text-muted"
        >{{ badge }}</span
      >
    </a>
  </RouterLink>
</template>
