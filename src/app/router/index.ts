import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { MEDIA_TYPE_EPUB } from '@/core/model'

declare module 'vue-router' {
  interface RouteMeta {
    // The reader opts out of the sidebar shell and renders full-bleed.
    fullBleed?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/library' },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/app/views/PlaceholderView.vue'),
    props: { title: 'Home' },
  },
  {
    path: '/library',
    name: 'library',
    component: () => import('@/app/views/LibraryView.vue'),
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/app/views/PlaceholderView.vue'),
    props: { title: 'Search' },
  },
  {
    path: '/downloads',
    name: 'downloads',
    component: () => import('@/app/views/DownloadsView.vue'),
  },
  {
    // Path owned by add-app-shell — unchanged. mediaType rides the QUERY (a media type contains a "/"
    // that would otherwise split a path segment); the Library card passes the book's format, and the
    // view defaults to EPUB when absent. Progress/reader keying is per (sourceId, bookId, mediaType).
    path: '/book/:sourceId/:bookId',
    name: 'book',
    component: () => import('@/app/views/BookDetailView.vue'),
    props: (route) => ({
      sourceId: String(route.params.sourceId),
      bookId: String(route.params.bookId),
      mediaType:
        typeof route.query.mediaType === 'string' && route.query.mediaType
          ? route.query.mediaType
          : MEDIA_TYPE_EPUB,
    }),
  },
  {
    path: '/reader/:sourceId/:bookId/:mediaType',
    name: 'reader',
    component: () => import('@/app/views/ReaderView.vue'),
    // props: true passes the route params to the view as typed string props.
    props: true,
    meta: { fullBleed: true },
  },
  // Settings lands on the one implemented settings screen (Extensions). General/Reading remain
  // declared below as placeholders for later changes but are not linked from the nav.
  { path: '/settings', redirect: '/settings/extensions' },
  {
    path: '/settings/extensions',
    name: 'settings-extensions',
    component: () => import('@/app/views/SettingsExtensions.vue'),
  },
  {
    path: '/settings/reading',
    name: 'settings-reading',
    component: () => import('@/app/views/PlaceholderView.vue'),
    props: { title: 'Reading', subtitle: 'edda.local / settings / reading' },
  },
  {
    path: '/settings/general',
    name: 'settings-general',
    component: () => import('@/app/views/PlaceholderView.vue'),
    props: { title: 'General', subtitle: 'edda.local / settings / general' },
  },
  {
    path: '/settings/sources/add',
    name: 'settings-sources-add',
    component: () => import('@/app/views/AddSourceView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
