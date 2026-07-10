## Purpose

The `PluginRegistry` is a static, first-party catalogue of bundled plugins (connectors and format
handlers). It holds each plugin's manifest alongside a lazy dynamic-`import()` loader, maintains a
persisted enabled-id set (rehydrated on startup without loading chunks), and resolves a connector or
format to one of three states: `ready` (enabled + loaded), `installable` (known but not enabled), or
`unsupported` (no match). A host-API semver gate refuses any plugin whose declared `hostApi` range does
not satisfy the running `HOST_API_VERSION` (currently `1.2.0`; bundled manifests declare `^1.0.0` and
satisfy it). "Install" means dynamic-importing a bundled first-party chunk and persisting the choice —
no remote code is ever fetched or executed (ADR-010). Bundled plugins are always-on and cannot be
disabled by contract (`disable()` throws `PluginNotDisableableError` for bundled plugins), ensuring that
`resolveFormat(EPUB)` and the OPDS fallback never silently flip to `installable`.

## Requirements

### Requirement: Lazy loader registration (the Factory)

The registry SHALL register a connector or format under an id together with a loader that resolves the
plugin via a dynamic `import()`. Registration SHALL NOT execute the loader; the plugin chunk SHALL load
only on first use, not at registration or at boot.

#### Scenario: Registering a loader does not load its chunk

- **WHEN** a connector or format is registered with a dynamic-`import()` loader
- **THEN** the loader is not invoked and the plugin chunk is not loaded as a result of registration

#### Scenario: The chunk loads on first use

- **WHEN** the registered plugin is resolved/loaded for the first time
- **THEN** its loader runs and the chunk is dynamically imported
- **AND** the registry yields the loaded plugin instance

### Requirement: Persisted, lazily-hydrated enabled set

The set of enabled plugin ids SHALL be persisted and rehydrated on startup. Rehydration SHALL restore
which plugins are enabled without eagerly loading their chunks.

#### Scenario: Enabling a plugin persists its id

- **WHEN** a plugin is enabled
- **THEN** its id is added to the persisted enabled set

#### Scenario: Restart restores the enabled set without loading chunks

- **WHEN** the app restarts and the registry rehydrates
- **THEN** the previously enabled plugin ids are restored as enabled
- **AND** their chunks remain unloaded until each plugin's first use

### Requirement: Three-state resolution

Resolving a connector for a probe result, or a format for a sniff input, SHALL return exactly one of:
`ready` (an enabled, loaded instance), `installable` (a known catalogue plugin that is not enabled, with
its manifest as the suggestion), or `unsupported` (nothing in the catalogue matches).

#### Scenario: An enabled matching plugin resolves to ready

- **WHEN** a probe/sniff matches a plugin that is enabled
- **THEN** resolution returns `ready` with the loaded plugin instance

#### Scenario: A catalogue-only match resolves to installable

- **WHEN** a probe/sniff matches a plugin that exists in the available catalogue but is not enabled
- **THEN** resolution returns `installable`
- **AND** it carries that plugin's manifest as the suggestion to install

#### Scenario: No match resolves to unsupported

- **WHEN** a probe/sniff matches no plugin in either the enabled set or the catalogue
- **THEN** resolution returns `unsupported`

### Requirement: Host-API compatibility gate

Each plugin manifest SHALL declare a `hostApi` semver range. The registry SHALL refuse to load or enable
a plugin whose range does not satisfy the running host API version, reporting a clear, human-readable
reason. A plugin whose declared range is satisfied SHALL load normally.

#### Scenario: An in-range plugin loads

- **WHEN** a plugin whose `hostApi` range satisfies the running host API version is loaded/enabled
- **THEN** the registry loads it normally

#### Scenario: An out-of-range plugin is refused with a clear message

- **WHEN** a plugin whose `hostApi` range does not satisfy the running host API version is loaded/enabled
- **THEN** the registry refuses it and reports a clear reason naming the version incompatibility
- **AND** the plugin is not loaded

### Requirement: Install is a first-party dynamic import

Installing/enabling a plugin SHALL load a bundled first-party chunk via dynamic `import()` and persist
the choice. It SHALL NOT download or execute code from a remote source.

#### Scenario: Install imports a bundled chunk and persists the choice

- **WHEN** a plugin is installed/enabled
- **THEN** the registry dynamic-imports its bundled chunk, registers the instance, and marks it enabled
- **AND** the enabled choice is persisted

#### Scenario: Install never fetches remote code

- **WHEN** a plugin is installed/enabled
- **THEN** no code is fetched from or executed out of a remote source (first-party chunks only)

### Requirement: Bundled plugins are always-on and non-disableable

Bundled plugins (those with `manifest.bundled === true`) SHALL be treated as always-on by the registry.
`disable()` SHALL throw `PluginNotDisableableError` for any bundled plugin. This is the load-bearing
source of truth — not just a UI affordance: if bundled plugins could be disabled, `resolveFormat(EPUB)`
would silently return `installable`, stranding the reader. The Extensions screen reflects this by
rendering bundled toggles non-interactive.

#### Scenario: Disabling a bundled plugin throws

- **WHEN** `disable()` is called for a bundled plugin (e.g. `format.epub`, `connector.opds`,
  `connector.komga`)
- **THEN** the registry throws `PluginNotDisableableError` naming the plugin
- **AND** the plugin remains enabled and the registry state is unchanged

#### Scenario: Disabling a non-bundled plugin succeeds

- **WHEN** `disable()` is called for a non-bundled, installed plugin (e.g. `format.pdf`)
- **THEN** the registry marks it disabled (removed from the enabled set) and the capability dispatcher
  no longer resolves resources to it; the plugin's data is not deleted
