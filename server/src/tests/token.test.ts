// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '../token'

const payload = { userId: 1, email: 'test@example.com', name: 'test' }

describe('token', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signToken(payload)
    const result = await verifyToken(token)
    expect(result).toMatchObject(payload)
  })

  it('returns null for a tampered token', async () => {
    const token = await signToken(payload)
    const tampered = token.slice(0, -4) + 'xxxx'
    expect(await verifyToken(tampered)).toBeNull()
  })

  it('returns null for a garbage string', async () => {
    expect(await verifyToken('not-a-token')).toBeNull()
  })
})
