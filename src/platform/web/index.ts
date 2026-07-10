// Web platform bindings: the ONLY layer allowed to touch fetch / OPFS / localStorage. The native
// client is a separate codebase with its own bindings; both satisfy the same core/contracts +
// core/bridge interfaces. Plugins never import this — they receive a HostBridge assembled here.

import type {
  HostBridge,
  HttpClient,
  HttpRequest,
  HttpResponse,
  KeyValueStore,
  Logger,
  PluginManifest,
  PluginPermissions,
} from '@/core/contracts'
import { createPluginBridge, type PluginBridgeFactories } from '@/core/bridge'
import type { EnabledSetStore } from '@/core/registry'
import { originAllowed } from './origin-allowlist'

// The web format-handler surface (carries HTMLElement) + the web navigator extension + the type guard.
export { type WebFormatHandler, type WebNavigator, isWebFormatHandler } from './web-format-handler'

// --- Offline storage + sync (add-offline-and-sync) -------------------------------------------------
// Web-bound publication sources (File/stream), the Dexie structured store, the OPFS byte cache, and the
// Dexie-backed sync engine + scheduler. All carry web types (Dexie/OPFS/`navigator.onLine`/`window`), so
// they live HERE — `core/sync`/`core/contracts` own only the neutral outbox model + furthest-wins policy.
export { publicationSourceFromFile, publicationSourceFromStream } from './publication-source'
export {
  EddaDb,
  isOfflineAvailable,
  keyTuple,
  opfsKeyFor,
  type DownloadRecord,
  type DownloadState,
  type OutboxRecord,
} from './db'
export {
  OpfsBookCache,
  OpfsSyncWriter,
  type OpfsWriteHandle,
  type OpfsDirectory,
} from './opfs-book-cache'
export { DexieSyncEngine } from './sync-engine'
export { scheduleDrains, type DrainScheduler, type ScheduleDrainsOptions } from './sync-scheduler'
export { connectorDownloadStream, type StreamingConnector } from './connector-download'

export class FetchHttpClient implements HttpClient {
  async send(request: HttpRequest): Promise<HttpResponse> {
    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers: request.headers,
      // contracts keep body platform-neutral (Uint8Array | string); widen to BodyInit here.
      body: request.body as BodyInit | undefined,
    })
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    return {
      status: response.status,
      headers,
      bytes: async () => new Uint8Array(await response.arrayBuffer()),
      text: () => response.text(),
    }
  }
}

/** A request to an origin the plugin did not declare in `permissions.network`. */
export class PluginPermissionError extends Error {
  constructor(
    readonly url: string,
    readonly allowed: PluginPermissions['network'],
  ) {
    super(
      `Blocked request to "${url}": its origin is not in the plugin's declared network permissions ` +
        `(${Array.isArray(allowed) ? allowed.join(', ') || '<none>' : (allowed ?? '<none>')}).`,
    )
    this.name = 'PluginPermissionError'
  }
}

/**
 * Enforces the plugin's declared network allowlist BEFORE any transport: an undeclared origin throws
 * (no request is made). A `'*'` permission (or `'*'` in the array) allows any origin. Wraps a base
 * transport (`FetchHttpClient` on web; a mock in tests) so the permission seam is independent of it.
 */
export class PermissionEnforcingHttpClient implements HttpClient {
  constructor(
    private readonly base: HttpClient,
    private readonly allowed: PluginPermissions['network'],
  ) {}

  async send(request: HttpRequest): Promise<HttpResponse> {
    if (!originAllowed(request.url, this.allowed)) {
      throw new PluginPermissionError(request.url, this.allowed)
    }
    return this.base.send(request)
  }
}

/**
 * Key separator for the per-plugin storage namespace. ASCII Unit Separator (0x1F) cannot
 * appear in a plugin id or a caller key, so (pluginId, key) → storageKey is injective —
 * no namespace collisions between plugins sharing the backing Map.
 */
const KEY_SEPARATOR = '\x1f'

/**
 * In-memory key/value store namespaced per plugin id over a shared backing map: keys are scoped so
 * one plugin can neither read nor write another's data. Durable OPFS persistence is offline-storage
 * (change 9); this keeps the bridge surface real and isolated today.
 */
export class InMemoryKeyValueStore implements KeyValueStore {
  constructor(
    private readonly pluginId: string,
    private readonly backing: Map<string, Uint8Array> = new Map(),
  ) {}

  #scope(key: string): string {
    return `${this.pluginId}${KEY_SEPARATOR}${key}`
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    return this.backing.get(this.#scope(key))
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.backing.set(this.#scope(key), value)
  }

  async delete(key: string): Promise<void> {
    this.backing.delete(this.#scope(key))
  }
}

/** OPFS-backed key/value store. Book bytes are streamed to OPFS and read via File.slice
 *  (range reads) — they deliberately bypass the Service Worker (ADR-005). Filled in by change 9. */
export class OpfsStore implements KeyValueStore {
  async get(_key: string): Promise<Uint8Array | undefined> {
    // TODO (offline-storage / change 9): read from OPFS.
    return undefined
  }

  async set(_key: string, _value: Uint8Array): Promise<void> {
    // TODO (offline-storage / change 9): write to OPFS.
  }

  async delete(_key: string): Promise<void> {
    // TODO (offline-storage / change 9): remove from OPFS.
  }
}

/** A console logger whose entries are attributable to the originating plugin id. */
export function createConsoleLogger(pluginId: string): Logger {
  const tag = `[plugin:${pluginId}]`
  return {
    debug: (message) => console.debug(tag, message),
    info: (message) => console.info(tag, message),
    warn: (message) => console.warn(tag, message),
    error: (message) => console.error(tag, message),
  }
}

/** localStorage-backed persistence for the registry's enabled-id set (a small JSON string array). */
export class WebEnabledSetStore implements EnabledSetStore {
  constructor(private readonly key: string = 'edda.plugins.enabled') {}

  load(): readonly string[] {
    try {
      const raw = localStorage.getItem(this.key)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : []
    } catch {
      return []
    }
  }

  save(ids: readonly string[]): void {
    localStorage.setItem(this.key, JSON.stringify([...ids]))
  }
}

/**
 * The web `PluginBridgeFactories`: every plugin's storage shares ONE process-wide backing map (scoped
 * by id, so plugins stay isolated), HTTP is `fetch` behind permission enforcement, and logs are
 * attributed. A test may inject its own `baseHttp` (e.g. a mock transport) without touching the seam.
 */
export function createWebBridgeFactories(
  options: { baseHttp?: HttpClient } = {},
): PluginBridgeFactories {
  const baseHttp = options.baseHttp ?? new FetchHttpClient()
  const storageBacking = new Map<string, Uint8Array>()
  return {
    http: (network) => new PermissionEnforcingHttpClient(baseHttp, network),
    storage: (pluginId) => new InMemoryKeyValueStore(pluginId, storageBacking),
    logger: (pluginId) => createConsoleLogger(pluginId),
  }
}

/** Assemble a web `HostBridge` for one plugin from its manifest (the surface it is handed). */
export function createWebPluginBridge(
  pluginId: string,
  manifest: Pick<PluginManifest, 'permissions'>,
  options: { baseHttp?: HttpClient } = {},
): HostBridge {
  return createPluginBridge(pluginId, manifest, createWebBridgeFactories(options))
}
