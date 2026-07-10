import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * A one-shot "has this element scrolled near the viewport" gate, backed by `IntersectionObserver`. Used
 * to defer per-card work that a plain `loading="lazy"` `<img>` can't cover on its own — here, the
 * connector fetch a cover's `blob:` URL needs (see {@link useCoverObjectUrl}) — so a large grid doesn't
 * fire hundreds of cover requests on mount.
 *
 * Starts `false` and flips to `true` (and stays `true`) the first time the bound element intersects the
 * viewport, expanded by `rootMargin` so covers arrive just before they'd be seen. Falls OPEN (`true`
 * immediately) where `IntersectionObserver` is unavailable — old engines, non-browser test environments —
 * so a missing API never means a cover silently never loads.
 */
export function useLazyVisible(el: Ref<HTMLElement | null>, rootMargin = '200px'): Ref<boolean> {
  const visible = ref(typeof IntersectionObserver === 'undefined')
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    if (visible.value || el.value === null) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visible.value = true
          observer?.disconnect()
          observer = undefined
        }
      },
      { rootMargin },
    )
    observer.observe(el.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = undefined
  })

  return visible
}
