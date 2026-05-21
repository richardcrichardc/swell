// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { booksRouter } from '../books'
import type * as DrizzleOrm from 'drizzle-orm'

// Mock drizzle-orm operators so they don't throw when passed fake column objects
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof DrizzleOrm>()
  return { ...actual, eq: vi.fn(), asc: vi.fn(), and: vi.fn(), count: vi.fn(), inArray: vi.fn() }
})

vi.mock('../db/bookDb', () => ({
  getBookDb: vi.fn(),
  getKvp: vi.fn(),
  setKvp: vi.fn(),
  account: { id: {}, name: {}, type: {}, sortOrder: {} },
  line: { id: {}, accountId: {} },
  transaction: { id: {} },
}))

import { getBookDb, getKvp } from '../db/bookDb'

function makeBookDb({ accountRows = [] as any[], lineExists = false, txnRow = undefined as any, existingLineIds = [] as any[] } = {}) {
  const run = vi.fn()
  const get = vi.fn().mockReturnValue(txnRow !== undefined ? txnRow : (lineExists ? { id: 1 } : undefined))
  const all = vi.fn()
  if (txnRow !== undefined) {
    all.mockReturnValueOnce(accountRows).mockReturnValue(existingLineIds)
  } else {
    all.mockReturnValue(accountRows)
  }
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    all,
    get,
    run,
  }
  return {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    delete: vi.fn().mockReturnValue(chain),
    _chain: chain,
  }
}

function mockBookKvp({ name, description }: { name?: string; description?: string } = {}) {
  vi.mocked(getKvp).mockImplementation((_db, key) => {
    if (key === 'name') return name ?? null
    if (key === 'description') return description ?? null
    return null
  })
}

