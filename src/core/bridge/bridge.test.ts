import { describe, expect, it, vi } from 'vitest'
import type { HttpClient, KeyValueStore, Logger, PluginManifest } from '@/core/contracts'
import { createHostBridge, createPluginBridge, type PluginBridgeFactories } from '@/core/bridge'

const noopHttp: HttpClient = { send: vi.fn() }
const noopStorage: KeyValueStore = {
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
}
const noopLogger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }

describe('createHostBridge', () => {
  it('exposes exactly the three sub-surfaces and nothing else', () => {
    const bridge = createHostBridge({ http: noopHttp, storage: noopStorage, logger: noopLogger })
    expect(Object.keys(bridge).sort()).toEqual(['http', 'logger', 'storage'])
    expect(bridge.http).toBe(noopHttp)
    expect(bridge.storage).toBe(noopStorage)
    expect(bridge.logger).toBe(noopLogger)
  })
})

describe('createPluginBridge', () => {
  function recordingFactories(): {
    factories: PluginBridgeFactories
    calls: Record<string, unknown>
  } {
    const calls: Record<string, unknown> = {}
    const factories: PluginBridgeFactories = {
      http: vi.fn((network) => {
        calls.network = network
        return noopHttp
      }),
      storage: vi.fn((pluginId) => {
        calls.storagePluginId = pluginId
        return noopStorage
      }),
      logger: vi.fn((pluginId) => {
        calls.loggerPluginId = pluginId
        return noopLogger
      }),
    }
    return { factories, calls }
  }

  const manifest: Pick<PluginManifest, 'permissions'> = {
    permissions: { network: ['https://komga.example'] },
  }

  it('assembles the bridge from injected platform factories', () => {
    const { factories } = recordingFactories()
    const bridge = createPluginBridge('connector-komga', manifest, factories)
    expect(bridge.http).toBe(noopHttp)
    expect(bridge.storage).toBe(noopStorage)
    expect(bridge.logger).toBe(noopLogger)
    expect(Object.keys(bridge).sort()).toEqual(['http', 'logger', 'storage'])
  })

  it('threads the declared network permissions into the http factory', () => {
    const { factories, calls } = recordingFactories()
    createPluginBridge('connector-komga', manifest, factories)
    expect(calls.network).toEqual(['https://komga.example'])
  })

  it('namespaces storage and logging to the plugin id', () => {
    const { factories, calls } = recordingFactories()
    createPluginBridge('connector-komga', manifest, factories)
    expect(calls.storagePluginId).toBe('connector-komga')
    expect(calls.loggerPluginId).toBe('connector-komga')
  })

  it('passes undefined network when the manifest declares no permissions (deny-all default)', () => {
    const { factories, calls } = recordingFactories()
    createPluginBridge('connector-x', { permissions: undefined }, factories)
    expect(calls.network).toBeUndefined()
  })

  it('every bridge surface is async (returns a promise where it yields a value)', async () => {
    const { factories } = recordingFactories()
    const bridge = createPluginBridge('connector-komga', manifest, factories)
    expect(bridge.storage.get('k')).toBeInstanceOf(Promise)
    expect(bridge.storage.set('k', new Uint8Array())).toBeInstanceOf(Promise)
    expect(bridge.storage.delete('k')).toBeInstanceOf(Promise)
    await expect(bridge.storage.get('k')).resolves.toBeUndefined()
  })
})
