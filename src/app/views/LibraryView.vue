<script setup lang="ts">
import { computed } from 'vue'
import { getActivePinia } from 'pinia'
import { useRouter } from 'vue-router'
import { BaseButton, EmptyState } from '@/app/components'
import { useLibraryStore } from '@/app/stores/libraryStore'
import LibraryBrowse from './LibraryBrowse.vue'

// Route target for /library. When a Connector is wired into the store it renders the full Library
// (LibraryBrowse); otherwise — including when mounted with no Pinia at all — it shows the styled
// empty state inviting the user to connect a source (the app-shell acceptance criterion is preserved).
const router = useRouter()
const store = getActivePinia() ? useLibraryStore() : null
const connector = computed(() => store?.connector ?? null)
</script>

<template>
  <LibraryBrowse v-if="connector" />

  <section v-else class="mx-auto max-w-6xl px-8 py-10">
    <header class="mb-8">
      <h1 class="font-display text-4xl text-ink">Your library</h1>
      <p class="mt-1 text-muted">No sources connected yet.</p>
    </header>

    <EmptyState
      icon="library"
      title="Connect a source to begin"
      message="Add a Komga, Kavita, Calibre, or OPDS server — Edda detects what it can do and brings your books offline."
    >
      <template #action>
        <BaseButton icon="add" @click="router.push('/settings/sources/add')">Add source</BaseButton>
      </template>
    </EmptyState>
  </section>
</template>