function createCaller({
  ctxUser,
  existingBooks,
  foundBook,
  insertedBook,
}: {
  ctxUser?: object
  existingBooks?: object[]
  foundBook?: object | null
  insertedBook?: object
} = {}) {
  const get = vi.fn().mockReturnValue(insertedBook)
  const returning = vi.fn().mockReturnValue({ get })
  const ctx = {
    db: {
      query: {
        books: {
          findMany: vi.fn().mockResolvedValue(existingBooks ?? []),
          findFirst: vi.fn().mockResolvedValue(foundBook ?? null),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning }),
      }),
    },
    user: ctxUser ?? null,
  }
  return booksRouter.createCaller(ctx as any)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('books.list', () => {
  it('returns the users books', async () => {
    const caller = createCaller({
      ctxUser: { id: 1, email: 'test@example.com', name: 'test' },
      existingBooks: [
        { id: 1, name: 'Personal', userId: 1 },
        { id: 2, name: 'Business', userId: 1 },
      ],
    })
    const result = await caller.list()
    expect(result).toEqual([
      { id: 1, name: 'Personal' },
      { id: 2, name: 'Business' },
    ])
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.get', () => {
  it('returns name and description from kvp', async () => {
    mockBookKvp({ name: 'Personal', description: 'My description' })
    const caller = createCaller({
      ctxUser: { id: 1, email: 'test@example.com', name: 'test' },
      foundBook: { id: 1, name: 'Personal', userId: 1 },
    })
    const result = await caller.get({ id: 1 })
    expect(result).toEqual({ id: 1, name: 'Personal', description: 'My description' })
  })

  it('returns null for name and description when no kvp rows exist', async () => {
    mockBookKvp()
    const caller = createCaller({
      ctxUser: { id: 1, email: 'test@example.com', name: 'test' },
      foundBook: { id: 1, name: 'Personal', userId: 1 },
    })
    const result = await caller.get({ id: 1 })
    expect(result).toEqual({ id: 1, name: null, description: null })
  })

  it('throws NOT_FOUND when book does not exist', async () => {
    const caller = createCaller({
      ctxUser: { id: 1, email: 'test@example.com', name: 'test' },
      foundBook: null,
    })
    await expect(caller.get({ id: 99 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.get({ id: 1 })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.create', () => {
  it('creates a book and stores name in kvp', async () => {
    mockBookKvp()
    vi.mocked(getBookDb).mockReturnValue(makeBookDb() as any)
    const caller = createCaller({
      ctxUser: { id: 1, email: 'test@example.com', name: 'test' },
      insertedBook: { id: 3, name: 'New Book', userId: 1 },
    })
    const result = await caller.create({ name: 'New Book' })
    expect(result).toEqual({ id: 3, name: 'New Book' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.create({ name: 'New Book' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.accounts', () => {
  it('returns accounts with hasTransactions derived from line count', async () => {
    const bookDb = makeBookDb({
      accountRows: [
        { id: 1, name: 'Cash', type: 'Asset', sortOrder: 0, lineCount: 3 },
        { id: 2, name: 'Revenue', type: 'Income', sortOrder: 0, lineCount: 0 },
      ],
    })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    const result = await caller.accounts({ id: 1 })
    expect(result).toEqual([
      { id: 1, name: 'Cash', type: 'Asset', sortOrder: 0, hasTransactions: true },
      { id: 2, name: 'Revenue', type: 'Income', sortOrder: 0, hasTransactions: false },
    ])
  })

  it('throws NOT_FOUND when book does not exist', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: null })
    await expect(caller.accounts({ id: 99 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.accounts({ id: 1 })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.updateAccounts', () => {
  it('updates existing accounts', async () => {
    const bookDb = makeBookDb()
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await caller.updateAccounts({ bookId: 1, updates: [{ id: 1, name: 'Petty Cash', sortOrder: 2 }] })
    expect(bookDb.update).toHaveBeenCalled()
    expect(bookDb._chain.set).toHaveBeenCalledWith({ name: 'Petty Cash', sortOrder: 2 })
    expect(bookDb._chain.run).toHaveBeenCalled()
  })

  it('inserts new accounts when id is absent', async () => {
    const bookDb = makeBookDb()
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await caller.updateAccounts({ bookId: 1, updates: [{ type: 'Asset', name: 'Savings', sortOrder: 1 }] })
    expect(bookDb.insert).toHaveBeenCalled()
    expect(bookDb._chain.values).toHaveBeenCalledWith({ name: 'Savings', type: 'Asset', sortOrder: 1 })
  })

  it('deletes accounts that have no transactions', async () => {
    const bookDb = makeBookDb({ lineExists: false })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await caller.updateAccounts({ bookId: 1, updates: [], deletions: [5] })
    expect(bookDb.delete).toHaveBeenCalled()
    expect(bookDb._chain.run).toHaveBeenCalled()
  })

  it('throws BAD_REQUEST when deleting an account that has transactions', async () => {
    const bookDb = makeBookDb({ lineExists: true })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(
      caller.updateAccounts({ bookId: 1, updates: [], deletions: [5] })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(bookDb.delete).not.toHaveBeenCalled()
  })

  it('throws NOT_FOUND when book does not exist', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: null })
    await expect(caller.updateAccounts({ bookId: 1, updates: [] })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.updateAccounts({ bookId: 1, updates: [] })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.getTransaction', () => {
  it('returns transaction with debit/credit lines', async () => {
    const bookDb = makeBookDb({
      txnRow: { id: 1, date: '2024-01-15', description: 'Test' },
      accountRows: [
        { id: 1, accountId: 10, accountType: 'Asset', accountName: 'Cash', description: 'line 1', amount: 500 },
        { id: 2, accountId: 20, accountType: 'Income', accountName: 'Revenue', description: 'line 2', amount: -500 },
      ],
    })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    const result = await caller.getTransaction({ bookId: 1, transactionId: 1 })
    expect(result).toEqual({
      id: 1, date: '2024-01-15', description: 'Test',
      lines: [
        { id: 1, accountId: 10, accountType: 'Asset', accountName: 'Cash', description: 'line 1', debit: 500, credit: null },
        { id: 2, accountId: 20, accountType: 'Income', accountName: 'Revenue', description: 'line 2', debit: null, credit: 500 },
      ],
    })
  })

  it('throws NOT_FOUND when transaction does not exist', async () => {
    const bookDb = makeBookDb({ txnRow: null })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(caller.getTransaction({ bookId: 1, transactionId: 99 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws NOT_FOUND when book does not exist', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: null })
    await expect(caller.getTransaction({ bookId: 99, transactionId: 1 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.getTransaction({ bookId: 1, transactionId: 1 })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.updateTransaction', () => {
  const validInput = {
    bookId: 1,
    transactionId: 1,
    date: '2024-01-15',
    description: 'Test transaction',
    lines: [
      { id: 1, accountId: 10, description: 'line 1', amount: 500 },
      { id: 2, accountId: 20, description: 'line 2', amount: -500 },
    ],
  }

  it('updates the transaction and its lines', async () => {
    const bookDb = makeBookDb({
      txnRow: { id: 1 },
      existingLineIds: [{ id: 1 }, { id: 2 }],
      accountRows: [{ id: 10 }, { id: 20 }],
    })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await caller.updateTransaction(validInput)
    expect(bookDb.update).toHaveBeenCalled()
    expect(bookDb._chain.set).toHaveBeenCalledWith({ date: '2024-01-15', description: 'Test transaction' })
  })

  it('deletes lines removed from the transaction', async () => {
    const bookDb = makeBookDb({
      txnRow: { id: 1 },
      existingLineIds: [{ id: 1 }, { id: 2 }, { id: 3 }],
      accountRows: [{ id: 10 }, { id: 20 }],
    })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await caller.updateTransaction(validInput)
    expect(bookDb.delete).toHaveBeenCalled()
  })

  it('throws BAD_REQUEST when lines do not balance', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(caller.updateTransaction({
      ...validInput,
      lines: [
        { id: 1, accountId: 10, description: '', amount: 500 },
        { id: 2, accountId: 20, description: '', amount: -200 },
      ],
    })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('throws BAD_REQUEST when fewer than two lines', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(caller.updateTransaction({
      ...validInput,
      lines: [{ id: 1, accountId: 10, description: '', amount: 0 }],
    })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('throws BAD_REQUEST when date format is invalid', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(caller.updateTransaction({ ...validInput, date: '15/01/2024' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('throws BAD_REQUEST when date is not a real date', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(caller.updateTransaction({ ...validInput, date: '2024-13-01' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('throws BAD_REQUEST when an account does not exist in the book', async () => {
    const bookDb = makeBookDb({
      txnRow: { id: 1 },
      existingLineIds: [{ id: 1 }, { id: 2 }],
      accountRows: [{ id: 10 }], // account 20 is missing
    })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(caller.updateTransaction(validInput)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('throws NOT_FOUND when transaction does not exist', async () => {
    const bookDb = makeBookDb({ txnRow: null, accountRows: [{ id: 10 }, { id: 20 }] })
    vi.mocked(getBookDb).mockReturnValue(bookDb as any)
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: { id: 1, userId: 1 } })
    await expect(caller.updateTransaction(validInput)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws NOT_FOUND when book does not exist', async () => {
    const caller = createCaller({ ctxUser: { id: 1 }, foundBook: null })
    await expect(caller.updateTransaction(validInput)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.updateTransaction(validInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
