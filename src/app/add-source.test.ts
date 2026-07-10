import { describe, expect, it } from 'vitest'
import { KOMGA_CAPABILITIES } from '@/plugins/connectors/komga'
import { OPDS_CAPABILITIES } from '@/plugins/connectors/opds'
import { capabilityChips, protocolSummary, toDisplayConnectorId } from '@/app/add-source'

describe('toDisplayConnectorId', () => {
  it('renders the runtime dash-id in the maket dot-form', () => {
    expect(toDisplayConnectorId('connector-komga')).toBe('connector.komga')
    expect(toDisplayConnectorId('connector-opds')).toBe('connector.opds')
  })
})

describe('protocolSummary', () => {
  it('summarizes Komga as "opds v2 + rest" (doc/web/05)', () => {
    expect(protocolSummary(KOMGA_CAPABILITIES)).toBe('opds v2 + rest')
  })

  it('summarizes a generic OPDS feed as "opds v1 + opds v2"', () => {
    expect(protocolSummary(OPDS_CAPABILITIES)).toBe('opds v1 + opds v2')
  })
})

describe('capabilityChips — derived from capabilities, not hard-coded', () => {
  it('yields exactly the maket five chips for Komga, in order', () => {
    expect(capabilityChips(KOMGA_CAPABILITIES)).toEqual([
      { label: 'OPDS v2', kind: 'protocol' },
      { label: 'Progress sync', kind: 'feature' },
      { label: 'Search', kind: 'feature' },
      { label: 'Page streaming', kind: 'feature' },
      { label: 'Thumbnails', kind: 'feature' },
    ])
  })

  it('yields fewer chips for a bare OPDS feed (no progress sync / page streaming)', () => {
    const labels = capabilityChips(OPDS_CAPABILITIES).map((chip) => chip.label)
    expect(labels).toEqual(['OPDS v2', 'Search', 'Thumbnails'])
  })

  it('omits the protocol chip when no OPDS protocol is advertised', () => {
    const labels = capabilityChips({
      protocols: ['komga-rest'],
      auth: ['basic'],
      progressSync: true,
      search: false,
      download: true,
      pagedStreaming: false,
      thumbnails: false,
    }).map((chip) => chip.label)
    expect(labels).toEqual(['Progress sync'])
  })
})
