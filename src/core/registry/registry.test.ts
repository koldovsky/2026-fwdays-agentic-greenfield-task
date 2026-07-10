import { describe, expect, it, vi } from 'vitest'
import type {
  Connector,
  FormatHandler,
  PluginManifest,
  ProgressSyncStrategy,
} from '@/core/contracts'
import type { LibraryBrowseEntry } from '@/core/model'
import {
  type CatalogEntry,
  type EnabledSetStore,
  InMemoryEnabledSetStore,
  PluginIncompatibleError,
  PluginNotDisableableError,
  PluginNotFoundError,
  PluginRegistry,
  satisfiesHostApi,
} from '@/core/registry'

const noopStrategy: ProgressSyncStrategy = {
  async getProgress() {
    return undefined
  },
  async setProgress() {},
}

function fakeConnector(id: string): Connector {
  return {
    id,
    progressSync: false,
    async probe() {
      return true
    },
    async browse(): Promise<LibraryBrowseEntry[]> {
      return []
    },
    async getBook(ref) {
      return { title: ref.title, authors: [] }
    },
    async content() {
      return new Uint8Array()
    },
    progressStrategy() {
      return noopStrategy
    },
  }
}

function connectorManifest(id: string, hostApi = '^1.0.0'): PluginManifest {
  return {
    id,
    name: id,
    version: '1.0.0',
    kind: 'connector',
    hostApi,
    bundled: true,
    capabilities: {
      protocols: ['komga-rest'],
      auth: ['basic'],
      progressSync: true,
      search: true,
      download: true,
      pagedStreaming: true,
      thumbnails: true,
    },
  }
}

function connectorEntry(
  id: string,
  hostApi = '^1.0.0',
): { entry: CatalogEntry<Connector>; loader: ReturnType<typeof vi.fn> } {
  const instance = fakeConnector(id)
  const loader = vi.fn(async () => instance)
  return { entry: { manifest: connectorManifest(id, hostApi), loader }, loader }
}

function formatEntry(id: string, mediaTypes: string[]): CatalogEntry<FormatHandler> {
  const manifest: PluginManifest = {
    id,
    name: id,
    version: '1.0.0',
    kind: 'format',
    hostApi: '^1.0.0',
    bundled: true,
    capabilities: { mediaTypes },
  }
  const handler: FormatHandler = {
    id,
    mediaTypes,
    capabilities: { mediaTypes },
    sniff: () => 1,
    async open() {
      return { metadata: { title: 't' }, readingOrder: [] }
    },
  }
  return { manifest, loader: async () => handler }
}

describe('PluginRegistry — lazy loader registration', () => {
  it('does not invoke the loader at registration (no chunk loads)', () => {
    const registry = new PluginRegistry()
    const { entry, loader } = connectorEntry('connector-komga')
    registry.registerConnector(entry)
    expect(loader).not.toHaveBeenCalled()
  })

  it('loads the chunk on first use and caches it (loader runs once)', async () => {
    const registry = new PluginRegistry()
    const { entry, loader } = connectorEntry('connector-komga')
    registry.registerConnector(entry)
    await registry.install('connector-komga')

    const first = await registry.resolveConnector('connector-komga')
    const second = await registry.resolveConnector('connector-komga')
    expect(loader).toHaveBeenCalledTimes(1)
    expect(first.status).toBe('ready')
    if (first.status === 'ready' && second.status === 'ready') {
      expect(first.instance).toBe(second.instance)
    }
  })
})

