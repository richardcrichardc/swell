// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../router'

vi.mock('../user', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}))

vi.mock('../token', () => ({
  verifyToken: vi.fn().mockResolvedValue(null),
}))

function createCaller({
  ctxUser,
  existingBooks,
  insertedBook,
}: {
  ctxUser?: object
  existingBooks?: object[]
  insertedBook?: object
} = {}) {
  const get = vi.fn().mockReturnValue(insertedBook)
  const returning = vi.fn().mockReturnValue({ get })
  const ctx = {
    db: {
      query: {
        books: {
          findMany: vi.fn().mockResolvedValue(existingBooks ?? []),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning }),
      }),
    },
    user: ctxUser ?? null,
  }
  return appRouter.createCaller(ctx as any)
}

describe('me', () => {
  it('returns the current user', async () => {
    const caller = createCaller({ ctxUser: { email: 'test@example.com', name: 'test' } })
    const result = await caller.me()
    expect(result.user).toEqual({ email: 'test@example.com', name: 'test' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.list', () => {
  it('returns the users books', async () => {
    const caller = createCaller({
      ctxUser: { userId: 1, email: 'test@example.com', name: 'test' },
      existingBooks: [
        { id: 1, name: 'Personal', userId: 1 },
        { id: 2, name: 'Business', userId: 1 },
      ],
    })
    const result = await caller.books.list()
    expect(result).toEqual([
      { id: 1, name: 'Personal' },
      { id: 2, name: 'Business' },
    ])
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.books.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('books.create', () => {
  it('creates a book and returns it', async () => {
    const caller = createCaller({
      ctxUser: { userId: 1, email: 'test@example.com', name: 'test' },
      insertedBook: { id: 3, name: 'New Book', userId: 1 },
    })
    const result = await caller.books.create({ name: 'New Book' })
    expect(result).toEqual({ id: 3, name: 'New Book' })
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller()
    await expect(caller.books.create({ name: 'New Book' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
