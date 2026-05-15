import { eq, and } from 'drizzle-orm'
import { type BookDb, account, transaction } from './db/bookDb'
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
  const waveTransactionIds = new Map<string, number>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCsvLine(line)

    const accountName = cols[2]?.trim() ?? ''
    const accountGroup = cols[20]?.trim() ?? ''
    const accountType = cols[21]?.trim() ?? ''

    if (accountName) {
      const existing = db.select().from(account)
        .where(and(eq(account.name, accountName), eq(account.group, accountGroup), eq(account.type, accountType)))
        .get()
      if (!existing) {
        db.insert(account).values({ name: accountName, group: accountGroup, type: accountType }).run()
      }
    }

    const waveId = cols[0]?.trim() ?? ''
    if (waveId && !waveTransactionIds.has(waveId)) {
      const date = cols[1]?.trim() ?? ''
      const description = cols[3]?.trim() ?? ''
      const row = db.insert(transaction).values({ date, description }).returning().get()
      waveTransactionIds.set(waveId, row.id)
    }
  }
}