describe('PluginRegistry — persisted, lazily-hydrated enabled set', () => {
  it('enabling a plugin persists its id', () => {
    const store: EnabledSetStore = new InMemoryEnabledSetStore()
    const registry = new PluginRegistry({ enabledStore: store })
    registry.registerConnector(connectorEntry('connector-komga').entry)
    registry.enable('connector-komga')
    expect([...store.load()]).toEqual(['connector-komga'])
  })

  it('rehydrate restores the enabled set WITHOUT loading any chunk', async () => {
    const store = new InMemoryEnabledSetStore()
    store.save(['connector-komga'])
    const registry = new PluginRegistry({ enabledStore: store })
    const { entry, loader } = connectorEntry('connector-komga')
    registry.registerConnector(entry)

    registry.rehydrate()
    expect(registry.isEnabled('connector-komga')).toBe(true)
    expect(loader).not.toHaveBeenCalled() // hydrated as enabled, chunk still unloaded

    // ...and the chunk only loads on first use.
    await registry.resolveConnector('connector-komga')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('rehydrate ignores ids no longer in the catalogue', () => {
    const store = new InMemoryEnabledSetStore()
    store.save(['connector-gone'])
    const registry = new PluginRegistry({ enabledStore: store })
    registry.rehydrate()
    expect(registry.isEnabled('connector-gone')).toBe(false)
  })
})

describe('PluginRegistry — three-state resolution', () => {
  it('an enabled matching plugin resolves to ready with the loaded instance', async () => {
    const registry = new PluginRegistry()
    registry.registerConnector(connectorEntry('connector-komga').entry)
    await registry.install('connector-komga')
    const resolution = await registry.resolveConnector('connector-komga')
    expect(resolution.status).toBe('ready')
    if (resolution.status === 'ready') expect(resolution.instance.id).toBe('connector-komga')
  })

  it('a catalogue-only match resolves to installable carrying its manifest', async () => {
    const registry = new PluginRegistry()
    registry.registerConnector(connectorEntry('connector-komga').entry)
    const resolution = await registry.resolveConnector('connector-komga')
    expect(resolution.status).toBe('installable')
    if (resolution.status === 'installable') {
      expect(resolution.suggestion.id).toBe('connector-komga')
    }
  })

  it('no match resolves to unsupported', async () => {
    const registry = new PluginRegistry()
    expect((await registry.resolveConnector('nope')).status).toBe('unsupported')
  })

  it('resolveFormat matches by media type across the three states', async () => {
    const registry = new PluginRegistry()
    registry.registerFormat(formatEntry('format-epub', ['application/epub+zip']))
    expect((await registry.resolveFormat('application/pdf')).status).toBe('unsupported')
    expect((await registry.resolveFormat('application/epub+zip')).status).toBe('installable')
    await registry.install('format-epub')
    expect((await registry.resolveFormat('application/epub+zip')).status).toBe('ready')
  })
})

describe('PluginRegistry — host-API compatibility gate', () => {
  it('loads an in-range plugin normally', async () => {
    const registry = new PluginRegistry()
    registry.registerConnector(connectorEntry('connector-komga', '^1.0.0').entry)
    await expect(registry.install('connector-komga')).resolves.toBeUndefined()
    expect(registry.isEnabled('connector-komga')).toBe(true)
  })

  it('refuses an out-of-range plugin with a message naming both versions, and does not load it', async () => {
    const registry = new PluginRegistry()
    const { entry, loader } = connectorEntry('connector-future', '^2.0.0')
    registry.registerConnector(entry)
    await expect(registry.install('connector-future')).rejects.toBeInstanceOf(
      PluginIncompatibleError,
    )
    try {
      await registry.install('connector-future')
    } catch (error) {
      expect((error as Error).message).toContain('^2.0.0')
      expect((error as Error).message).toContain('1.2.0')
    }
    expect(loader).not.toHaveBeenCalled()
    expect(registry.isEnabled('connector-future')).toBe(false)
  })

  it('throws PluginNotFoundError for an unknown id', async () => {
    const registry = new PluginRegistry()
    await expect(registry.install('ghost')).rejects.toBeInstanceOf(PluginNotFoundError)
  })
})

describe('PluginRegistry — install is a first-party import that persists', () => {
  it('installs (loads the bundled chunk), enables, and persists the choice', async () => {
    const store = new InMemoryEnabledSetStore()
    const registry = new PluginRegistry({ enabledStore: store })
    const { entry, loader } = connectorEntry('connector-komga')
    registry.registerConnector(entry)

    expect(registry.available('connector')).toHaveLength(1)
    expect(registry.installed('connector')).toHaveLength(0)

    await registry.install('connector-komga')

    expect(loader).toHaveBeenCalledTimes(1)
    expect(registry.installed('connector').map((m) => m.id)).toEqual(['connector-komga'])
    expect(registry.available('connector')).toHaveLength(0)
    expect([...store.load()]).toEqual(['connector-komga'])
  })
})

describe('PluginRegistry — bundled plugins are non-disableable (load-bearing)', () => {
  function bundledFormatEntry(id: string, bundled: boolean): CatalogEntry<FormatHandler> {
    const base = formatEntry(id, ['application/epub+zip'])
    return { ...base, manifest: { ...base.manifest, bundled } }
  }

  it('REFUSES to disable a bundled plugin and leaves it enabled', async () => {
    const registry = new PluginRegistry()
    registry.registerFormat(bundledFormatEntry('format.epub', true))
    await registry.install('format.epub')
    expect(registry.isEnabled('format.epub')).toBe(true)

    expect(() => registry.disable('format.epub')).toThrow(PluginNotDisableableError)
    // The refusal is load-bearing: a bundled format must keep resolving to `ready`, never `installable`.
    expect(registry.isEnabled('format.epub')).toBe(true)
    expect((await registry.resolveFormat('application/epub+zip')).status).toBe('ready')
  })

  it('reports bundled status so the UI can render the toggle non-interactive', () => {
    const registry = new PluginRegistry()
    registry.registerFormat(bundledFormatEntry('format.epub', true))
    registry.registerFormat(bundledFormatEntry('format.pdf', false))
    expect(registry.isBundled('format.epub')).toBe(true)
    expect(registry.isBundled('format.pdf')).toBe(false)
    expect(registry.isBundled('format.unknown')).toBe(false)
  })

  it('ALLOWS disabling a non-bundled installed plugin (reversible, no data loss)', async () => {
    const registry = new PluginRegistry()
    registry.registerFormat(bundledFormatEntry('format.pdf', false))
    await registry.install('format.pdf')
    expect(registry.isEnabled('format.pdf')).toBe(true)

    registry.disable('format.pdf')
    expect(registry.isEnabled('format.pdf')).toBe(false)
    // dispatch no longer resolves to it…
    expect((await registry.resolveFormat('application/epub+zip')).status).toBe('installable')
    // …but it remains in the catalogue and re-enables without re-installing.
    registry.enable('format.pdf')
    expect(registry.isEnabled('format.pdf')).toBe(true)
  })
})

describe('PluginRegistry — disable is reversible, never an uninstall (audit cycle-1 P1)', () => {
  function bundledFormatEntry(id: string, bundled: boolean): CatalogEntry<FormatHandler> {
    const base = formatEntry(id, ['application/epub+zip'])
    return { ...base, manifest: { ...base.manifest, bundled } }
  }

  it('a disabled plugin STAYS in installed() and OUT of available() — it never bounces back to Available', async () => {
    const registry = new PluginRegistry()
    registry.registerFormat(bundledFormatEntry('format.pdf', false))
    await registry.install('format.pdf')
    expect(registry.installed('format').map((m) => m.id)).toEqual(['format.pdf'])
    expect(registry.available('format')).toHaveLength(0)

    registry.disable('format.pdf')

    // The bug this fixes: installed() used to mean "enabled", so disabling dropped the id out of it and
    // it reappeared in available() with an Install button. Now it must stay put, toggle off.
    expect(registry.isEnabled('format.pdf')).toBe(false)
    expect(registry.isInstalled('format.pdf')).toBe(true)
    expect(registry.installed('format').map((m) => m.id)).toEqual(['format.pdf'])
    expect(registry.available('format')).toHaveLength(0)
  })

  it('a never-installed plugin is available and NOT installed', () => {
    const registry = new PluginRegistry()
    registry.registerFormat(bundledFormatEntry('format.pdf', false))
    expect(registry.isInstalled('format.pdf')).toBe(false)
    expect(registry.available('format').map((m) => m.id)).toEqual(['format.pdf'])
    expect(registry.installed('format')).toHaveLength(0)
  })

  it('persists the installed set via a dedicated store and restores it on rehydrate', async () => {
    const enabledStore = new InMemoryEnabledSetStore()
    const installedStore = new InMemoryEnabledSetStore()
    const registry = new PluginRegistry({ enabledStore, installedStore })
    registry.registerFormat(bundledFormatEntry('format.pdf', false))
    await registry.install('format.pdf')
    registry.disable('format.pdf')

    expect([...installedStore.load()]).toEqual(['format.pdf']) // stays persisted-installed…
    expect([...enabledStore.load()]).toEqual([]) // …but no longer persisted-enabled

    const rehydrated = new PluginRegistry({ enabledStore, installedStore })
    rehydrated.registerFormat(bundledFormatEntry('format.pdf', false))
    rehydrated.rehydrate()
    expect(rehydrated.isInstalled('format.pdf')).toBe(true)
    expect(rehydrated.isEnabled('format.pdf')).toBe(false)
    expect(rehydrated.available('format')).toHaveLength(0) // still not Available after a reload
  })

  it('migrates a pre-fix persisted store (enabled-only) so an already-installed plugin is not dropped to Available', () => {
    // Before this fix, only the enabled set was persisted. An upgrade must not un-install a plugin a
    // user had already installed just because the new installedStore key starts out empty.
    const enabledStore = new InMemoryEnabledSetStore()
    enabledStore.save(['format.pdf'])
    const installedStore = new InMemoryEnabledSetStore() // empty: never written pre-fix

    const registry = new PluginRegistry({ enabledStore, installedStore })
    registry.registerFormat(bundledFormatEntry('format.pdf', false))
    registry.rehydrate()

    expect(registry.isEnabled('format.pdf')).toBe(true)
    expect(registry.isInstalled('format.pdf')).toBe(true)
    expect(registry.available('format')).toHaveLength(0)
  })
})

describe('PluginRegistry — install is a dynamic import, never a network code fetch', () => {
  it('does not touch globalThis.fetch while installing (ADR-010)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const registry = new PluginRegistry()
    const { entry } = connectorEntry('connector.komga')
    registry.registerConnector(entry)

    await registry.install('connector.komga')

    expect(registry.isEnabled('connector.komga')).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled() // "install" loads a bundled chunk, it never downloads code
    fetchSpy.mockRestore()
  })
})

describe('satisfiesHostApi — minimal semver gate', () => {
  it('caret ranges match same-major, >= base', () => {
    expect(satisfiesHostApi('^1.0.0', '1.0.0')).toBe(true)
    expect(satisfiesHostApi('^1.0.0', '1.4.2')).toBe(true)
    expect(satisfiesHostApi('^1.0.0', '2.0.0')).toBe(false)
    expect(satisfiesHostApi('^1.2.0', '1.1.0')).toBe(false)
    expect(satisfiesHostApi('^2.0.0', '1.0.0')).toBe(false)
  })

  it('tilde, comparators, exact, and wildcard', () => {
    expect(satisfiesHostApi('~1.0.5', '1.0.9')).toBe(true)
    expect(satisfiesHostApi('~1.0.5', '1.1.0')).toBe(false)
    expect(satisfiesHostApi('>=1.0.0', '1.0.0')).toBe(true)
    expect(satisfiesHostApi('<2.0.0', '1.9.9')).toBe(true)
    expect(satisfiesHostApi('1.0.0', '1.0.0')).toBe(true)
    expect(satisfiesHostApi('1.0.0', '1.0.1')).toBe(false)
    expect(satisfiesHostApi('*', '1.2.3')).toBe(true)
  })

  it('defaults the version argument to HOST_API_VERSION', () => {
    expect(satisfiesHostApi('^1.0.0')).toBe(true)
    expect(satisfiesHostApi('^9.0.0')).toBe(false)
  })
})
