import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, getToken, setToken } from '../api/client'
import type { LoginResponse, User } from '../api/types'

export type Mode = 'admin' | 'creator'

// The header's Admin/Creator switch signs in as these seeded demo accounts.
export const DEMO_ACCOUNTS: Record<Mode, string> = {
  admin: 'admin@pulsemedia.demo',
  creator: 'alex@pulsemedia.demo',
}
const DEMO_PASSWORD = 'demo1234'

interface AuthState {
  user: User | null
  mode: Mode
  loading: boolean
  switchMode: (mode: Mode) => Promise<void>
  /** Signs in with any account (e.g. another seeded creator); throws ApiError with the server's message. */
  signIn: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loginAs = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>('/auth/login', { method: 'POST', json: { email, password } })
    setToken(res.token)
    setUser(res.user)
  }, [])

  const login = useCallback((mode: Mode) => loginAs(DEMO_ACCOUNTS[mode], DEMO_PASSWORD), [loginAs])

  useEffect(() => {
    // The database is recreated on every server restart, so a stored token may point at
    // a user that still exists (seeded ids are stable) or be signed with an old secret.
    const restore = async () => {
      try {
        if (getToken()) {
          setUser(await api<User>('/me'))
        } else {
          await login('admin')
        }
      } catch {
        setToken(null)
        await login('admin').catch(() => setUser(null))
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [login])

  const switchMode = useCallback(
    async (mode: Mode) => {
      await login(mode)
      queryClient.clear()
    },
    [login, queryClient],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      await loginAs(email, password)
      queryClient.clear()
    },
    [loginAs, queryClient],
  )

  const mode: Mode = user?.role === 'CREATOR' ? 'creator' : 'admin'

  return <AuthContext.Provider value={{ user, mode, loading, switchMode, signIn }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
