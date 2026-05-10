// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../router'

function createCaller(user: object | undefined) {
  const ctx = {
    db: {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(user),
        },
      },
    },
  }
  return appRouter.createCaller(ctx as any)
}

describe('login', () => {
  it('throws UNAUTHORIZED when user is not found', async () => {
    const caller = createCaller(undefined)
    await expect(
      caller.login({ email: 'unknown@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
  })

  it('returns user when found', async () => {
    const caller = createCaller({ email: 'test@example.com', name: 'test' })
    const result = await caller.login({ email: 'test@example.com', password: 'password123' })
    expect(result.user).toEqual({ email: 'test@example.com', name: 'test' })
  })
})
