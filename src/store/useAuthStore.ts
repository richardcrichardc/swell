import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  email: string
  name: string
}

interface AuthState {
  user: User | null
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'auth' },
  ),
)
