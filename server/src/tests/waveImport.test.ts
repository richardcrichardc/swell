// @vitest-environment node
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { validateWaveCsv, importWaveCsv } from '../waveImport'
import { account, transaction, line } from '../db/bookDb'

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec('CREATE TABLE kvp (key text PRIMARY KEY NOT NULL, value text NOT NULL)')
  sqlite.exec('CREATE TABLE account (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, name text NOT NULL, "group" text NOT NULL, type text NOT NULL)')
  sqlite.exec('CREATE TABLE "transaction" (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, date text NOT NULL, description text NOT NULL)')
  sqlite.exec('CREATE TABLE line (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, transaction_id integer NOT NULL, account_id integer NOT NULL, description text NOT NULL, amount integer NOT NULL, sales_tax_amount integer, sales_tax_name text)')
  return drizzle(sqlite)
}

function makeRow(opts: {
  waveId?: string
  date?: string
  accountName?: string
  txnDescription?: string
  lineDescription?: string
  amount?: string
  salesTaxAmount?: string
  salesTaxName?: string
  accountGroup?: string
  accountType?: string
} = {}): string {
  const cols = Array(22).fill('')
  cols[0] = opts.waveId ?? 'wave-1'
  cols[1] = opts.date ?? '2024-01-01'
  cols[2] = opts.accountName ?? 'Office Supplies'
  cols[3] = opts.txnDescription ?? 'Staples purchase'
  cols[4] = opts.lineDescription ?? ''
  cols[5] = opts.amount ?? '10.00'
  cols[16] = opts.salesTaxAmount ?? ''
  cols[17] = opts.salesTaxName ?? ''
  cols[20] = opts.accountGroup ?? 'Expense'
  cols[21] = opts.accountType ?? 'Expense'
  return cols.join(',')
}

function makeCsv(...rows: string[]): string {
  return ['Transaction ID,Date,Account Name,...', ...rows].join('\n')
}

describe('validateWaveCsv', () => {
  it('accepts a valid CSV', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow()))).not.toThrow()
  })

  it('accepts empty account group', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ accountGroup: '' })))).not.toThrow()
  })

  it('rejects an invalid account group', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ accountGroup: 'Revenue' }))))
      .toThrow('Invalid account group "Revenue" on row 2')
  })

  it('accepts a row with both sales tax fields', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ salesTaxAmount: '1.50', salesTaxName: 'GST' })))).not.toThrow()
  })

  it('rejects a row with sales tax amount but no name', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ salesTaxAmount: '1.50', salesTaxName: '' }))))
      .toThrow('Row 2 has only one of sales tax amount/name')
  })

  it('rejects a row with sales tax name but no amount', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ salesTaxAmount: '', salesTaxName: 'GST' }))))
      .toThrow('Row 2 has only one of sales tax amount/name')
  })

  it('ignores blank lines', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow(), '', makeRow()))).not.toThrow()
  })
})

describe('importWaveCsv', () => {
  it('creates an account', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ accountName: 'Rent', accountGroup: 'Expense', accountType: 'Expense' })))
    const accounts = db.select().from(account).all()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toMatchObject({ name: 'Rent', group: 'Expense', type: 'Expense' })
  })

  it('deduplicates accounts with the same name, group and type', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', accountName: 'Rent', accountGroup: 'Expense', accountType: 'Expense' }),
      makeRow({ waveId: 'w2', accountName: 'Rent', accountGroup: 'Expense', accountType: 'Expense' }),
    ))
    expect(db.select().from(account).all()).toHaveLength(1)
  })

  it('creates separate accounts when name differs', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', accountName: 'Rent' }),
      makeRow({ waveId: 'w2', accountName: 'Utilities' }),
    ))
    expect(db.select().from(account).all()).toHaveLength(2)
  })

  it('creates a transaction', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ date: '2024-03-15', txnDescription: 'Office rent' })))
    const txns = db.select().from(transaction).all()
    expect(txns).toHaveLength(1)
    expect(txns[0]).toMatchObject({ date: '2024-03-15', description: 'Office rent' })
  })

  it('deduplicates transactions by Wave ID', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', accountName: 'Rent' }),
      makeRow({ waveId: 'w1', accountName: 'GST Payable', accountGroup: 'Liability', accountType: 'Liability' }),
    ))
    expect(db.select().from(transaction).all()).toHaveLength(1)
  })

  it('creates a line with amount in integer cents', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ amount: '12.50', lineDescription: 'monthly rent' })))
    const lines = db.select().from(line).all()
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ amount: 1250, description: 'monthly rent', salesTaxAmount: null, salesTaxName: null })
  })

  it('stores sales tax as integer cents', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ amount: '100.00', salesTaxAmount: '15.00', salesTaxName: 'GST' })))
    const lines = db.select().from(line).all()
    expect(lines[0]).toMatchObject({ amount: 10000, salesTaxAmount: 1500, salesTaxName: 'GST' })
  })

  it('creates two lines for a split transaction', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', accountName: 'Rent', amount: '800.00' }),
      makeRow({ waveId: 'w1', accountName: 'GST Payable', accountGroup: 'Liability', accountType: 'Liability', amount: '-800.00' }),
    ))
    const lines = db.select().from(line).all()
    expect(lines).toHaveLength(2)
    expect(lines[0].amount).toBe(80000)
    expect(lines[1].amount).toBe(-80000)
  })

  it('links lines to the correct transaction and account', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow()))
    const accounts = db.select().from(account).all()
    const txns = db.select().from(transaction).all()
    const lines = db.select().from(line).all()
    expect(lines[0].transactionId).toBe(txns[0].id)
    expect(lines[0].accountId).toBe(accounts[0].id)
  })
})
