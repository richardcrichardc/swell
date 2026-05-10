// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../router'

function createCaller({
  existingUser,
  insertedUser,
}: {
  existingUser?: object
  insertedUser?: object
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
  }
  return appRouter.createCaller(ctx as any)
}

describe('login', () => {
  it('throws UNAUTHORIZED when user is not found', async () => {
    const caller = createCaller()
    await expect(
      caller.login({ email: 'unknown@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
  })

  it('returns user when found', async () => {
    const caller = createCaller({ existingUser: { email: 'test@example.com', name: 'test' } })
    const result = await caller.login({ email: 'test@example.com', password: 'password123' })
    expect(result.user).toEqual({ email: 'test@example.com', name: 'test' })
  })
})

describe('register', () => {
  it('creates and returns a new user', async () => {
    const caller = createCaller({ insertedUser: { email: 'new@example.com', name: 'New User' } })
    const result = await caller.register({ name: 'New User', email: 'new@example.com', password: 'password123' })
    expect(result.user).toEqual({ email: 'new@example.com', name: 'New User' })
  })

  it('throws CONFLICT when email is already registered', async () => {
    const caller = createCaller({ existingUser: { email: 'taken@example.com', name: 'Existing' } })
    await expect(
      caller.register({ name: 'Someone', email: 'taken@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'An account with that email already exists' })
  })
})
