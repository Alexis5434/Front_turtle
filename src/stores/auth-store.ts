import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  sub: string
  email: string
  rol: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
}

/** Persists the token to localStorage so the session survives page refreshes. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    { name: 'turtle-auth' },
  ),
)
