// HostBridge composition. The interface lives in core/contracts; the concrete parts
// (fetch HttpClient, namespaced storage, console logger) are supplied by platform/web at app
// composition time — core never imports them, keeping this layer platform-neutral. The native
// client provides its own factories satisfying the same contract.

import type {
  HostBridge,
  HttpClient,
  KeyValueStore,
  Logger,
  PluginManifest,
  PluginPermissions,
} from '@/core/contracts'

export function createHostBridge(parts: {
  http: HttpClient
  storage: KeyValueStore
  logger: Logger
}): HostBridge {
  return { http: parts.http, storage: parts.storage, logger: parts.logger }
}

/**
 * Platform-supplied builders for the three bridge sub-surfaces. The web platform binds these to
 * `fetch` + permission enforcement, an in-memory/OPFS store, and a console logger; a native platform
 * binds them to its own transport + filesystem. Injected (never imported by core) so this assembler
 * stays platform-neutral and is trivially mockable in tests.
 */
export interface PluginBridgeFactories {
  /** Build the plugin's HTTP client, scoped to its declared network allowlist (which it enforces). */
  http(network: PluginPermissions['network']): HttpClient
  /** Build the plugin's storage, namespaced to its id (no access to another plugin's keys). */
  storage(pluginId: string): KeyValueStore
  /** Build the plugin's logger, attributing entries to its id. */
  logger(pluginId: string): Logger
}

/**
 * Assemble the per-plugin `HostBridge`: the ONLY surface a plugin touches. Threads the manifest's
 * declared network permissions into the http client and namespaces storage/logging to the plugin id.
 */
export function createPluginBridge(
  pluginId: string,
  manifest: Pick<PluginManifest, 'permissions'>,
  factories: PluginBridgeFactories,
): HostBridge {
  return createHostBridge({
    http: factories.http(manifest.permissions?.network),
    storage: factories.storage(pluginId),
    logger: factories.logger(pluginId),
  })
}
