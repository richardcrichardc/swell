// @vitest-environment node
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { validateWaveCsv, importWaveCsv } from '../waveImport'
import { account, transaction, line } from '../db/bookDb'

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec('CREATE TABLE kvp (key text PRIMARY KEY NOT NULL, value text NOT NULL)')
  sqlite.exec('CREATE TABLE account (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, name text NOT NULL, type text NOT NULL, sort_order integer NOT NULL)')
  sqlite.exec('CREATE TABLE "transaction" (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, date text NOT NULL, description text NOT NULL)')
  sqlite.exec('CREATE TABLE line (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, transaction_id integer NOT NULL, account_id integer NOT NULL, description text NOT NULL, amount integer NOT NULL, sales_tax_amount integer)')
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
  accountType?: string
} = {}): string {
  const cols = Array(22).fill('')
  cols[0] = opts.waveId ?? ''
  cols[1] = opts.date ?? ''
  cols[2] = opts.accountName ?? ''
  cols[3] = opts.txnDescription ?? ''
  cols[4] = opts.lineDescription ?? ''
  cols[5] = opts.amount ?? ''
  cols[16] = opts.salesTaxAmount ?? ''
  cols[20] = opts.accountType ?? ''
  return cols.join(',')
}

function makeCsv(...rows: string[]): string {
  return ['Transaction ID,Date,Account Name,...', ...rows].join('\n')
}

describe('validateWaveCsv', () => {
  it('accepts a valid CSV', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ waveId: 'w1', amount: '0.00', accountType: 'Expense' })))).not.toThrow()
  })

  it('rejects an empty account type', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ waveId: 'w1', amount: '0.00', accountType: '' }))))
      .toThrow('Invalid account type "" on row 2')
  })

  it('rejects an invalid account type', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ waveId: 'w1', amount: '0.00', accountType: 'Revenue' }))))
      .toThrow('Invalid account type "Revenue" on row 2')
  })

  it('accepts a row with a sales tax amount', () => {
    expect(() => validateWaveCsv(makeCsv(makeRow({ waveId: 'w1', amount: '0.00', accountType: 'Expense', salesTaxAmount: '1.50' })))).not.toThrow()
  })

  it('ignores blank lines', () => {
    expect(() => validateWaveCsv(makeCsv(
      makeRow({ waveId: 'w1', amount: '0.00', accountType: 'Expense' }),
      '',
      makeRow({ waveId: 'w2', amount: '0.00', accountType: 'Expense' }),
    ))).not.toThrow()
  })

  it('accepts a balanced multi-line transaction', () => {
    expect(() => validateWaveCsv(makeCsv(
      makeRow({ waveId: 'w1', amount: '1.00', accountType: 'Asset' }),
      makeRow({ waveId: 'w1', amount: '1.00', accountType: 'Equity' }),
    ))).not.toThrow()
  })

  it('rejects an unbalanced transaction', () => {
    expect(() => validateWaveCsv(makeCsv(
      makeRow({ waveId: 'w1', amount: '1.00', accountType: 'Asset' }),
      makeRow({ waveId: 'w1', amount: '0.50', accountType: 'Equity' }),
    ))).toThrow('Transaction w1 does not balance')
  })
})

describe('importWaveCsv', () => {
  it('creates an account', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ waveId: 'w1', amount: '0.00', accountName: 'Rent', accountType: 'Expense' })))
    const accounts = db.select().from(account).all()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toMatchObject({ name: 'Rent', type: 'Expense' })
  })

  it('deduplicates accounts with the same name, group and type', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', amount: '0.00', accountName: 'Rent', accountType: 'Expense' }),
      makeRow({ waveId: 'w2', amount: '0.00', accountName: 'Rent', accountType: 'Expense' }),
    ))
    expect(db.select().from(account).all()).toHaveLength(1)
  })

  it('creates separate accounts when name differs', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', amount: '0.00', accountName: 'Rent', accountType: 'Expense' }),
      makeRow({ waveId: 'w2', amount: '0.00', accountName: 'Utilities', accountType: 'Expense' }),
    ))
    expect(db.select().from(account).all()).toHaveLength(2)
  })

  it('creates a transaction', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ waveId: 'w1', amount: '0.00', date: '2024-03-15', txnDescription: 'Office rent', accountType: 'Expense' })))
    const txns = db.select().from(transaction).all()
    expect(txns).toHaveLength(1)
    expect(txns[0]).toMatchObject({ date: '2024-03-15', description: 'Office rent' })
  })

  it('deduplicates transactions by Wave ID', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', amount: '800.00', accountName: 'Rent', accountType: 'Expense' }),
      makeRow({ waveId: 'w1', amount: '-800.00', accountName: 'GST Payable', accountType: 'Liability' }),
    ))
    expect(db.select().from(transaction).all()).toHaveLength(1)
  })

  it('creates a line with amount in integer cents', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ waveId: 'w1', amount: '12.50', lineDescription: 'monthly rent', accountType: 'Expense' })))
    const lines = db.select().from(line).all()
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ amount: 1250, description: 'monthly rent', salesTaxAmount: null })
  })

  it('stores sales tax as integer cents', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ waveId: 'w1', amount: '100.00', salesTaxAmount: '15.00', accountType: 'Expense' })))
    const lines = db.select().from(line).all()
    expect(lines[0]).toMatchObject({ amount: 10000, salesTaxAmount: 1500 })
  })

  it('creates two lines for a split transaction', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(
      makeRow({ waveId: 'w1', accountName: 'Bank', accountType: 'Asset', amount: '800.00' }),
      makeRow({ waveId: 'w1', accountName: 'Sales', accountType: 'Income', amount: '800.00' }),
    ))
    const lines = db.select().from(line).all()
    expect(lines).toHaveLength(2)
    expect(lines[0].amount).toBe(80000)   // Asset debit: 800 * +1
    expect(lines[1].amount).toBe(-80000)  // Income credit: 800 * -1
  })

  it('links lines to the correct transaction and account', () => {
    const db = createTestDb()
    importWaveCsv(db as any, makeCsv(makeRow({ waveId: 'w1', amount: '0.00', accountName: 'Rent', accountType: 'Expense' })))
    const accounts = db.select().from(account).all()
    const txns = db.select().from(transaction).all()
    const lines = db.select().from(line).all()
    expect(lines[0].transactionId).toBe(txns[0].id)
    expect(lines[0].accountId).toBe(accounts[0].id)
  })
})
