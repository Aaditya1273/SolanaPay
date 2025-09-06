import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import web3AuthService, { AuthUser } from '../services/web3AuthService'

interface User {
  id: string
  email: string
  username: string
  fullName?: string
  avatar?: string
  walletAddress?: string
  solanaWalletAddress?: string
  isVerified: boolean
  kycStatus: 'pending' | 'approved' | 'rejected'
  rewardPoints?: number
  tier?: string
  totalEarnings?: number
  createdAt: string
  provider?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  loginWithSocial: (provider: 'google' | 'facebook' | 'twitter' | 'discord' | 'github') => Promise<void>
  loginWithMetaMask: () => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  generateSolanaWallet: () => Promise<string>
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
      // First try to restore Web3Auth session
      const web3AuthRestored = await web3AuthService.restoreSession()
      if (web3AuthRestored) {
        const authUser = web3AuthService.getAuthState().user
        if (authUser) {
          await syncUserWithBackend(authUser)
          setIsLoading(false)
          return
        }
      }

      // Fallback to traditional token-based auth
      const token = localStorage.getItem('SolanaPay-token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await authAPI.me()
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('SolanaPay-token')
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
      
      localStorage.setItem('SolanaPay-token', response.data.token)
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
      
      localStorage.setItem('SolanaPay-token', response.data.token)
      setUser(response.data.user)
      
      toast.success(`Welcome to SolanaPay, ${response.data.user.username}!`)
      navigate('/onboarding')
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithSocial = async (provider: 'google' | 'facebook' | 'twitter' | 'discord' | 'github') => {
    try {
      setIsLoading(true)
      const authUser = await web3AuthService.loginWithSocial(provider)
      await syncUserWithBackend(authUser)
      toast.success(`Welcome! Logged in with ${provider}`)
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.message || `${provider} login failed`)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithMetaMask = async () => {
    try {
      setIsLoading(true)
      const authUser = await web3AuthService.loginWithMetaMask()
      await syncUserWithBackend(authUser)
      toast.success('Connected with MetaMask!')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'MetaMask connection failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const generateSolanaWallet = async (): Promise<string> => {
    try {
      if (!user?.walletAddress) {
        throw new Error('No EVM wallet connected')
      }

      const response = await authAPI.generateSolanaWallet({
        evmAddress: user.walletAddress
      })

      const solanaAddress = response.data.solanaAddress
      updateUser({ solanaWalletAddress: solanaAddress })
      
      toast.success('Solana wallet generated successfully!')
      return solanaAddress
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate Solana wallet')
      throw error
    }
  }

  const syncUserWithBackend = async (authUser: AuthUser) => {
    try {
      // Create or update user in backend
      const response = await authAPI.syncWeb3User({
        walletAddress: authUser.walletAddress,
        email: authUser.email,
        name: authUser.name,
        provider: authUser.provider,
        profileImage: authUser.profileImage
      })

      const backendUser: User = {
        id: response.data.user.id,
        email: response.data.user.email || authUser.email || '',
        username: response.data.user.username || authUser.name || 'User',
        fullName: authUser.name,
        avatar: authUser.profileImage,
        walletAddress: authUser.walletAddress,
        solanaWalletAddress: response.data.user.solanaWalletAddress,
        isVerified: response.data.user.isVerified || true,
        kycStatus: response.data.user.kycStatus || 'pending',
        rewardPoints: response.data.user.rewardPoints || 0,
        tier: response.data.user.tier || 'bronze',
        totalEarnings: response.data.user.totalEarnings || 0,
        createdAt: response.data.user.createdAt || new Date().toISOString(),
        provider: authUser.provider
      }

      setUser(backendUser)
      
      if (response.data.token) {
        localStorage.setItem('SolanaPay-token', response.data.token)
      }
    } catch (error) {
      console.error('Failed to sync user with backend:', error)
      // Create minimal user object for Web3 users
      const minimalUser: User = {
        id: authUser.id,
        email: authUser.email || '',
        username: authUser.name || 'Web3 User',
        walletAddress: authUser.walletAddress,
        isVerified: true,
        kycStatus: 'pending',
        createdAt: new Date().toISOString(),
        provider: authUser.provider
      }
      setUser(minimalUser)
    }
  }

  const logout = async () => {
    try {
      // Logout from Web3Auth if connected
      if (web3AuthService.isConnected()) {
        await web3AuthService.logout()
      }
      
      // Call logout API to invalidate token on server
      await authAPI.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      localStorage.removeItem('SolanaPay-token')
      setUser(null)
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  const updateUser = (userData: Partial<User>) => {
    setUser((prev: User | null) => prev ? { ...prev, ...userData } : null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        loginWithSocial,
        loginWithMetaMask,
        logout,
        updateUser,
        generateSolanaWallet,
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
