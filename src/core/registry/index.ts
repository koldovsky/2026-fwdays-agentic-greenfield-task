// Plugin Registry: a static catalogue of first-party plugins (manifest + lazy `import()` loader),
// TWO PERSISTED id sets — installed and enabled — lazy chunk loading on first use, three-state
// resolution, and a host-API semver gate. "Install" = dynamic-import a bundled chunk + persist the
// choice — never remote code (ADR-010, DESIGN-CONNECTORS.md §6.2/§6.4/§12). Platform-neutral:
// persistence is an injected port.
//
// A plugin has THREE distinct states, not two: never installed (`available()`), installed+enabled
// (`installed()` + `isEnabled()` true), or installed+disabled (`installed()` + `isEnabled()` false).
// `disable()` is reversible and never uninstalls — a plugin that was installed stays in `installed()`
// forever (until this registry instance is gone), even while disabled. Only `enable`/`disable` move a
// plugin between the two installed sub-states; only `install()` moves it from never-installed to
// installed. There is no UI-exposed "uninstall".

import type {
  Connector,
  FormatCapabilities,
  FormatHandler,
  PluginKind,
  PluginLoader,
  PluginManifest,
  Resolution,
} from '@/core/contracts'
import { HOST_API_VERSION } from '@/core/contracts'
import type { MediaType } from '@/core/model'

/** A catalogue row: a plugin's manifest paired with the lazy loader that resolves its instance. */
export interface CatalogEntry<T> {
  manifest: PluginManifest
  loader: PluginLoader<T>
}

/**
 * The persistence port for a plugin-id SET (not the chunks) — generic enough to back either the
 * enabled-id set or the installed-id set; the registry holds one instance of each (same shape,
 * different backing key). Web binds it to localStorage; the native client binds it to its own
 * settings store. Kept sync (the web backing is synchronous) so `enable`/`disable` stay simple; chunk
 * loading is the async part.
 */
export interface EnabledSetStore {
  load(): readonly string[]
  save(ids: readonly string[]): void
}

/** Default in-process persistence — platform-neutral; the app injects a durable one. */
export class InMemoryEnabledSetStore implements EnabledSetStore {
  #ids: readonly string[] = []
  load(): readonly string[] {
    return this.#ids
  }
  save(ids: readonly string[]): void {
    this.#ids = [...ids]
  }
}

/** A plugin whose declared `hostApi` range does not satisfy the running host API version. */
export class PluginIncompatibleError extends Error {
  constructor(
    readonly pluginId: string,
    readonly required: string,
    readonly hostVersion: string,
  ) {
    super(
      `Plugin "${pluginId}" targets host API "${required}", which is incompatible with the running ` +
        `host API ${hostVersion}.`,
    )
    this.name = 'PluginIncompatibleError'
  }
}

/** No plugin with the given id exists in the catalogue. */
export class PluginNotFoundError extends Error {
  constructor(readonly pluginId: string) {
    super(`No plugin registered with id "${pluginId}".`)
    this.name = 'PluginNotFoundError'
  }
}

/**
 * A bundled, always-on plugin cannot be disabled. This is the LOAD-BEARING source of truth, not just a
 * UI affordance: EPUB (and the bundled connectors) must always resolve, or `resolveFormat(EPUB)` would
 * silently flip to `installable` and the reader would break. The registry refuses the operation; the
 * Extensions screen reflects it by rendering bundled toggles non-interactive.
 */
export class PluginNotDisableableError extends Error {
  constructor(readonly pluginId: string) {
    super(`Plugin "${pluginId}" is bundled and always-on; it cannot be disabled.`)
    this.name = 'PluginNotDisableableError'
  }
}

type Triple = [number, number, number]

