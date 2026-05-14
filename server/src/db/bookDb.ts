import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { text, sqliteTable } from 'drizzle-orm/sqlite-core'
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

export function getBookDb(bookId: number): BookDb {
  let db = cache.get(bookId)
  if (!db) {
    db = openBookDb(bookId)
    cache.set(bookId, db)
  }
  return db
}
