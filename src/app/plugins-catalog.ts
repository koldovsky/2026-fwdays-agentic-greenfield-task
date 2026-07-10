// First-party plugin catalogue (app wiring). The concrete dynamic-`import()` loaders that reference
// plugin chunks live HERE, in app/ — NOT in core/registry — because core must never depend on
// plugins (the import-x boundary). The registry stays generic; this binds manifests to lazy loaders.
// "Install" = dynamic-import a bundled chunk (ADR-010); no remote code is ever fetched.

import type { Connector, FormatHandler, HostBridge, PluginManifest } from '@/core/contracts'
import type { CatalogEntry, PluginRegistry } from '@/core/registry'
import type { ProbeEntry } from '@/core/dispatch'
import { createWebPluginBridge } from '@/platform/web'
import {
  KOMGA_CAPABILITIES,
  KOMGA_CONNECTOR_ID,
  komgaProbe,
  type KomgaConfig,
} from '@/plugins/connectors/komga'
import { OPDS_CAPABILITIES, OPDS_CONNECTOR_ID, opdsProbe } from '@/plugins/connectors/opds'
import { EPUB_MANIFEST, loadEpubFormat } from '@/plugins/formats/epub/manifest'
import { PDF_MANIFEST, loadPdfFormat } from '@/plugins/formats/pdf/manifest'

// Re-export so the registry wiring (app-registry.ts) enables EPUB by id without re-declaring it, and so
// the dispatch/Extensions flows reference the PDF catalog row by manifest.
export { EPUB_MANIFEST, PDF_MANIFEST }

/** Manifest for the Komga REST connector — bundled, host-API `^1.0.0`, any-origin network (the user
 *  configures the server URL, so the allowlist is `*`; CORS is the host's concern, not the plugin's). */
export const KOMGA_MANIFEST: PluginManifest = {
  id: KOMGA_CONNECTOR_ID,
  name: 'Komga',
  version: '2.1.0',
  kind: 'connector',
  hostApi: '^1.0.0',
  bundled: true,
  permissions: { network: ['*'] },
  capabilities: KOMGA_CAPABILITIES,
  approxSizeKB: 24,
}

/** Manifest for the generic OPDS fallback connector — the always-available bundled claimant for any
 *  OPDS feed. Same any-origin network rationale as Komga. */
export const OPDS_MANIFEST: PluginManifest = {
  id: OPDS_CONNECTOR_ID,
  name: 'OPDS',
  version: '1.4.0',
  kind: 'connector',
  hostApi: '^1.0.0',
  bundled: true,
  permissions: { network: ['*'] },
  capabilities: OPDS_CAPABILITIES,
  approxSizeKB: 12,
}

const MANIFESTS_BY_ID: Readonly<Record<string, PluginManifest>> = {
  [KOMGA_CONNECTOR_ID]: KOMGA_MANIFEST,
  [OPDS_CONNECTOR_ID]: OPDS_MANIFEST,
}

/** The bundled manifest for a first-party connector id (throws on an unknown id). */
export function manifestForConnector(connectorId: string): PluginManifest {
  const manifest = MANIFESTS_BY_ID[connectorId]
  if (!manifest) throw new Error(`No bundled manifest registered for connector "${connectorId}".`)
  return manifest
}

/**
 * The bundled detection layer: each first-party connector's manifest paired with its lightweight
 * probe. Both connectors ship in the build, so both are always available to claim a pasted URL. The
 * probes are tiny (a single request) and carry no per-source config — they are NOT the heavy connector
 * chunk, which is dynamic-imported only on Connect (see {@link createConnectorFor}).
 *
 * `opdsProbe` is marked {@link ProbeEntry.fallback}: it sniffs the `Content-Type` of the pasted URL
 * ITSELF (a bare OPDS feed IS the pasted URL), whereas `komgaProbe` hits a dedicated Komga API path
 * (`/api/v1/claim`). Komga only sends `Access-Control-Allow-Origin` on `/api/**`, never on `/` — so
 * running both eagerly used to fire a doomed, CORS-less request to the pasted root on every successful
 * Komga connect (a red console error even though `komgaProbe` alone already answers detection). Marking
 * OPDS as a fallback keeps the prober from ever making that request unless nothing more specific claims
 * the URL first (see {@link serverProbe}).
 */
export function bundledProbeEntries(): ProbeEntry[] {
  return [
    { manifest: KOMGA_MANIFEST, probe: komgaProbe },
    { manifest: OPDS_MANIFEST, probe: opdsProbe, fallback: true },
  ]
}

/**
 * The probe entries the server prober treats as INSTALLED (a claim → `ready`). Komga is always
 * present (its per-source connector is built at Connect, not via a registry loader); the generic OPDS
 * fallback is gated on the registry's enabled set, so a user could disable it later (change 10).
 */
export function installedProbeEntries(registry: PluginRegistry): ProbeEntry[] {
  return bundledProbeEntries().filter(
    (entry) => entry.manifest.id === KOMGA_CONNECTOR_ID || registry.isEnabled(entry.manifest.id),
  )
}

