import Link from 'next/link'

export type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
      <ol
        style={{
          listStyle: 'none',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          padding: 0,
          margin: 0,
          color: 'var(--text-muted)',
        }}
      >
        {items.map((it, i) => {
          const last = i === items.length - 1
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {it.href && !last ? (
                <Link href={it.href}>{it.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} style={{ color: 'var(--text-secondary)' }}>
                  {it.label}
                </span>
              )}
              {!last && <span aria-hidden="true" style={{ color: 'var(--text-faint)' }}>/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
