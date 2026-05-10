// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

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
