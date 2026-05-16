// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { booksRouter } from '../books'

// Mock drizzle-orm operators so they don't throw when passed fake column objects
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, eq: vi.fn(), asc: vi.fn(), and: vi.fn(), count: vi.fn() }
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

function makeBookDb({ accountRows = [] as any[], lineExists = false } = {}) {
  const run = vi.fn()
  const get = vi.fn().mockReturnValue(lineExists ? { id: 1 } : undefined)
  const all = vi.fn().mockReturnValue(accountRows)
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
