import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import * as schema from './schema'

mkdirSync('./server/data', { recursive: true })

const sqlite = new Database('./server/data/swell.db')

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

const __dirname = dirname(fileURLToPath(import.meta.url))
migrate(db, { migrationsFolder: join(__dirname, '../../drizzle') })