/**
 * Build the Komga catalogue entry. The loader dynamic-imports the connector chunk on first use and
 * constructs it against the user's server config + the plugin's HostBridge — it is NOT invoked at
 * registration (kept lazy so the chunk stays out of the initial bundle).
 */
export function komgaCatalogEntry(
  config: KomgaConfig,
  bridge: HostBridge,
): CatalogEntry<Connector> {
  return {
    manifest: KOMGA_MANIFEST,
    loader: async () => {
      const { createKomgaConnector } = await import('@/plugins/connectors/komga')
      return createKomgaConnector(config, bridge)
    },
  }
}

/**
 * Build the generic OPDS catalogue entry — the always-available fallback the app registers + enables
 * at startup. The loader builds a config-less generic instance (per-source OPDS feeds are built by the
 * add-source connect flow with their own base URL).
 */
function opdsCatalogEntry(): CatalogEntry<Connector> {
  return {
    manifest: OPDS_MANIFEST,
    loader: async () => {
      const { createOpdsConnector } = await import('@/plugins/connectors/opds')
      return createOpdsConnector(
        { baseUrl: '' },
        createWebPluginBridge(OPDS_CONNECTOR_ID, OPDS_MANIFEST),
      )
    },
  }
}

/** Register the first-party connector catalogue (manifests + lazy loaders) on a registry. */
export function registerDefaultConnectors(
  registry: PluginRegistry,
  deps: { komga: KomgaConfig; bridge: HostBridge },
): void {
  registry.registerConnector(komgaCatalogEntry(deps.komga, deps.bridge))
}

/**
 * The bundled EPUB format catalogue entry. The loader is ch6's verbatim `loadEpubFormat` (a lazy
 * dynamic `import()` of the handler chunk — the heavy foliate engine stays code-split behind it).
 */
export function epubFormatCatalogEntry(): CatalogEntry<FormatHandler> {
  return { manifest: EPUB_MANIFEST, loader: loadEpubFormat }
}

/** The PDF format catalogue entry — install-on-demand; `loadPdfFormat` dynamic-imports the chunk. */
function pdfFormatCatalogEntry(): CatalogEntry<FormatHandler> {
  return { manifest: PDF_MANIFEST, loader: loadPdfFormat }
}

/**
 * Register the first-party format catalogue on a registry. EPUB is bundled (enabled at startup by
 * app-registry); PDF is the real install-on-demand format (registered AVAILABLE, not enabled).
 * Registration is loader-lazy — no chunk loads here. Only formats with a real runtime handler are
 * listed; no catalog-only stubs.
 */
export function registerDefaultFormats(registry: PluginRegistry): void {
  registry.registerFormat(epubFormatCatalogEntry())
  registry.registerFormat(pdfFormatCatalogEntry())
}

/**
 * The Komga catalogue entry for the Extensions screen: Komga is a BUNDLED connector (always installed),
 * but — unlike OPDS — it has no config-less generic instance (its per-source connector is built at
 * Connect via {@link createConnectorFor} with the user's server URL + credentials). Its registry loader
 * therefore refuses a generic load; the Extensions screen only ever reads the manifest (id/version/chips/
 * bundled), never the loader, and real opens go through the source's connector, not this entry.
 */
function komgaBundledCatalogEntry(): CatalogEntry<Connector> {
  return {
    manifest: KOMGA_MANIFEST,
    loader: () =>
      Promise.reject(
        new Error(
          'Komga connectors are built per source via "Add a source", not loaded generically.',
        ),
      ),
  }
}

/**
 * Register the connector catalogue the Extensions screen renders: OPDS + Komga, both bundled and
 * enabled by app-registry. Registration is loader-lazy. Only connectors with a real runtime handler
 * are listed — no catalog-only stubs.
 */
export function registerDefaultConnectorCatalog(registry: PluginRegistry): void {
  registry.registerConnector(opdsCatalogEntry())
  registry.registerConnector(komgaBundledCatalogEntry())
}

/**
 * Build a live, per-source connector for a detected server with the user's config. Lazy: the
 * connector chunk is dynamic-imported on Connect ("install" = import a bundled chunk, ADR-010). The
 * bridge is assembled from the connector's manifest (its declared network allowlist). Credentials are
 * passed straight to the connector as auth and are NEVER persisted in the syncable source record.
 */
export async function createConnectorFor(
  connectorId: string,
  config: { baseUrl: string; sourceId: string; username?: string; password?: string },
): Promise<Connector> {
  const bridge: HostBridge = createWebPluginBridge(connectorId, manifestForConnector(connectorId))

  if (connectorId === KOMGA_CONNECTOR_ID) {
    const { createKomgaConnector } = await import('@/plugins/connectors/komga')
    return createKomgaConnector(
      {
        baseUrl: config.baseUrl,
        email: config.username ?? '',
        password: config.password ?? '',
        sourceId: config.sourceId,
      },
      bridge,
    )
  }

  if (connectorId === OPDS_CONNECTOR_ID) {
    const { createOpdsConnector } = await import('@/plugins/connectors/opds')
    return createOpdsConnector(
      {
        baseUrl: config.baseUrl,
        sourceId: config.sourceId,
        username: config.username,
        password: config.password,
      },
      bridge,
    )
  }

  throw new Error(`No connector builder registered for "${connectorId}".`)
}
