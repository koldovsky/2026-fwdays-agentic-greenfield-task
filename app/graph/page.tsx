import Link from 'next/link'
import { buildGraph } from '@/lib/content/graph'
import { coverSolid } from '@/components/cover'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

const SIZE = 860
const C = SIZE / 2
const R = 330

function trunc(s: string, n = 18) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export default async function GraphPage() {
  const { nodes, edges } = await buildGraph()

  const pos = new Map<string, { x: number; y: number; a: number }>()
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
    pos.set(n.slug, { x: C + R * Math.cos(a), y: C + R * Math.sin(a), a })
  })

  return (
    <main>
      <Breadcrumbs items={[{ label: 'The shelf', href: '/' }, { label: 'Graph' }]} />
      <h1 id="graph-title">Connections</h1>
      <p id="graph-desc" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
        {nodes.length} books · {edges.length} links — an undirected graph; a line joins two books when a note in one references the other (or one of its notes).
      </p>

      {nodes.length === 0 ? (
        <p>No links yet — add notes that reference other books to grow the graph.</p>
      ) : (
        <div style={{ maxWidth: SIZE, margin: '0 auto' }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" aria-labelledby="graph-title graph-desc" style={{ overflow: 'visible' }}>
            {/* edges */}
            <g fill="none" stroke="var(--accent)" strokeOpacity={0.28} strokeWidth={1}>
              {edges.map((e, i) => {
                const a = pos.get(e.from)
                const b = pos.get(e.to)
                if (!a || !b) return null
                return <path key={i} d={`M ${a.x} ${a.y} Q ${C} ${C} ${b.x} ${b.y}`} />
              })}
            </g>
            {/* nodes */}
            {nodes.map((n) => {
              const p = pos.get(n.slug)!
              const deg = (p.a * 180) / Math.PI
              const right = Math.cos(p.a) >= 0
              const lx = C + (R + 12) * Math.cos(p.a)
              const ly = C + (R + 12) * Math.sin(p.a)
              const rot = right ? deg : deg + 180
              const radius = 4 + Math.min(n.degree, 7)
              return (
                <a key={n.slug} href={`/book/${n.slug}`}>
                  <title>{`${n.title} (${n.degree} links)`}</title>
                  <circle cx={p.x} cy={p.y} r={radius} fill={coverSolid(n.coverColor)} stroke="var(--surface-card)" strokeWidth={1.5} />
                  <text
                    x={lx}
                    y={ly}
                    transform={`rotate(${rot} ${lx} ${ly})`}
                    textAnchor={right ? 'start' : 'end'}
                    dominantBaseline="middle"
                    fontFamily="var(--font-body)"
                    fontSize={9}
                    fill="var(--text-secondary)"
                  >
                    {trunc(n.title)}
                  </text>
                </a>
              )
            })}
          </svg>
        </div>
      )}
    </main>
  )
}
