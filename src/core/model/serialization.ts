// Versioned, platform-neutral JSON serialization for the domain model. The serialized envelope is
// the artifact the future native (Kotlin) client reads/writes identically — conformance tests assert
// round-trip stability and the explicit schemaVersion. Only JSON-native values cross the boundary
// (no Date, no functions, no DOM nodes, no network handles), so the shape is portable.

import type { LibraryBrowseEntry, Locator, Publication } from '@/core/model'

/** Bump on any incompatible shape change — and ship a migration. Today's conformance baseline. */
export const SCHEMA_VERSION = 1 as const

export type SerializedType = 'Locator' | 'Publication' | 'LibraryBrowseEntry'

/** The wire envelope: an explicit version + a type tag + the JSON-native payload. */
export interface SerializedEnvelope<T> {
  schemaVersion: number
  type: SerializedType
  payload: T
}

/** Thrown on malformed JSON, a non-Edda envelope, an unknown schema version, or a type mismatch. */
export class SerializationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SerializationError'
  }
}

function serialize<T>(type: SerializedType, payload: T): string {
  const envelope: SerializedEnvelope<T> = { schemaVersion: SCHEMA_VERSION, type, payload }
  return JSON.stringify(envelope)
}

function isEnvelope(value: unknown): value is SerializedEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    'type' in value &&
    'payload' in value
  )
}

function parse<T>(json: string, expected: SerializedType): T {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new SerializationError('payload is not valid JSON')
  }
  if (!isEnvelope(value)) {
    throw new SerializationError('payload is not an Edda serialization envelope')
  }
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new SerializationError(
      `unsupported schemaVersion ${String(value.schemaVersion)} (expected ${SCHEMA_VERSION})`,
    )
  }
  if (value.type !== expected) {
    throw new SerializationError(`expected a ${expected} envelope but got ${String(value.type)}`)
  }
  return value.payload as T
}

export function serializeLocator(locator: Locator): string {
  return serialize('Locator', locator)
}

export function parseLocator(json: string): Locator {
  return parse<Locator>(json, 'Locator')
}

export function serializePublication(publication: Publication): string {
  return serialize('Publication', publication)
}

export function parsePublication(json: string): Publication {
  return parse<Publication>(json, 'Publication')
}

export function serializeLibraryBrowseEntry(entry: LibraryBrowseEntry): string {
  return serialize('LibraryBrowseEntry', entry)
}

export function parseLibraryBrowseEntry(json: string): LibraryBrowseEntry {
  return parse<LibraryBrowseEntry>(json, 'LibraryBrowseEntry')
}
