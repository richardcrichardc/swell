// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { booksRouter } from '../books'

vi.mock('../db/bookDb', () => ({
  getBookDb: vi.fn(),
  getKvp: vi.fn(),
  setKvp: vi.fn(),
}))

import { getKvp } from '../db/bookDb'

function mockBookDb({ name, description }: { name?: string; description?: string } = {}) {
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
    mockBookDb({ name: 'Personal', description: 'My description' })
    const caller = createCaller({
      ctxUser: { id: 1, email: 'test@example.com', name: 'test' },
      foundBook: { id: 1, name: 'Personal', userId: 1 },
    })
    const result = await caller.get({ id: 1 })
    expect(result).toEqual({ id: 1, name: 'Personal', description: 'My description' })
  })

  it('returns null for name and description when no kvp rows exist', async () => {
    mockBookDb()
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
    mockBookDb()
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