function parseVersion(raw: string): Triple {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(raw.trim())
  if (!match) throw new Error(`Invalid semver: "${raw}"`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function compare(a: Triple, b: Triple): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/**
 * Minimal semver-range satisfaction for the host-API gate: caret (`^`), tilde (`~`), comparators
 * (`>= > <= < =`), exact, and `*`/empty (any). Sufficient for first-party manifests; intentionally not
 * a full range grammar (no `||`/hyphen ranges) until plugins need it.
 */
export function satisfiesHostApi(range: string, version: string = HOST_API_VERSION): boolean {
  const spec = range.trim()
  if (spec === '' || spec === '*' || spec === 'x') return true
  const v = parseVersion(version)

  if (spec.startsWith('^')) {
    const base = parseVersion(spec.slice(1))
    if (compare(v, base) < 0) return false
    if (base[0] > 0) return v[0] === base[0]
    if (base[1] > 0) return v[0] === 0 && v[1] === base[1]
    return v[0] === 0 && v[1] === 0 && v[2] === base[2]
  }
  if (spec.startsWith('~')) {
    const base = parseVersion(spec.slice(1))
    return compare(v, base) >= 0 && v[0] === base[0] && v[1] === base[1]
  }
  const comparator = /^(>=|<=|>|<|=)?\s*(\d+\.\d+\.\d+)$/.exec(spec)
  if (comparator) {
    const base = parseVersion(comparator[2] ?? '')
    const c = compare(v, base)
    switch (comparator[1] ?? '=') {
      case '>=':
        return c >= 0
      case '<=':
        return c <= 0
      case '>':
        return c > 0
      case '<':
        return c < 0
      default:
        return c === 0
    }
  }
  return false
}

function isFormatCapabilities(
  capabilities: PluginManifest['capabilities'],
): capabilities is FormatCapabilities {
  return Array.isArray((capabilities as FormatCapabilities).mediaTypes)
}

export class PluginRegistry {
  readonly #connectors = new Map<string, CatalogEntry<Connector>>()
  readonly #formats = new Map<string, CatalogEntry<FormatHandler>>()
  /** Cached instance PROMISES — a loader runs at most once (first use), even under concurrency. */
  readonly #connectorInstances = new Map<string, Promise<Connector>>()
  readonly #formatInstances = new Map<string, Promise<FormatHandler>>()
  readonly #enabled = new Set<string>()
  /** Installed-ever ids — a SUPERSET of `#enabled`. Disabling never removes an id from here. */
  readonly #installed = new Set<string>()
  readonly #enabledStore: EnabledSetStore
  /** Same generic id-set port as `enabledStore`, bound to a different key by the caller. */
  readonly #installedStore: EnabledSetStore

  constructor(options: { enabledStore?: EnabledSetStore; installedStore?: EnabledSetStore } = {}) {
    this.#enabledStore = options.enabledStore ?? new InMemoryEnabledSetStore()
    this.#installedStore = options.installedStore ?? new InMemoryEnabledSetStore()
  }

  /** Register a connector's manifest + lazy loader. Does NOT invoke the loader. */
  registerConnector(entry: CatalogEntry<Connector>): void {
    this.#connectors.set(entry.manifest.id, entry)
  }

  /** Register a format's manifest + lazy loader. Does NOT invoke the loader. */
  registerFormat(entry: CatalogEntry<FormatHandler>): void {
    this.#formats.set(entry.manifest.id, entry)
  }

  /**
   * Manifests of INSTALLED plugins, optionally filtered by kind — enabled AND disabled-but-installed
   * both belong here. This is the Extensions screen's "Installed" list: a plugin the user disabled
   * stays put, rendered with its toggle off, never bounced back down to `available()`.
   */
  installed(kind?: PluginKind): PluginManifest[] {
    return this.#manifests((id) => this.#installed.has(id), kind)
  }

  /** Manifests of catalogue plugins that are NOT installed — the install-on-demand suggestions. */
  available(kind?: PluginKind): PluginManifest[] {
    return this.#manifests((id) => !this.#installed.has(id), kind)
  }

  isEnabled(id: string): boolean {
    return this.#enabled.has(id)
  }

  /** Whether a plugin has ever been installed (enabled or disabled) — the counterpart to `isEnabled`. */
  isInstalled(id: string): boolean {
    return this.#installed.has(id)
  }

  /**
   * Mark a plugin enabled and persist both sets. Refuses an out-of-range plugin (semver gate).
   * Enabling always implies installed — there is no enabled-but-not-installed state — so this also
   * marks the plugin installed (a no-op if `install()` already did).
   */
  enable(id: string): void {
    const entry = this.#entry(id)
    if (!entry) throw new PluginNotFoundError(id)
    this.#assertCompatible(entry.manifest)
    this.#enabled.add(id)
    this.#installed.add(id)
    this.#persistEnabled()
    this.#persistInstalled()
  }

  /**
   * Disable an installed plugin so dispatch no longer resolves to it. REFUSES a bundled plugin
   * ({@link PluginNotDisableableError}) — bundled plugins are always-on by contract, so the EPUB reader
   * and the OPDS fallback can never be stranded. Disabling a non-bundled plugin is reversible and never
   * deletes the plugin or its data: it stays in `installed()` (unchanged) and drops only out of the
   * ENABLED set, so it renders in the Installed list with its toggle off — never back under Available.
   */
  disable(id: string): void {
    const entry = this.#entry(id)
    if (entry?.manifest.bundled) throw new PluginNotDisableableError(id)
    if (this.#enabled.delete(id)) this.#persistEnabled()
  }

  /** Whether a plugin is a bundled, always-on (non-disableable) first-party plugin. */
  isBundled(id: string): boolean {
    return this.#entry(id)?.manifest.bundled === true
  }

  /**
   * Install/enable a plugin: gate on the host-API range, dynamic-import its bundled chunk (cached, so
   * the loader runs once), then persist it as both installed and enabled (via `enable`). No remote
   * code is ever fetched (ADR-010).
   */
  async install(id: string): Promise<void> {
    const entry = this.#entry(id)
    if (!entry) throw new PluginNotFoundError(id)
    this.#assertCompatible(entry.manifest)
    if (this.#connectors.has(id)) await this.#loadConnector(id)
    else await this.#loadFormat(id)
    this.enable(id)
  }

  /** Restore the persisted installed + enabled sets WITHOUT loading any chunk (lazy hydration). */
  rehydrate(): void {
    this.#enabled.clear()
    this.#installed.clear()
    for (const id of this.#installedStore.load()) {
      if (this.#entry(id)) this.#installed.add(id)
    }
    for (const id of this.#enabledStore.load()) {
      if (!this.#entry(id)) continue
      this.#enabled.add(id)
      // Migration: a persisted store written before the installed/enabled split only ever recorded
      // "enabled" ids. Treat any such id as installed too, so an upgrade never drops a plugin a user
      // had already installed back down to Available.
      this.#installed.add(id)
    }
  }

  /** Resolve a connector by id to ready | installable | unsupported (DESIGN-CONNECTORS.md §6.2). */
  async resolveConnector(id: string): Promise<Resolution<Connector>> {
    const entry = this.#connectors.get(id)
    if (!entry) return { status: 'unsupported' }
    if (!this.#enabled.has(id)) return { status: 'installable', suggestion: entry.manifest }
    return { status: 'ready', instance: await this.#loadConnector(id) }
  }

  /** Resolve a format by media type to ready | installable | unsupported. */
  async resolveFormat(mediaType: MediaType): Promise<Resolution<FormatHandler>> {
    const entry = [...this.#formats.values()].find((candidate) => {
      const { capabilities } = candidate.manifest
      return isFormatCapabilities(capabilities) && capabilities.mediaTypes.includes(mediaType)
    })
    if (!entry) return { status: 'unsupported' }
    if (!this.#enabled.has(entry.manifest.id)) {
      return { status: 'installable', suggestion: entry.manifest }
    }
    return { status: 'ready', instance: await this.#loadFormat(entry.manifest.id) }
  }

  #entry(id: string): CatalogEntry<Connector> | CatalogEntry<FormatHandler> | undefined {
    return this.#connectors.get(id) ?? this.#formats.get(id)
  }

  #manifests(predicate: (id: string) => boolean, kind?: PluginKind): PluginManifest[] {
    const entries = [...this.#connectors.values(), ...this.#formats.values()]
    return entries
      .map((entry) => entry.manifest)
      .filter(
        (manifest) => predicate(manifest.id) && (kind === undefined || manifest.kind === kind),
      )
  }

  #assertCompatible(manifest: PluginManifest): void {
    if (!satisfiesHostApi(manifest.hostApi)) {
      throw new PluginIncompatibleError(manifest.id, manifest.hostApi, HOST_API_VERSION)
    }
  }

  #loadConnector(id: string): Promise<Connector> {
    let pending = this.#connectorInstances.get(id)
    if (!pending) {
      const entry = this.#connectors.get(id)
      if (!entry) throw new PluginNotFoundError(id)
      this.#assertCompatible(entry.manifest)
      pending = entry.loader()
      this.#connectorInstances.set(id, pending)
    }
    return pending
  }

  #loadFormat(id: string): Promise<FormatHandler> {
    let pending = this.#formatInstances.get(id)
    if (!pending) {
      const entry = this.#formats.get(id)
      if (!entry) throw new PluginNotFoundError(id)
      this.#assertCompatible(entry.manifest)
      pending = entry.loader()
      this.#formatInstances.set(id, pending)
    }
    return pending
  }

  #persistEnabled(): void {
    this.#enabledStore.save([...this.#enabled])
  }

  #persistInstalled(): void {
    this.#installedStore.save([...this.#installed])
  }
}
