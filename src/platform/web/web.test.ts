import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, HttpRequest, HttpResponse } from '@/core/contracts'
import {
  InMemoryKeyValueStore,
  PermissionEnforcingHttpClient,
  PluginPermissionError,
  WebEnabledSetStore,
  createConsoleLogger,
  createWebPluginBridge,
} from '@/platform/web'

function fakeResponse(status = 200): HttpResponse {
  return {
    status,
    headers: {},
    bytes: async () => new Uint8Array(),
    text: async () => '',
  }
}

function spyTransport(): { client: HttpClient; sent: HttpRequest[] } {
  const sent: HttpRequest[] = []
  const client: HttpClient = {
    send: vi.fn(async (request: HttpRequest) => {
      sent.push(request)
      return fakeResponse()
    }),
  }
  return { client, sent }
}

describe('PermissionEnforcingHttpClient — enforces declared network permissions', () => {
  it('allows a request to a declared origin and forwards it to the transport', async () => {
    const { client, sent } = spyTransport()
    const http = new PermissionEnforcingHttpClient(client, ['https://komga.example'])
    const response = await http.send({ url: 'https://komga.example/api/v1/books' })
    expect(response.status).toBe(200)
    expect(sent).toHaveLength(1)
  })

  it('refuses an undeclared origin with a permission error AND makes no network call', async () => {
    const { client, sent } = spyTransport()
    const http = new PermissionEnforcingHttpClient(client, ['https://komga.example'])
    await expect(http.send({ url: 'https://evil.example/steal' })).rejects.toBeInstanceOf(
      PluginPermissionError,
    )
    expect(client.send).not.toHaveBeenCalled()
    expect(sent).toHaveLength(0)
  })

  it('wildcard permission allows any origin (string form and array form)', async () => {
    const star = new PermissionEnforcingHttpClient(spyTransport().client, '*')
    await expect(star.send({ url: 'https://anything.example' })).resolves.toBeDefined()
    const starInArray = new PermissionEnforcingHttpClient(spyTransport().client, ['*'])
    await expect(starInArray.send({ url: 'http://localhost:25600/x' })).resolves.toBeDefined()
  })

  it('undeclared permissions (undefined) deny everything', async () => {
    const { client } = spyTransport()
    const http = new PermissionEnforcingHttpClient(client, undefined)
    await expect(http.send({ url: 'https://komga.example' })).rejects.toBeInstanceOf(
      PluginPermissionError,
    )
    expect(client.send).not.toHaveBeenCalled()
  })
})

describe('InMemoryKeyValueStore — namespaced per plugin id', () => {
  it("isolates a value to the writer: plugin B cannot read plugin A's key", async () => {
    const backing = new Map<string, Uint8Array>()
    const a = new InMemoryKeyValueStore('plugin-a', backing)
    const b = new InMemoryKeyValueStore('plugin-b', backing)
    await a.set('token', new Uint8Array([1, 2, 3]))
    expect(await a.get('token')).toEqual(new Uint8Array([1, 2, 3]))
    expect(await b.get('token')).toBeUndefined()
  })

  it('round-trips and deletes', async () => {
    const store = new InMemoryKeyValueStore('plugin-a')
    await store.set('k', new Uint8Array([9]))
    expect(await store.get('k')).toEqual(new Uint8Array([9]))
    await store.delete('k')
    expect(await store.get('k')).toBeUndefined()
  })

  it('get/set/delete are async', () => {
    const store = new InMemoryKeyValueStore('plugin-a')
    expect(store.get('k')).toBeInstanceOf(Promise)
    expect(store.set('k', new Uint8Array())).toBeInstanceOf(Promise)
    expect(store.delete('k')).toBeInstanceOf(Promise)
  })
})

describe('createConsoleLogger — attributable logging', () => {
  it('tags entries at every level with the plugin id', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const logger = createConsoleLogger('connector-komga')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    for (const spy of [debug, info, warn, error]) {
      expect(spy).toHaveBeenCalledWith('[plugin:connector-komga]', expect.any(String))
    }
    debug.mockRestore()
    info.mockRestore()
    warn.mockRestore()
    error.mockRestore()
  })
})

describe('WebEnabledSetStore — localStorage-backed enabled set', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('round-trips the enabled id set', () => {
    const store = new WebEnabledSetStore('edda.test.enabled')
    expect(store.load()).toEqual([])
    store.save(['connector-komga', 'format-epub'])
    expect([...store.load()]).toEqual(['connector-komga', 'format-epub'])
  })

  it('tolerates corrupt storage by loading an empty set', () => {
    localStorage.setItem('edda.test.enabled', 'not json')
    expect(new WebEnabledSetStore('edda.test.enabled').load()).toEqual([])
  })
})

describe('createWebPluginBridge — wires the web platform pieces', () => {
  it('builds a bridge whose http enforces the manifest permissions over an injected transport', async () => {
    const { client } = spyTransport()
    const bridge = createWebPluginBridge(
      'connector-komga',
      { permissions: { network: ['https://komga.example'] } },
      { baseHttp: client },
    )
    await expect(bridge.http.send({ url: 'https://komga.example/x' })).resolves.toBeDefined()
    await expect(bridge.http.send({ url: 'https://evil.example/x' })).rejects.toBeInstanceOf(
      PluginPermissionError,
    )
  })
})
