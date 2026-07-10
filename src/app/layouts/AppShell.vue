<script setup lang="ts">
import NavSidebar from '@/app/components/NavSidebar.vue'
import BottomNav from '@/app/components/BottomNav.vue'
import OfflineBanner from '@/app/components/OfflineBanner.vue'

// The browser-frame chrome: an offline banner across the top, then a persistent sidebar (md+) + a
// scrollable main region on the parchment canvas, with a responsive bottom tab bar on phone widths
// (doc/mobile/*). Wraps routed content (the reader route opts out via meta.fullBleed — see App.vue).
// Column layout: banner / [sidebar | main] / bottom-nav. `min-h-0` lets <main> own the scroll.
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
    <OfflineBanner />
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <NavSidebar />
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
    <BottomNav />
  </div>
</template>
