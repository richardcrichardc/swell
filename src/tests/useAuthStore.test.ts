import { beforeEach, describe, it, expect } from 'vitest'
import { useAuthStore } from '../store/useAuthStore'

const testUser = { email: 'test@example.com', name: 'test' }

beforeEach(() => {
  useAuthStore.setState({ user: null })
})

describe('useAuthStore', () => {
  it('starts with no user', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser stores the user', () => {
    useAuthStore.getState().setUser(testUser)
    expect(useAuthStore.getState().user).toEqual(testUser)
  })

  it('logout clears the user', () => {
    useAuthStore.setState({ user: testUser })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
