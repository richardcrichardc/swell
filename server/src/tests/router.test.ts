// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../router'

vi.mock('../password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}))

vi.mock('../token', () => ({
  signToken: vi.fn().mockResolvedValue('mock-token'),
  verifyToken: vi.fn().mockResolvedValue(null),
}))

import { verifyPassword } from '../password'

function createCaller({
  existingUser,
  insertedUser,
  ctxUser,
}: {
  existingUser?: object
  insertedUser?: object
  ctxUser?: object
} = {}) {
  const get = vi.fn().mockReturnValue(insertedUser)
  const returning = vi.fn().mockReturnValue({ get })
  const ctx = {
    db: {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(existingUser),
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

describe('login', () => {
  it('throws UNAUTHORIZED when user is not found', async () => {
    const caller = createCaller()
    await expect(
      caller.login({ email: 'unknown@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
  })

  it('throws UNAUTHORIZED when password is wrong', async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(false)
    const caller = createCaller({ existingUser: { email: 'test@example.com', name: 'test', passwordHash: 'hashed' } })
    await expect(
      caller.login({ email: 'test@example.com', password: 'wrongpassword' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
  })

  it('returns user and token when credentials are correct', async () => {
    const caller = createCaller({ existingUser: { id: 1, email: 'test@example.com', name: 'test', passwordHash: 'hashed' } })
    const result = await caller.login({ email: 'test@example.com', password: 'password123' })
    expect(result.user).toEqual({ email: 'test@example.com', name: 'test' })
    expect(result.token).toBe('mock-token')
  })
})

describe('register', () => {
  it('creates a user and returns token', async () => {
    const caller = createCaller({ insertedUser: { id: 1, email: 'new@example.com', name: 'New User' } })
    const result = await caller.register({ name: 'New User', email: 'new@example.com', password: 'password123' })
    expect(result.user).toEqual({ email: 'new@example.com', name: 'New User' })
    expect(result.token).toBe('mock-token')
  })

  it('throws CONFLICT when email is already registered', async () => {
    const caller = createCaller({ existingUser: { email: 'taken@example.com', name: 'Existing', passwordHash: 'hashed' } })
    await expect(
      caller.register({ name: 'Someone', email: 'taken@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'An account with that email already exists' })
  })
})
