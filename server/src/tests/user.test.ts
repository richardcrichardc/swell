// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { loginUser, registerUser, hashPassword, verifyPassword } from '../user'

vi.mock('../token', () => ({
  signToken: vi.fn().mockResolvedValue('mock-token'),
}))

function createDb({
  existingUser,
  insertedUser,
}: {
  existingUser?: object
  insertedUser?: object
} = {}) {
  const get = vi.fn().mockReturnValue(insertedUser)
  const returning = vi.fn().mockReturnValue({ get })
  return {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(existingUser),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    }),
  }
}

describe('password', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('correct-password', hash)).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('produces a different hash each time', async () => {
    const hash1 = await hashPassword('same-password')
    const hash2 = await hashPassword('same-password')
    expect(hash1).not.toBe(hash2)
  })
})

describe('loginUser', () => {
  it('throws UNAUTHORIZED when user is not found', async () => {
    const db = createDb()
    await expect(
      loginUser(db as any, { email: 'unknown@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
  })

  it('throws UNAUTHORIZED when password is wrong', async () => {
    const passwordHash = await hashPassword('correct-password')
    const db = createDb({ existingUser: { id: 1, email: 'test@example.com', name: 'Test', passwordHash } })
    await expect(
      loginUser(db as any, { email: 'test@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
  })

  it('returns user and token when credentials are correct', async () => {
    const passwordHash = await hashPassword('correct-password')
    const db = createDb({ existingUser: { id: 1, email: 'test@example.com', name: 'Test', passwordHash } })
    const result = await loginUser(db as any, { email: 'test@example.com', password: 'correct-password' })
    expect(result.user).toEqual({ email: 'test@example.com', name: 'Test' })
    expect(result.token).toBe('mock-token')
  })
})

describe('registerUser', () => {
  it('creates a user and returns token', async () => {
    const db = createDb({ insertedUser: { id: 1, email: 'new@example.com', name: 'New User' } })
    const result = await registerUser(db as any, { name: 'New User', email: 'new@example.com', password: 'password123' })
    expect(result.user).toEqual({ email: 'new@example.com', name: 'New User' })
    expect(result.token).toBe('mock-token')
  })

  it('throws CONFLICT when email is already registered', async () => {
    const db = createDb({ existingUser: { id: 1, email: 'taken@example.com', name: 'Existing', passwordHash: 'hashed' } })
    await expect(
      registerUser(db as any, { name: 'Someone', email: 'taken@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'An account with that email already exists' })
  })
})
