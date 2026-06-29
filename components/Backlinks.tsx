import type { Backlink } from '@/lib/content/links'

export function Backlinks({ items }: { items: Backlink[] }) {
  if (items.length === 0) return null
  return (
    <section style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-4)' }}>
      <h2>Linked from</h2>
      <ul>
        {items.map((b, i) => {
          const href = b.fromNote ? `/book/${b.fromBook}#${b.fromNote}` : `/book/${b.fromBook}`
          const label = b.fromNote ? `${b.fromBook} / ${b.fromNote}` : b.fromBook
          return <li key={i}><a href={href}>{label}</a></li>
        })}
      </ul>
    </section>
  )
}
