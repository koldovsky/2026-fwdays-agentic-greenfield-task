<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import AppIcon, { type IconName } from './AppIcon.vue'

// The responsive bottom tab bar (doc/mobile/01-library-mobile.png). Shown only on phone widths
// (`md:hidden`); the persistent NavSidebar takes over at `md`+ (it becomes `hidden md:flex`). This is a
// LAYOUT primitive that re-exposes EXISTING, IMPLEMENTED routes for narrow viewports — Library /
// Downloads / Settings — NOT new product surface (no new routes/screens). Home & Search are not
// implemented yet, so they are not tabs here (no links to placeholder stubs); Settings opens the one
// working settings screen (Extensions). Active state is derived from the route path (not RouterLink's
// exact match) so the Settings tab stays lit across every /settings/* sub-route.
// Same warm-parchment chrome + aria-current + focus ring as SidebarLink.
const route = useRoute()

interface Tab {
  to: string
  icon: IconName
  label: string
  /** Path prefix that marks this tab active (handles /settings/* sub-routes). */
  prefix: string
}

const tabs: Tab[] = [
  { to: '/library', icon: 'library', label: 'Library', prefix: '/library' },
  { to: '/downloads', icon: 'download', label: 'Downloads', prefix: '/downloads' },
  { to: '/settings/extensions', icon: 'settings', label: 'Settings', prefix: '/settings' },
]

function isActive(prefix: string): boolean {
  return route.path === prefix || route.path.startsWith(`${prefix}/`)
}
</script>

<template>
  <nav
    aria-label="Primary"
    class="flex items-stretch justify-around border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] md:hidden"
    data-testid="bottom-nav"
  >
    <RouterLink v-for="tab in tabs" :key="tab.to" v-slot="{ href, navigate }" :to="tab.to" custom>
      <a
        :href="href"
        :aria-current="isActive(tab.prefix) ? 'page' : undefined"
        class="flex flex-1 flex-col items-center gap-1 rounded-control py-2.5 text-xs transition-colors"
        :class="isActive(tab.prefix) ? 'text-primary' : 'text-muted hover:text-ink'"
        @click="navigate"
      >
        <AppIcon :name="tab.icon" :size="22" />
        <span>{{ tab.label }}</span>
      </a>
    </RouterLink>
  </nav>
</template>
