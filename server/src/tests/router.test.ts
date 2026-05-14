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

function createCaller({ ctxUser }: { ctxUser?: object } = {}) {
  const ctx = {
    db: {},
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

