import { beforeEach, describe, it, expect } from 'vitest'
import { useAuthStore } from '../store/useAuthStore'

const testUser = { email: 'test@example.com', name: 'test' }
const testToken = 'mock-token'

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null })
})

describe('useAuthStore', () => {
  it('starts with no user or token', () => {
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('setAuth stores the user and token', () => {
    useAuthStore.getState().setAuth(testUser, testToken)
    expect(useAuthStore.getState().user).toEqual(testUser)
    expect(useAuthStore.getState().token).toBe(testToken)
  })

  it('logout clears the user and token', () => {
    useAuthStore.setState({ user: testUser, token: testToken })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
