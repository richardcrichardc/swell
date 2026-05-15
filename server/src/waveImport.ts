import { eq, and } from 'drizzle-orm'
import { type BookDb, account } from './db/bookDb'
import { AccountGroup } from './accounts'

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(field)
        field = ''
      } else {
        field += ch
      }
    }
  }
  fields.push(field)
  return fields
}

export function validateWaveCsv(csvContent: string): void {
  const lines = csvContent.split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCsvLine(line)
    const group = cols[20]?.trim() ?? ''
    if (group && !(Object.values(AccountGroup) as string[]).includes(group)) {
      throw new Error(`Invalid account group "${group}" on row ${i + 1}`)
    }
  }
}

export function importWaveCsv(db: BookDb, csvContent: string): void {
  const lines = csvContent.split(/\r?\n/)

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCsvLine(line)
    const name = cols[2]?.trim() ?? ''
    const group = cols[20]?.trim() ?? ''
    const type = cols[21]?.trim() ?? ''

    if (!name) continue

    const existing = db.select().from(account)
      .where(and(eq(account.name, name), eq(account.group, group), eq(account.type, type)))
      .get()

    if (!existing) {
      db.insert(account).values({ name, group, type }).run()
    }
  }
}
