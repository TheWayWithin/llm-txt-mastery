import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, AuthUser, LoginRequest, RegisterRequest } from '@/lib/auth-api'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string, confirmPassword: string, tier?: 'starter' | 'coffee' | 'growth' | 'scale') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  getAccessToken: () => string | null
  hasCredits: boolean
  canAnalyze: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize auth state on mount
    const initializeAuth = async () => {
      try {
        // Check if user is already authenticated
        if (authApi.isAuthenticated()) {
          const storedUser = authApi.getStoredUser()
          setUser(storedUser)
          
          // Try to refresh user data from server
          try {
            const currentUser = await authApi.getCurrentUser()
            setUser(currentUser)
          } catch (error) {
            // If refresh fails, keep stored user data
            console.warn('Failed to refresh user data:', error)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Clear invalid tokens
        await signOut()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signUp = async (email: string, password: string, confirmPassword: string, tier: 'starter' | 'coffee' | 'growth' | 'scale' = 'starter') => {
    try {
      const response = await authApi.register({
        email,
        password,
        confirmPassword,
      })
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login({
        email,
        password,
      })
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  const refreshUser = async () => {
    if (!authApi.isAuthenticated()) return
    
    try {
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // If refresh fails, user might need to re-authenticate
      await signOut()
    }
  }

  const getAccessToken = () => {
    return localStorage.getItem('auth_access_token')
  }

  // Computed properties
  const hasCredits = user?.tier === 'coffee' && (user?.creditsRemaining || 0) > 0
  const canAnalyze = !user || user?.tier === 'starter' || hasCredits || ['growth', 'scale'].includes(user?.tier || '')
  const isAuthenticated = !!user && authApi.isAuthenticated()

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser,
    getAccessToken,
    hasCredits,
    canAnalyze,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}