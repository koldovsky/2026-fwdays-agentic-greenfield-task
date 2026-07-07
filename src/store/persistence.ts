import { openDB, type IDBPDatabase } from 'idb'
import type { ImportTable, RawRow } from '../../lib/import/index.ts'
import { IMPORT_TABLES } from '../../lib/import/index.ts'

/**
 * 4.2 — Персистентність сеансу в IndexedDB через `idb` (NFR-SAVE-01).
 * Зберігаються сирі рядки кожної таблиці; дати переживають structured clone.
 */

const DB_NAME = 'aps-session'
const STORE = 'tables'
const VERSION = 1

export type SessionTables = Partial<Record<ImportTable, RawRow[]>>

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      },
    })
  }
  return dbPromise
}

/** Зберегти сирі рядки однієї таблиці. */
export async function saveTable(table: ImportTable, rows: RawRow[]): Promise<void> {
  const db = await getDb()
  await db.put(STORE, rows, table)
}

/** Відновити всі таблиці сеансу. */
export async function loadSession(): Promise<SessionTables> {
  const db = await getDb()
  const out: SessionTables = {}
  for (const { table } of IMPORT_TABLES) {
    const rows = (await db.get(STORE, table)) as RawRow[] | undefined
    if (rows && rows.length > 0) out[table] = rows
  }
  return out
}

/** Очистити збережений сеанс. */
export async function clearSession(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE)
}
