import { eq, and } from 'drizzle-orm'
import { type BookDb, account, transaction, line } from './db/bookDb'
import { AccountType, AccountTypeSign } from '../../shared/accounts'

function parseCsvLine(csvLine: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < csvLine.length; i++) {
    const ch = csvLine[i]
    if (inQuotes) {
      if (ch === '"') {
        if (csvLine[i + 1] === '"') {
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

function parseCents(value: string): number {
  return Math.round(parseFloat(value) * 100)
}

function parseAccountType(value: string, rowNum: number): AccountType {
  const trimmed = value.trim()
  if (!(Object.values(AccountType) as string[]).includes(trimmed)) {
    throw new Error(`Invalid account type "${trimmed}" on row ${rowNum}`)
  }
  return trimmed as AccountType
}

export function validateWaveCsv(csvContent: string): void {
  const lines = csvContent.split(/\r?\n/)
  const transactionTotals = new Map<string, number>()

  for (let i = 1; i < lines.length; i++) {
    const csvLine = lines[i].trim()
    if (!csvLine) continue
    const cols = parseCsvLine(csvLine)

    const accountType = parseAccountType(cols[20]?.trim() ?? '', i + 1)

    const waveId = cols[0]?.trim() ?? ''
    const amount = parseCents(cols[5]?.trim() ?? '0')
    const sign = AccountTypeSign[accountType]
    transactionTotals.set(waveId, (transactionTotals.get(waveId) ?? 0) + amount * sign)
  }

  for (const [waveId, total] of transactionTotals) {
    if (total !== 0) {
      throw new Error(`Transaction ${waveId} does not balance`)
    }
  }
}

export function importWaveCsv(db: BookDb, csvContent: string): void {
  const csvLines = csvContent.split(/\r?\n/)
  const waveTransactionIds = new Map<string, number>()

  for (let i = 1; i < csvLines.length; i++) {
    const csvLine = csvLines[i].trim()
    if (!csvLine) continue

    const cols = parseCsvLine(csvLine)

    const accountName = cols[2]?.trim() ?? ''
    const accountType = cols[20]?.trim() ?? ''
    const accountDescription = cols[21]?.trim() ?? ''

    let accountId: number
    const existingAccount = db.select().from(account)
      .where(and(eq(account.name, accountName), eq(account.type, accountType), eq(account.description, accountDescription)))
      .get()
    if (existingAccount) {
      accountId = existingAccount.id
    } else {
      const inserted = db.insert(account).values({ name: accountName, type: accountType, description: accountDescription }).returning().get()
      accountId = inserted.id
    }

    const waveId = cols[0]?.trim() ?? ''
    let transactionId: number
    if (waveTransactionIds.has(waveId)) {
      transactionId = waveTransactionIds.get(waveId)!
    } else {
      const date = cols[1]?.trim() ?? ''
      const description = cols[3]?.trim() ?? ''
      const inserted = db.insert(transaction).values({ date, description }).returning().get()
      transactionId = inserted.id
      waveTransactionIds.set(waveId, transactionId)
    }

    const description = cols[4]?.trim() ?? ''
    const amount = parseCents(cols[5]?.trim() ?? '0')
    const salesTaxAmountStr = cols[16]?.trim() ?? ''
    const salesTaxAmount = salesTaxAmountStr !== '' ? parseCents(salesTaxAmountStr) : null

    db.insert(line).values({ transactionId, accountId, description, amount, salesTaxAmount }).run()
  }
}
