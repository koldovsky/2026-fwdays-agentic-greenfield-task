<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AddSourceModal from '@/app/components/add-source/AddSourceModal.vue'

// Route target for /settings/sources/add (doc/web/05). Renders the "Add a source" modal open over the
// shell; closing it (Cancel / × / Esc / backdrop) or connecting a source returns to the Library, which
// now renders on the newly connected connector.
const router = useRouter()
const open = ref(true)

function leave(): void {
  router.replace('/library')
}
</script>

<template>
  <div class="min-h-dvh">
    <AddSourceModal :open="open" @close="leave" @connected="leave" />
  </div>
</template>
