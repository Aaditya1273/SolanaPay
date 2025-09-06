import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

interface User {
  id: string
  email: string
  username: string
  fullName?: string
  avatar?: string
  walletAddress?: string
  isVerified: boolean
  kycStatus: 'pending' | 'approved' | 'rejected'
  rewardPoints?: number
  tier?: string
  totalEarnings?: number
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const isAuthenticated = !!user

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('vpay-token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await authAPI.me()
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('vpay-token')
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    // Validate inputs
    if (!email || !password) {
      toast.error('Email and password are required')
      throw new Error('Missing credentials')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      throw new Error('Invalid email format')
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      throw new Error('Password too short')
    }

    try {
      setIsLoading(true)
      const response = await authAPI.login({ email, password })
      
      // Handle email verification requirement
      if (response.status === 403 && response.data.requiresVerification) {
        toast.error(response.data.message)
        navigate('/signup') // Redirect to signup page to handle verification
        return
      }
      
      if (!response.data.token || !response.data.user) {
        throw new Error('Invalid response from server')
      }
      
      localStorage.setItem('vpay-token', response.data.token)
      setUser(response.data.user)
      
      toast.success(`Welcome back, ${response.data.user.username}!`)
      navigate('/dashboard')
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, username: string) => {
    // Validate inputs
    if (!email || !password || !username) {
      toast.error('All fields are required')
      throw new Error('Missing required fields')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      throw new Error('Invalid email format')
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      throw new Error('Password too short')
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      throw new Error('Password too weak')
    }

    if (username.length < 3 || username.length > 20) {
      toast.error('Username must be between 3 and 20 characters')
      throw new Error('Invalid username length')
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error('Username can only contain letters, numbers, and underscores')
      throw new Error('Invalid username format')
    }

    try {
      setIsLoading(true)
      const response = await authAPI.register({ email, password, username })
      
      if (!response.data.token || !response.data.user) {
        throw new Error('Invalid response from server')
      }
      
      localStorage.setItem('vpay-token', response.data.token)
      setUser(response.data.user)
      
      toast.success(`Welcome to VPay, ${response.data.user.username}!`)
      navigate('/onboarding')
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call logout API to invalidate token on server
      await authAPI.logout()
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error)
    } finally {
      localStorage.removeItem('vpay-token')
      setUser(null)
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
