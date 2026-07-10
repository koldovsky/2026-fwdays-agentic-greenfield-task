<script setup lang="ts">
// Minimal stroke-icon set for the app chrome (sidebar nav, primitives). Decorative by default —
// accessible names come from adjacent text, so icons are aria-hidden. Pure <path> data keeps it
// dependency-free (no icon lib in the stack).

export type IconName =
  | 'home'
  | 'library'
  | 'search'
  | 'download'
  | 'extensions'
  | 'settings'
  | 'add'
  | 'leaf'
  | 'chevron-right'
  | 'check'
  | 'shield'
  | 'grid'
  | 'list'
  | 'sync'
  | 'link'
  | 'server'
  | 'bolt'
  | 'close'
  | 'arrow-left'
  | 'share'
  | 'more'
  | 'bookmark'
  | 'book-open'
  | 'translate'
  | 'phone'

const PATHS: Record<IconName, string[]> = {
  home: ['M3 11l9-7 9 7', 'M5 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9'],
  library: ['M4 19h16', 'M6 19V6h3v13', 'M11 19V9h3v10', 'M16 19V4h3v15'],
  search: ['M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z', 'M16.5 16.5L21 21'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 20h14'],
  extensions: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  settings: ['M4 7h9', 'M17 7h3', 'M4 17h3', 'M11 17h9', 'M15 5v4', 'M7 15v4'],
  add: ['M12 5v14', 'M5 12h14'],
  leaf: ['M12 3C7 7 7 14 12 21 17 14 17 7 12 3z', 'M12 7v11'],
  'chevron-right': ['M9 6l6 6-6 6'],
  check: ['M5 12l4 4 10-11'],
  shield: ['M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z', 'M9 12l2 2 4-4'],
  grid: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  list: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
  sync: [
    'M20 11a8 8 0 0 0-13.7-4.9L4 8',
    'M4 4v4h4',
    'M4 13a8 8 0 0 0 13.7 4.9L20 16',
    'M20 20v-4h-4',
  ],
  // The "Add a source" screen (doc/web/05): link = SERVER ADDRESS field, server = detected card,
  // bolt = Connect action, close = the modal's × control.
  link: [
    'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 1 0-7-7l-1 1',
    'M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 1 0 7 7l1-1',
  ],
  server: ['M4 5h16v6H4z', 'M4 13h16v6H4z', 'M8 8h.01', 'M8 16h.01'],
  bolt: ['M13 3 5 13h6l-1 8 8-10h-6z'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  // The Book detail screen (doc/web/02): arrow-left = ← Back, share + more = header right controls,
  // book-open = "Continue reading", bookmark = the bookmark toggle, translate = the language pill,
  // phone = the "Last read … on Phone" line.
  'arrow-left': ['M19 12H5', 'M11 18l-6-6 6-6'],
  share: ['M12 14V4', 'M8 8l4-4 4 4', 'M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7'],
  more: ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'],
  bookmark: ['M6 4h12v16l-6-4-6 4z'],
  'book-open': [
    'M12 7c-1.6-1.1-4.1-2-7-2v12c2.9 0 5.4.9 7 2 1.6-1.1 4.1-2 7-2V5c-2.9 0-5.4.9-7 2z',
    'M12 7v12',
  ],
  translate: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M3 12h18',
    'M12 3c2.4 2.4 2.4 15.6 0 18',
    'M12 3c-2.4 2.4-2.4 15.6 0 18',
  ],
  phone: ['M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M11 18h2'],
}

const { name, size = 20 } = defineProps<{ name: IconName; size?: number }>()
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in PATHS[name]" :key="i" :d="d" />
  </svg>
</template>
