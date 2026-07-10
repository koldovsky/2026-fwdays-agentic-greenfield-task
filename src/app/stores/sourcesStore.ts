import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import type { DetectedServer } from '@/core/dispatch'
import { createConnectorFor } from '@/app/plugins-catalog'
import { useLibraryStore } from '@/app/stores/libraryStore'

// Connected sources + on-device credentials.
//
// SECURITY — the credential boundary (load-bearing). A connected source is persisted as TWO records:
//   • a SourceRecord (`edda.sources`) — SYNCABLE metadata. It MUST NOT contain any credential.
//   • a CredentialRecord (`edda.creds.<sourceId>`) — on-device ONLY. Never synced, never exported.
// Credentials are only ever attached as auth on requests to the user's OWN server (via the connector's
// HostBridge); they are never sent to Edda or a third party, and never logged or placed in a URL.
//
// The `sourceId` is minted ONCE with crypto.randomUUID() in connect(), persisted in the SourceRecord,
// and passed to the connector — it is the same id the per-(sourceId, bookId, mediaType) progress key
// uses (core-domain-model). rehydrate() REUSES the persisted id; it is never re-minted.

const SOURCES_KEY = 'edda.sources'
const credentialsKey = (sourceId: string): string => `edda.creds.${sourceId}`

/** Persisted, SYNCABLE per-source metadata. NO credentials live here (see module note). */
export interface SourceRecord {
  sourceId: string
  connectorId: string
  baseUrl: string
  displayName: string
  /** A REFERENCE to the on-device credential record (its storage key) — never the secret itself. */
  credentialRef: string
  kind: string
  connectedAt: number
}

/** On-device-only credentials, keyed by sourceId. Excluded from every syncable/exportable payload. */
export interface CredentialRecord {
  username: string
  password: string
}

/** The sidebar Sources-region view model (doc/web/01). */
export interface SourceRow {
  sourceId: string
  name: string
  descriptor: string
}

const FRIENDLY_KIND_NAMES: Readonly<Record<string, string>> = {
  komga: 'Komga server',
  opds: 'OPDS feed',
}

function prettyHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  }
}

function defaultDisplayName(detected: DetectedServer): string {
  return FRIENDLY_KIND_NAMES[detected.kind] ?? `${detected.kind} server`
}

// --- on-device persistence (web localStorage; guarded so a blocked store degrades, not throws) -----

function readSourceRecords(): SourceRecord[] {
  try {
    const raw = localStorage.getItem(SOURCES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SourceRecord[]) : []
  } catch {
    return []
  }
}

function writeSourceRecords(records: readonly SourceRecord[]): void {
  try {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(records))
  } catch {
    // origin storage unavailable/full — the source stays in-memory for this session.
  }
}

function writeCredentials(sourceId: string, credentials: CredentialRecord): void {
  try {
    localStorage.setItem(credentialsKey(sourceId), JSON.stringify(credentials))
  } catch {
    // see writeSourceRecords
  }
}

function readCredentials(sourceId: string): CredentialRecord | null {
  try {
    const raw = localStorage.getItem(credentialsKey(sourceId))
    return raw ? (JSON.parse(raw) as CredentialRecord) : null
  } catch {
    return null
  }
}

export const useSourcesStore = defineStore('sources', () => {
  /** Connected sources, surfaced in the sidebar Sources region. */
  const sources = ref<SourceRow[]>([])

  function toRow(record: SourceRecord): SourceRow {
    return {
      sourceId: record.sourceId,
      name: record.displayName,
      descriptor: `${record.kind} · ${prettyHost(record.baseUrl)}`,
    }
  }

  /**
   * Connect a detected source: mint the sourceId, persist the SOURCE record (no secrets) and the
   * CREDENTIAL record (separate key) on-device, build the live connector with the user's config, and
   * make it the active Library connector (markRaw — Vue reactivity must never walk the connector's
   * internals). Returns the persisted SourceRecord.
   */
  async function connect(params: {
    detected: DetectedServer
    baseUrl: string
    username: string
    password: string
    displayName?: string
  }): Promise<SourceRecord> {
    const { detected, baseUrl, username, password } = params
    const sourceId = crypto.randomUUID()

    const record: SourceRecord = {
      sourceId,
      connectorId: detected.connectorId,
      baseUrl,
      displayName: params.displayName?.trim() || defaultDisplayName(detected),
      credentialRef: credentialsKey(sourceId),
      kind: detected.kind,
      connectedAt: Date.now(),
    }

    // Persist secrets SEPARATELY from the syncable source record, then the record (no secrets).
    writeCredentials(sourceId, { username, password })
    writeSourceRecords([...readSourceRecords(), record])
    sources.value = [...sources.value, toRow(record)]

    const connector = await createConnectorFor(detected.connectorId, {
      baseUrl,
      sourceId,
      username,
      password,
    })
    useLibraryStore().setConnector(markRaw(connector))
    return record
  }

  /**
   * Restore persisted sources on startup and rebuild the most recently connected one as the live
   * Library connector (reusing its stored credentials and its ORIGINAL sourceId — never re-minted).
   * No persisted sources → leaves the Library connector untouched (main.ts keeps the fixture).
   */
  async function rehydrate(): Promise<void> {
    const records = readSourceRecords()
    sources.value = records.map(toRow)
    if (records.length === 0) return

    const latest = records.reduce((newest, candidate) =>
      candidate.connectedAt > newest.connectedAt ? candidate : newest,
    )
    const credentials = readCredentials(latest.sourceId)
    const connector = await createConnectorFor(latest.connectorId, {
      baseUrl: latest.baseUrl,
      sourceId: latest.sourceId,
      username: credentials?.username,
      password: credentials?.password,
    })
    useLibraryStore().setConnector(markRaw(connector))
  }

  return { sources, connect, rehydrate }
})
