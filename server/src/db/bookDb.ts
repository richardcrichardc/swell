import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { text, sqliteTable } from 'drizzle-orm/sqlite-core'
import { eq } from 'drizzle-orm'
import { mkdirSync } from 'fs'

export const kvp = sqliteTable('kvp', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

const bookSchema = { kvp }
export type BookDb = ReturnType<typeof openBookDb>

const cache = new Map<number, BookDb>()

function openBookDb(bookId: number) {
  mkdirSync('./data/books', { recursive: true })
  const sqlite = new Database(`./data/books/book${bookId}.db`)
  sqlite.pragma('journal_mode = WAL')
  sqlite.exec('CREATE TABLE IF NOT EXISTS kvp (key text PRIMARY KEY NOT NULL, value text NOT NULL)')
  return drizzle(sqlite, { schema: bookSchema })
}

export function getKvp(db: BookDb, key: string): string | null
export function getKvp(db: BookDb, key: string, defaultValue: string): string
export function getKvp(db: BookDb, key: string, defaultValue?: string): string | null {
  const row = db.select().from(kvp).where(eq(kvp.key, key)).get()
  return row?.value ?? defaultValue ?? null
}

export function setKvp(db: BookDb, key: string, value: string): void {
  db.insert(kvp).values({ key, value }).onConflictDoUpdate({ target: kvp.key, set: { value } }).run()
}

export function getBookDb(bookId: number): BookDb {
  let db = cache.get(bookId)
  if (!db) {
    db = openBookDb(bookId)
    cache.set(bookId, db)
  }
  return db
}
