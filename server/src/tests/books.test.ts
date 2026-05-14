// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { booksRouter } from '../books'

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
  return booksRouter.createCaller(ctx as any)
}

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

describe('books.create', () => {
  it('creates a book and returns it', async () => {
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
